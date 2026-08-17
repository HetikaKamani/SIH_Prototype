# Rail Madad — Integration Verification Map

## Part 1: INTEGRATION ARCHITECTURE DIAGRAM

```
PASSENGER INPUT
  ↓
app.js (Frontend)
  ↓ buildComplaint()
Frontend Complaint Object
  {
    complaint_id, category, subcategory, description,
    coach, seat, train, severity, confidence,
    department, status, location,
    media: { photo, video, audio, video_frame }
  }
  ↓
  ├─→ Online: processComplaintWithBackend()
  │     ↓ API.submitComplaintWithImage() or API.submitComplaint()
  │     ↓
  │   POST /analyze (image) or POST /analyze-text (text)
  │     ↓
  │   Backend Response (NESTED STRUCTURE):
  │   {
  │     complaint_id: "RM-1001",
  │     complaint: "...",
  │     classification: {
  │       category: "...",
  │       subcategory: "...",
  │       severity: "HIGH",
  │       confidence: 0.94,
  │       department: "..."
  │     },
  │     routing: {
  │       department: "...",
  │       priority: "...",
  │       escalation_required: false
  │     },
  │     sla: {
  │       hours: 6,
  │       deadline: "...",
  │       status: "WITHIN_SLA"
  │     }
  │   }
  │     ↓
  │   API normalizeComplaint() [MUST PARSE NESTED STRUCTURE]
  │     ↓
  │   Unified Complaint Object
  │     ↓
  │   showResult() → Passenger Result Screen
  │
  └─→ Offline: handleOfflineSubmit()
      ↓ Save to IndexedDB
      ↓ renderOfflineResult()
      ↓ showView('view-result')

OFFICER DASHBOARD
  ↓ initializeDashboard()
  ↓ loadComplaints()
  ↓ GET /complaints
  ↓
  Backend Response (FLAT STRUCTURE from GET /complaints):
  {
    complaints: [
      {
        complaint_id: "RM-1001",
        text: "...",
        category: "...",
        subcategory: "...",
        severity: "HIGH",
        confidence: 0.94,
        department: "...",
        status: "SUBMITTED",
        latitude: 19.2437,
        longitude: 73.1355,
        location_name: null,
        sla_hours: 6,
        sla_deadline: "...",
        sla_status: "WITHIN_SLA",
        ...
      }
    ]
  }
  ↓
  API normalizeComplaint() [FLAT STRUCTURE]
  ↓
  dashboardState.complaints[]
  ↓
  ├─→ renderKPIs()
  ├─→ renderComplaints() → Table
  ├─→ updateMapMarkers() → Leaflet Map
  └─→ Filters/Search apply to same array
```

---

## Part 2: CRITICAL RESPONSE STRUCTURE DIFFERENCES

### Issue: Nested vs Flat Response Formats

| Endpoint | Response Format | Location | fields |
|----------|-----------------|----------|--------|
| `POST /analyze` | NESTED | `classification: {}` | category, subcategory, severity, confidence, department |
| `POST /analyze-text` | NESTED | `classification: {}` | category, subcategory, severity, confidence, department |
| `GET /complaints` | FLAT | Top level | category, subcategory, severity, confidence, department |
| `GET /complaints/map` | NESTED | `location: {}` | latitude, longitude as nested object |
| `GET /complaints/{id}` | FLAT | Top level | All fields flat |

### Current Problem

**api.js `submitComplaint()` function:**
```javascript
submitComplaint: async function (complaintData) {
  const response = await apiCall('POST', '/analyze-text', { body: { text: fullText } });
  const complaint = response || {};
  return normalizeComplaint(complaint);  // ← WRONG: response is nested!
}
```

**Response from `/analyze-text`:**
```json
{
  "complaint_id": "RM-1001",
  "complaint": "...",
  "classification": { "category": "...", "severity": "HIGH", ... },
  "routing": { ... },
  "sla": { ... }
}
```

**What normalizeComplaint() expects:**
```json
{
  "complaint_id": "RM-1001",
  "category": "...",
  "subcategory": "...",
  "severity": "HIGH",
  ...
}
```

---

## Part 3: FIX REQUIRED

### Changes Needed in api.js

1. **In `submitComplaint()`**: Parse nested `classification` before normalization
2. **In `submitComplaintWithImage()`**: Parse nested `classification` before normalization
3. **Keep `normalizeComplaint()`**: It works for flat structures from GET endpoints

### Pseudo-code Fix:

```javascript
submitComplaint: async function (complaintData) {
  const response = await apiCall('POST', '/analyze-text', { body: { text: fullText } });
  
  // FLATTEN the nested response
  const flatResponse = {
    complaint_id: response.complaint_id,
    text: response.complaint,  // ← complaint field has the text
    category: response.classification?.category,
    subcategory: response.classification?.subcategory,
    severity: response.classification?.severity,
    confidence: response.classification?.confidence,
    department: response.classification?.department,
    priority: response.routing?.priority,
    sla_hours: response.sla?.hours,
    sla_deadline: response.sla?.deadline,
    sla_status: response.sla?.status,
    status: 'SUBMITTED',
    latitude: null,
    longitude: null,
    created_at: new Date().toISOString(),
  };
  
  return normalizeComplaint(flatResponse);
}
```

