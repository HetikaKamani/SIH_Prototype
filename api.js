/**
 * Rail Madad API Service
 * Centralizes all backend communication with Hetika's FastAPI
 * 
 * Configuration:
 * - API_BASE_URL: Backend server base URL
 * - USE_MOCK_DATA: Toggle between mock data (dev) and real backend
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================

  // Backend URL — UPDATE THIS TO ACTUAL HETIKA BACKEND
  // For local development: http://localhost:8000
  // For production: actual backend URL
  const API_BASE_URL = 'http://localhost:8000';

  // Feature flag: set to false to use real backend, true for mock data fallback
  const USE_MOCK_DATA = false;

  // ============================================================
  // NORMALIZATION FUNCTION
  // ============================================================

  /**
   * Normalize status from backend format to frontend format
   * Backend: SUBMITTED, ASSIGNED, IN_PROGRESS, RESOLVED, ESCALATED, REJECTED
   * Frontend: Pending, In Progress, Resolved
   */
  function normalizeStatus(status) {
    if (!status) return 'Pending';
    const upper = String(status).toUpperCase();
    if (upper === 'IN_PROGRESS') return 'In Progress';
    if (upper === 'SUBMITTED' || upper === 'ASSIGNED') return 'Pending';
    if (upper === 'RESOLVED' || upper === 'COMPLETE' || upper === 'COMPLETED') return 'Resolved';
    if (upper === 'ESCALATED') return 'Escalated';
    if (upper === 'REJECTED') return 'Rejected';
    return 'Pending';
  }

  /**
   * Flatten nested response from /analyze or /analyze-text endpoints
   * These endpoints return: { complaint_id, complaint, classification: {}, routing: {}, sla: {} }
   * This function converts to flat structure for normalizeComplaint()
   */
  function flattenAnalyzeResponse(response) {
    if (!response) return null;
    return {
      complaint_id: response.complaint_id,
      text: response.complaint || response.text || '',
      category: response.classification?.category,
      subcategory: response.classification?.subcategory,
      severity: response.classification?.severity,
      confidence: response.classification?.confidence,
      department: response.classification?.department || response.routing?.department,
      priority: response.routing?.priority,
      status: 'SUBMITTED',
      latitude: null,
      longitude: null,
      location_name: null,
      sla_hours: response.sla?.hours,
      sla_deadline: response.sla?.deadline,
      sla_status: response.sla?.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Normalize backend complaint response to unified Maitri format
   * 
   * Accepts both flat and nested structures (will flatten if needed)
   * 
   * Maitri unified format:
   *   - complaint_id, category, subcategory, description, coach, seat, train
   *   - severity, confidence, department, status, location (lat/lng), timestamp
   */
  function normalizeComplaint(apiComplaint) {
    if (!apiComplaint) return null;

    // Ensure flat structure
    const complaint = typeof apiComplaint.text === 'undefined' && apiComplaint.classification 
      ? flattenAnalyzeResponse(apiComplaint) 
      : apiComplaint;

    return {
      // Core IDs
      complaint_id: complaint.complaint_id || 'N/A',

      // Classification
      category: complaint.category || 'General',
      subcategory: complaint.subcategory || 'Other',
      description: complaint.text || complaint.description || '',

      // Location info (extracted from complaint text or provided separately)
      coach: extractCoachFromText(complaint.text) || 'N/A',
      seat: extractSeatFromText(complaint.text) || 'N/A',
      train: complaint.train || extractTrainFromText(complaint.text) || '12951', // Default train number

      // Severity & Priority
      severity: (complaint.severity || 'MEDIUM').toUpperCase(),
      confidence: parseFloat(complaint.confidence || 0.75),
      priority: complaint.priority || 'MEDIUM',

      // Routing & Status (with normalization)
      department: complaint.department || 'General',
      status: normalizeStatus(complaint.status || 'SUBMITTED'),

      // SLA Information
      sla_hours: complaint.sla_hours || null,
      sla_deadline: complaint.sla_deadline || null,
      sla_status: complaint.sla_status || 'UNKNOWN',

      // Location (as unified format)
      // Handle both flat (latitude/longitude) and nested (location.latitude/longitude) formats
      location: (() => {
        const lat = complaint.latitude !== undefined ? complaint.latitude : 
                    (complaint.location?.latitude !== undefined ? complaint.location.latitude : null);
        const lng = complaint.longitude !== undefined ? complaint.longitude : 
                    (complaint.location?.longitude !== undefined ? complaint.location.longitude : null);
        const name = complaint.location_name || complaint.location?.name || null;
        return (lat && lng) ? { lat, lng, name } : null;
      })(),

      // AI detections
      detected_object: (complaint.detections && complaint.detections.length > 0)
        ? complaint.detections.map(d => `${d.class_name} (${Math.round(d.confidence * 100)}%)`).join(', ')
        : null,

      // Metadata
      timestamp: complaint.created_at || new Date().toISOString(),
      created_at: complaint.created_at,
      updated_at: complaint.updated_at,

      // Raw backend fields (for debugging/advanced features)
      _raw: complaint
    };
  }

  /**
   * Extract coach number from text (e.g., "B3", "S5")
   */
  function extractCoachFromText(text) {
    if (!text) return null;
    const matchMeta = text.match(/coach\s*:?\s*\b([A-Z]\d+)\b/i);
    if (matchMeta) return matchMeta[1];
    const match = text.match(/\b([A-Z]\d+)\b/);
    return match ? match[1] : null;
  }

  /**
   * Extract seat number from text (e.g., "42", "18")
   */
  function extractSeatFromText(text) {
    if (!text) return null;
    const match = text.match(/seat\s*:?\s*(\d+)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract train number from text (e.g., "12951")
   */
  function extractTrainFromText(text) {
    if (!text) return null;
    const match = text.match(/train\s*:?\s*(\d+)/i);
    return match ? match[1] : null;
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  /**
   * Make an API request
   */
  async function apiCall(method, endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const fetchOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options
    };

    // Remove Content-Type for FormData requests
    if (options.body instanceof FormData) {
      delete fetchOptions.headers['Content-Type'];
      fetchOptions.body = options.body;
    } else if (options.body && typeof options.body !== 'string') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      console.log(`[API] ${method} ${endpoint}`);
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API ERROR] ${response.status}:`, errorData);
        throw {
          status: response.status,
          message: errorData.detail || errorData.message || `HTTP ${response.status}`,
          data: errorData
        };
      }

      const data = await response.json();
      console.log(`[API SUCCESS] ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`[API FAILURE] ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  const API = {
    /**
     * Get all complaints with optional filters
     */
    getComplaints: async function (filters = {}) {
      if (USE_MOCK_DATA) {
        return window.mockComplaints || [];
      }

      try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.department) params.append('department', filters.department);
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit || 100);

        const endpoint = `/complaints?${params.toString()}`;
        const response = await apiCall('GET', endpoint);

        // Normalize all complaints
        const complaints = (response.complaints || response || [])
          .map(normalizeComplaint)
          .filter(c => c !== null);

        return complaints;
      } catch (error) {
        console.error('[API] getComplaints failed:', error);
        throw error;
      }
    },

    /**
     * Get single complaint by ID
     */
    getComplaintById: async function (complaintId) {
      if (USE_MOCK_DATA) {
        return (window.mockComplaints || []).find(c => c.complaint_id === complaintId) || null;
      }

      try {
        const response = await apiCall('GET', `/complaints/${complaintId}`);
        return normalizeComplaint(response);
      } catch (error) {
        console.error(`[API] getComplaintById(${complaintId}) failed:`, error);
        throw error;
      }
    },

    /**
     * Get complaints for map display
     */
    getMapComplaints: async function (filters = {}) {
      if (USE_MOCK_DATA) {
        return (window.mockComplaints || [])
          .filter(c => {
            if (filters.status && c.status !== filters.status) return false;
            if (filters.severity && c.severity !== filters.severity) return false;
            if (filters.department && c.department !== filters.department) return false;
            return true;
          });
      }

      try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.department) params.append('department', filters.department);

        const endpoint = `/complaints/map?${params.toString()}`;
        const response = await apiCall('GET', endpoint);

        // Normalize complaints from map response
        const complaints = (response.complaints || [])
          .map(c => {
            // Map endpoint returns location as nested object
            const complaint = normalizeComplaint(c);
            if (c.location && c.location.latitude !== undefined) {
              complaint.location = {
                lat: c.location.latitude,
                lng: c.location.longitude,
                name: c.location.name
              };
            }
            return complaint;
          })
          .filter(c => c !== null);

        return complaints;
      } catch (error) {
        console.error('[API] getMapComplaints failed:', error);
        throw error;
      }
    },

    /**
     * Submit a new complaint (text-based)
     */
    submitComplaint: async function (complaintData) {
      if (USE_MOCK_DATA) {
        // Mock submission
        return {
          complaint_id: complaintData.complaint_id || `RM-${Date.now()}`,
          ...complaintData,
          status: 'Pending'
        };
      }

      try {
        // Convert unified format to backend text submission format
        const description = complaintData.description || '';
        const meta = `Coach: ${complaintData.coach}, Seat: ${complaintData.seat}, Train: ${complaintData.train}`;
        const fullText = `${description}\n${meta}`;

        const response = await apiCall('POST', '/analyze-text', {
          body: { text: fullText }
        });

        // Response is nested: flatten it then normalize
        const flatResponse = flattenAnalyzeResponse(response);
        return normalizeComplaint(flatResponse);
      } catch (error) {
        console.error('[API] submitComplaint failed:', error);
        throw error;
      }
    },

    /**
     * Submit complaint with image analysis
     */
    submitComplaintWithImage: async function (imageFile, complaintData) {
      if (USE_MOCK_DATA) {
        return {
          complaint_id: complaintData.complaint_id || `RM-${Date.now()}`,
          ...complaintData,
          status: 'Pending'
        };
      }

      try {
        const formData = new FormData();
        formData.append('file', imageFile);

        const response = await apiCall('POST', '/analyze', {
          headers: {},
          body: formData
        });

        // Response is nested: flatten it then normalize
        const flatResponse = flattenAnalyzeResponse(response);
        return normalizeComplaint(flatResponse);
      } catch (error) {
        console.error('[API] submitComplaintWithImage failed:', error);
        throw error;
      }
    },

    /**
     * Update complaint status
     */
    updateComplaintStatus: async function (complaintId, status) {
      try {
        const response = await apiCall('PUT', `/complaints/${complaintId}/status`, {
          body: { status: status }
        });
        return response;
      } catch (error) {
        console.error(`[API] updateComplaintStatus(${complaintId}) failed:`, error);
        throw error;
      }
    },

    /**
     * Update complaint location
     */
    updateComplaintLocation: async function (complaintId, latitude, longitude, locationName = null) {
      try {
        const response = await apiCall('PUT', `/complaints/${complaintId}/location`, {
          body: {
            latitude: latitude,
            longitude: longitude,
            location_name: locationName
          }
        });
        return response;
      } catch (error) {
        console.error(`[API] updateComplaintLocation(${complaintId}) failed:`, error);
        throw error;
      }
    },

    /**
     * Upload evidence file
     */
    uploadEvidence: async function (complaintId, file) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiCall('POST', `/complaints/${complaintId}/evidence`, {
          headers: {},
          body: formData
        });
        return response;
      } catch (error) {
        console.error(`[API] uploadEvidence(${complaintId}) failed:`, error);
        throw error;
      }
    },

    /**
     * Get dashboard statistics
     */
    getDashboardStats: async function () {
      if (USE_MOCK_DATA) {
        // Return mock stats
        return {
          total_complaints: window.mockComplaints ? window.mockComplaints.length : 0,
          high_severity: (window.mockComplaints || []).filter(c => c.severity === 'HIGH').length,
          medium_severity: (window.mockComplaints || []).filter(c => c.severity === 'MEDIUM').length,
          low_severity: (window.mockComplaints || []).filter(c => c.severity === 'LOW').length,
          pending: (window.mockComplaints || []).filter(c => c.status === 'Pending').length,
          in_progress: (window.mockComplaints || []).filter(c => c.status === 'In Progress').length,
          resolved: (window.mockComplaints || []).filter(c => c.status === 'Resolved').length
        };
      }

      try {
        const response = await apiCall('GET', '/dashboard/stats');
        return response;
      } catch (error) {
        console.error('[API] getDashboardStats failed:', error);
        throw error;
      }
    },

    /**
     * Get dashboard analytics
     */
    getDashboardAnalytics: async function () {
      if (USE_MOCK_DATA) {
        return {};
      }

      try {
        const response = await apiCall('GET', '/dashboard/analytics');
        return response;
      } catch (error) {
        console.error('[API] getDashboardAnalytics failed:', error);
        throw error;
      }
    },

    /**
     * Get SLA dashboard
     */
    getDashboardSLA: async function () {
      if (USE_MOCK_DATA) {
        return {
          total_complaints: 0,
          within_sla: 0,
          approaching_deadline: 0,
          sla_breached: 0,
          escalated: 0
        };
      }

      try {
        const response = await apiCall('GET', '/dashboard/sla');
        return response;
      } catch (error) {
        console.error('[API] getDashboardSLA failed:', error);
        throw error;
      }
    },

    /**
     * Get API configuration (for debugging)
     */
    getConfig: function () {
      return {
        API_BASE_URL: API_BASE_URL,
        USE_MOCK_DATA: USE_MOCK_DATA
      };
    },

    /**
     * Test backend connectivity
     */
    testConnection: async function () {
      try {
        const response = await apiCall('GET', '/');
        return {
          status: 'ok',
          message: response.message || 'Backend is online',
          data: response
        };
      } catch (error) {
        return {
          status: 'error',
          message: `Backend unreachable: ${error.message || error}`,
          error: error
        };
      }
    }
  };

  // ============================================================
  // EXPORT
  // ============================================================

  // Global namespace
  window.RailMadadAPI = API;

  console.log('[RailMadadAPI] Initialized');
  console.log('[RailMadadAPI] Config:', API.getConfig());

})();