---

## Part 4: CURRENT FRONTEND FILES

### api.js (NEW)
- Location: `c:\Users\mshah\Downloads\sih\api.js`
- Status: ✅ Created
- Issue: Response parsing needs fix (see Part 3)
- Functions:
  - `normalizeComplaint()` - Works for flat responses
  - `getComplaints()` - Calls GET /complaints (flat) ✅
  - `submitComplaint()` - Calls POST /analyze-text (nested) ❌ NEEDS FIX
  - `submitComplaintWithImage()` - Calls POST /analyze (nested) ❌ NEEDS FIX
  - Other functions for dashboard, map, status, location, evidence

### app.js (MODIFIED)
- Status: ✅ Updated
- Issue: Uses backend API service ✅
- Functions added:
  - `processComplaintWithBackend()` - Async processing with real API ✅
  - `sleep()` - Helper function ✅
- Flow: buildComplaint() → startProcessing() → processComplaintWithBackend() → showResult()

### dashboard.js (MODIFIED)
- Status: ✅ Updated
- Issue: Uses backend API service ✅
- Functions added:
  - `loadComplaints()` - Fetches from GET /complaints ✅
  - `reloadComplaints()` - Manual refresh ✅
  - `initializeDashboard()` - Async startup ✅
- Uses `dashboardState.complaints[]` for all rendering ✅

### db.js (MODIFIED)
- Status: ✅ Updated
- Issue: Uses backend API for offline sync ✅
- Function modified:
  - `submitComplaintToServer()` - Calls `RailMadadAPI.submitComplaint()` ✅

### index.html (MODIFIED)
- Added: `<script src="api.js"></script>` ✅

### dashboard.html (MODIFIED)
- Added: `<script src="api.js"></script>` ✅

### backend/app/main.py (MODIFIED)
- Added: CORS middleware ✅
- Status: Ready to receive requests from frontend ✅

---

## Part 5: PASSENGER SUBMISSION FLOW

### Current Flow (WITH ISSUE)
```
1. User fills form & clicks Submit
   ↓
2. buildComplaint() creates frontend object
   ↓
3. navigator.onLine → true
   ↓
4. startProcessing(complaint)
   ↓
5. processComplaintWithBackend()
   ↓
6. API.submitComplaintWithImage() or API.submitComplaint()
   ↓
7. POST /analyze or /analyze-text
   ↓
8. Backend returns NESTED response
   ↓
9. api.js returns result (STILL NESTED)
   ↓
10. showResult(result)
   ↓
11. renderComplaintResult(complaint) 
    Tries to access complaint.category
    BUT it's in complaint.classification.category
   ↓
   Result screen may show blank/undefined values ❌
```

### Expected Flow (AFTER FIX)
```
1-8. Same as above
   ↓
9. api.js FLATTENS nested response
   ↓
10. api.js calls normalizeComplaint(flatResponse)
   ↓
11. Returns unified complaint object
   ↓
12. showResult(result)
   ↓
13. renderComplaintResult(complaint)
    Accesses complaint.category ✅
   ↓
    Result screen displays all fields correctly ✅
```

---

## Part 6: DASHBOARD DATA FLOW

### Current Flow (SHOULD BE CORRECT)
```
1. Dashboard loads (dashboard.html)
   ↓
2. <script> loads: video-frame.js, db.js, api.js, dashboard.js
   ↓
3. dashboard.js runs initializeDashboard()
   ↓
4. loadComplaints() called
   ↓
5. API.getComplaints() called
   ↓
6. GET /complaints (FLAT response)
   ↓
7. Backend returns array of complaints
   {
     complaints: [
       { complaint_id, category, subcategory, severity, confidence, ... }
     ]
   }
   ↓
8. api.js normalizeComplaint() on each (FLAT structure) ✅
   ↓
9. dashboardState.complaints[] populated
   ↓
10. renderDashboard() called
    - renderKPIs(dashboardState.complaints)
    - renderComplaints() using filtered/sorted complaints
    - updateMapMarkers(complaints)
   ✅ All using SAME data source
```

---

## Part 7: MAP INTEGRATION

### Expected Flow
```
1. loadComplaints() gets complaints with lat/lng
   ↓
2. updateMapMarkers(complaints)
   ↓
3. For each complaint with location.lat && location.lng
   ↓
4. Create L.marker([lat, lng])
   ↓
5. Set popup with complaint details
   ↓
6. Click marker → View Details button
   ↓
7. Lookup complaint in dashboardState.complaints
   ↓
8. openComplaintModal(complaint)
```

### Potential Issues
- If complaint.location is null → marker skipped ✅ Correct
- If location is not { lat, lng } → error possible
- Map may show duplicate markers if loadComplaints runs multiple times

---

## Part 8: OFFLINE INTEGRATION

### Flow
```
1. navigator.onLine = false
   ↓
2. User submits complaint
   ↓
3. handleOfflineSubmit(complaint)
   ↓
4. window.RailMadadDB.saveOfflineComplaint(complaint)
   ↓
5. IndexedDB stores with sync_status: "pending"
   ↓
6. renderOfflineResult() shows offline confirmation
   ↓

Then user comes online:
   ↓
7. window.addEventListener('online', syncPendingComplaints)
   ↓
8. For each pending complaint:
   ↓
9. db.js submitComplaintToServer(entry.complaint)
   ↓
10. Calls API.submitComplaint() (uses backend)
   ↓
11. Backend processes (POST /analyze-text)
   ↓
12. Returns response (NESTED) → NEEDS FLATTENING IN api.js
   ↓
13. markComplaintSynced(entry.local_id, serverComplaint)
   ↓
14. IndexedDB updated with sync_status: "synced"
```

---

## Part 9: STATUS NORMALIZATION ISSUE

**Frontend in app.js and dashboard.js:**
- Expects: `status: "Pending"`, `"In Progress"`, `"Resolved"`
- Uses: `normalizeStatus()` function to convert

**Backend:**
- Returns: `status: "SUBMITTED"`, `"ASSIGNED"`, `"IN_PROGRESS"`, `"RESOLVED"`, `"ESCALATED"`, `"REJECTED"`

**Issue:** The `normalizeComplaint()` function in api.js does NOT normalize status!
```javascript
status: apiComplaint.status || 'SUBMITTED',  // ← Keeps backend value as-is
```

This means the UI will show "SUBMITTED" but expects "Pending".

---

## Part 10: SEVERITY CASE ISSUE

**Frontend:**
- Expects: `severity: "HIGH"` (uppercase)
- Uses: `normalizeSeverity()` to ensure uppercase

**Backend:**
- Returns: `severity: "HIGH"` (uppercase)

**Status:** ✅ Consistent, no issue

---

## Part 11: CONFIDENCE VALUE ISSUE

**Frontend `renderComplaintResult()`:**
```javascript
var confidenceValue = typeof safeComplaint.confidence === 'number' ? 
  safeComplaint.confidence : null;
var confidencePct = formatConfidence(safeComplaint.confidence);
```

**formatConfidence():**
```javascript
function formatConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  var normalized = value;
  if (normalized > 1) normalized = normalized / 100;
  var pct = Math.max(0, Math.min(100, Math.round(normalized * 100)));
  return pct + '%';
}
```

**Backend returns:**
- confidence: 0.94 (decimal 0-1)

**Expected output:** "94%"
**Actual:** Will work correctly ✅

---

## Part 12: LOCATION HANDLING

**Frontend:**
```javascript
location: {
  lat: apiComplaint.latitude,
  lng: apiComplaint.longitude,
  name: apiComplaint.location_name || null
}
```

**Backend (GET /complaints):**
```python
"latitude": None,
"longitude": None,
"location_name": None,
```

**Backend (GET /complaints/map):**
```python
"location": {
  "latitude": complaint["latitude"],
  "longitude": complaint["longitude"],
  "name": complaint.get("location_name")
}
```

**Issue:** `/complaints/map` nests location, but `normalizeComplaint()` expects flat!
```javascript
location: apiComplaint.latitude && apiComplaint.longitude ? {
  lat: apiComplaint.latitude,
  lng: apiComplaint.longitude,
  name: apiComplaint.location_name || null
} : null
```

If /complaints/map returns nested location, this will fail.

---

## Part 13: UNIFIED COMPLAINT OBJECT STATUS

### Required Fields (from requirements):
```javascript
{
  "complaint_id": "RM-1001",           ✅ Maps from response.complaint_id
  "category": "Coach Maintenance",      ❌ NESTED in response.classification.category
  "subcategory": "AC Water Leakage",    ❌ NESTED in response.classification.subcategory
  "description": "AC water leakage",    ✅ Maps from response.complaint or response.text
  "coach": "B3",                        ✅ Extracted from text or provided
  "seat": "42",                         ✅ Extracted from text or provided
  "train": "12951",                     ✅ Provided or defaults
  "severity": "HIGH",                   ❌ NESTED in response.classification.severity
  "confidence": 0.94,                   ❌ NESTED in response.classification.confidence
  "department": "Electrical/Maintenance", ❌ NESTED in response.classification.department
  "status": "Pending",                  ✅ Defaults to SUBMITTED, but needs normalization
  "location": { "lat": 19.2437, "lng": 73.1355 }  ✅ Handled, but may fail for /map endpoint
}
```

---

## Summary: FIXES NEEDED

### Priority 1: CRITICAL
1. Fix `api.js submitComplaint()` to flatten nested response
2. Fix `api.js submitComplaintWithImage()` to flatten nested response
3. Add status normalization in `normalizeComplaint()`
4. Fix location handling for `/complaints/map` nested response

### Priority 2: HIGH
1. Verify `/complaints/map` response parsing
2. Test duplicate marker prevention in map
3. Verify offline sync uses correct API call

### Priority 3: MEDIUM
1. Add error handling for missing fields
2. Verify CORS works with actual backend
3. Test all combinations of filters + search

### Priority 4: LOW
1. Verify responsive layout
2. Clean up console errors
3. Optimize API call sequencing

