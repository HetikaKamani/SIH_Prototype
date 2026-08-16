const mockComplaints = [
  {
    complaint_id: 'RM-1001',
    category: 'Coach Maintenance',
    subcategory: 'AC Water Leakage',
    description: 'AC water leakage in B3 coach',
    coach: 'B3',
    seat: '42',
    train: '12951',
    severity: 'HIGH',
    confidence: 0.94,
    department: 'Electrical/Maintenance',
    status: 'Pending',
    location: { lat: 19.2437, lng: 73.1355 },
  },
  {
    complaint_id: 'RM-1002',
    category: 'Cleanliness',
    subcategory: 'Trash Accumulation',
    description: 'Garbage piled near door in S5 coach',
    coach: 'S5',
    seat: '18',
    train: '12626',
    severity: 'MEDIUM',
    confidence: 0.87,
    department: 'OBHS',
    status: 'In Progress',
    location: { lat: 19.1462, lng: 72.9934 },
  },
  {
    complaint_id: 'RM-1003',
    category: 'Coach Maintenance',
    subcategory: 'Broken Seat',
    description: 'Seat frame is broken near window in A2 coach',
    coach: 'A2',
    seat: '31',
    train: '12002',
    severity: 'HIGH',
    confidence: 0.91,
    department: 'Coaching Depot / Electrical',
    status: 'Pending',
    location: { lat: 19.0711, lng: 72.8869 },
  },
  {
    complaint_id: 'RM-1004',
    category: 'Electrical',
    subcategory: 'Fan Not Working',
    description: 'Rear fan is not operational in coach B1',
    coach: 'B1',
    seat: '14',
    train: '12147',
    severity: 'MEDIUM',
    confidence: 0.79,
    department: 'Electrical/Maintenance',
    status: 'Resolved',
    location: { lat: 19.0468, lng: 73.0116 },
  },
  {
    complaint_id: 'RM-1005',
    category: 'Sanitation',
    subcategory: 'Toilet Hygiene',
    description: 'Toilet in coach C3 is dirty and leaking',
    coach: 'C3',
    seat: '07',
    train: '12987',
    severity: 'LOW',
    confidence: 0.68,
    department: 'Medical',
    status: 'Pending',
    location: { lat: 18.9569, lng: 72.8426 },
  },
  {
    complaint_id: 'RM-1006',
    category: 'Coach Maintenance',
    subcategory: 'Door Jam',
    description: 'Sliding door on right side is jammed',
    coach: 'D4',
    seat: '56',
    train: '12229',
    severity: 'HIGH',
    confidence: 0.93,
    department: 'RPF',
    status: 'In Progress',
    location: { lat: 19.4511, lng: 73.2193 },
  },
  {
    complaint_id: 'RM-1007',
    category: 'Medical',
    subcategory: 'First Aid Box Missing',
    description: 'First aid box unavailable in coach H2',
    coach: 'H2',
    seat: '03',
    train: '12478',
    severity: 'LOW',
    confidence: 0.71,
    department: 'Medical',
    status: 'Resolved',
    location: { lat: 19.3691, lng: 73.1087 },
  },
  {
    complaint_id: 'RM-1008',
    category: 'Coach Maintenance',
    subcategory: 'Power Socket Failure',
    description: 'Charging point in coach S2 not working',
    coach: 'S2',
    seat: '25',
    train: '12311',
    severity: 'MEDIUM',
    confidence: 0.81,
    department: 'Electrical/Maintenance',
    status: 'Pending',
    location: { lat: 19.1795, lng: 72.8972 },
  },
  {
    complaint_id: 'RM-1009',
    category: 'Sanitation',
    subcategory: 'Pest Issue',
    description: 'Cockroaches along luggage rack in coach A5',
    coach: 'A5',
    seat: '46',
    train: '13007',
    severity: 'LOW',
    confidence: 0.64,
    department: 'OBHS',
    status: 'Pending',
    location: { lat: 19.3087, lng: 72.9516 },
  },
  {
    complaint_id: 'RM-1010',
    category: 'Coach Maintenance',
    subcategory: 'Water Pressure Issue',
    description: 'No water in wash basin in coach E1',
    coach: 'E1',
    seat: '22',
    train: '12455',
    severity: 'MEDIUM',
    confidence: 0.75,
    department: 'Coaching Depot / Electrical',
    status: 'In Progress',
    location: { lat: 19.1237, lng: 73.1475 },
  },
  {
    complaint_id: 'RM-1011',
    category: 'Electrical',
    subcategory: 'Emergency Light Failure',
    description: 'Emergency light not working above berth in coach C2',
    coach: 'C2',
    seat: '11',
    train: '12821',
    severity: 'HIGH',
    confidence: 0.9,
    department: 'Electrical/Maintenance',
    status: 'Pending',
    location: { lat: 19.0099, lng: 73.0228 },
  },
  {
    complaint_id: 'RM-1012',
    category: 'Cleanliness',
    subcategory: 'Spillage on Floor',
    description: 'Spilled food and water near vestibule in coach H3',
    coach: 'H3',
    seat: '39',
    train: '12689',
    severity: 'LOW',
    confidence: 0.66,
    department: 'OBHS',
    status: 'Resolved',
    location: { lat: 19.2202, lng: 72.8664 },
  }
];

const state = {
  search: '',
  severity: 'All',
  status: 'All',
  department: 'All',
  sortBy: 'newest',
};

const els = {
  kpiTotal: document.getElementById('kpi-total'),
  kpiHigh: document.getElementById('kpi-high'),
  kpiMedium: document.getElementById('kpi-medium'),
  kpiLow: document.getElementById('kpi-low'),
  searchInput: document.getElementById('searchInput'),
  severityFilter: document.getElementById('severityFilter'),
  statusFilter: document.getElementById('statusFilter'),
  departmentFilter: document.getElementById('departmentFilter'),
  sortFilter: document.getElementById('sortFilter'),
  refreshBtn: document.getElementById('refreshBtn'),
  complaintsContainer: document.getElementById('complaintsContainer'),
  emptyState: document.getElementById('emptyState'),
  modal: document.getElementById('complaintModal'),
  modalBody: document.getElementById('modalBody'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  mapEmptyState: document.getElementById('mapEmptyState'),
};

const mapState = {
  map: null,
  markers: [],
  initialized: false,
};

const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function normalizeStatus(value) {
  const text = String(value || '').trim();
  if (!text) return 'Pending';
  const lower = text.toLowerCase();
  if (lower === 'in progress' || lower === 'in_progress' || lower === 'progress') return 'In Progress';
  if (lower === 'resolved' || lower === 'complete' || lower === 'completed') return 'Resolved';
  return 'Pending';
}

function normalizeSeverity(value) {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'HIGH' || text === 'MEDIUM' || text === 'LOW') return text;
  return 'MEDIUM';
}

function pctFromDecimal(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

function confidenceBar(value) {
  const percentage = pctFromDecimal(value);
  const filled = Math.max(0, Math.min(20, Math.round((percentage / 100) * 20)));
  const blocks = Array.from({ length: 20 }, function (_, index) {
    return '<span class="confidence-block' + (index < filled ? ' filled' : '') + '"></span>';
  }).join('');
  return '<div class="confidence-inline"><span class="confidence-text">' + percentage + '%</span><span class="confidence-track" aria-label="AI confidence ' + percentage + '%">' + blocks + '</span></div>';
}

function getSearchText(complaint) {
  return [
    complaint.complaint_id,
    complaint.subcategory,
    complaint.category,
    complaint.train,
    complaint.coach,
    complaint.department,
    complaint.description,
  ].join(' ').toLowerCase();
}

function filterComplaints(complaints) {
  const query = state.search.trim().toLowerCase();

  return complaints.filter(function (complaint) {
    const matchesSearch = !query || getSearchText(complaint).includes(query);
    const matchesSeverity = state.severity === 'All' || normalizeSeverity(complaint.severity) === state.severity;
    const matchesStatus = state.status === 'All' || normalizeStatus(complaint.status) === state.status;
    const matchesDepartment = state.department === 'All' || (complaint.department || '').trim() === state.department;

    return matchesSearch && matchesSeverity && matchesStatus && matchesDepartment;
  });
}

function sortComplaints(complaints) {
  const result = [...complaints];

  result.sort(function (a, b) {
    if (state.sortBy === 'severity') {
      const diff = severityRank[normalizeSeverity(b.severity)] - severityRank[normalizeSeverity(a.severity)];
      if (diff !== 0) return diff;
      return complaintIdNumber(b.complaint_id) - complaintIdNumber(a.complaint_id);
    }

    if (state.sortBy === 'confidence') {
      const diff = pctFromDecimal(b.confidence) - pctFromDecimal(a.confidence);
      if (diff !== 0) return diff;
      return complaintIdNumber(b.complaint_id) - complaintIdNumber(a.complaint_id);
    }

    return complaintIdNumber(b.complaint_id) - complaintIdNumber(a.complaint_id);
  });

  return result;
}

function complaintIdNumber(value) {
  const match = String(value || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function renderKPIs(complaints) {
  const total = complaints.length;
  const high = complaints.filter(function (item) { return normalizeSeverity(item.severity) === 'HIGH'; }).length;
  const medium = complaints.filter(function (item) { return normalizeSeverity(item.severity) === 'MEDIUM'; }).length;
  const low = complaints.filter(function (item) { return normalizeSeverity(item.severity) === 'LOW'; }).length;

  els.kpiTotal.textContent = total;
  els.kpiHigh.textContent = high;
  els.kpiMedium.textContent = medium;
  els.kpiLow.textContent = low;
}

function renderComplaints(complaints) {
  const rows = complaints.map(function (complaint) {
    const id = complaint.complaint_id;
    const severity = normalizeSeverity(complaint.severity);
    const status = normalizeStatus(complaint.status);
    const isUrgent = status === 'Pending' && severity === 'HIGH';
    const issueText = complaint.subcategory || complaint.category || 'General Issue';

    return [
      '<tr>',
      '  <td class="complaint-id-cell">',
      '    <div class="issue-head">',
      '      <span class="complaint-id">' + escapeHtml(id) + '</span>',
      '      ' + (isUrgent ? '<span class="urgent-badge">URGENT</span>' : ''),
      '    </div>',
      '  </td>',
      '  <td class="issue-cell"><div class="issue-name">' + escapeHtml(issueText) + '</div></td>',
      '  <td class="category-cell">' + escapeHtml(complaint.category || 'Not available') + '</td>',
      '  <td class="train-cell">' + escapeHtml(complaint.train || 'N/A') + '</td>',
      '  <td class="coach-cell">' + escapeHtml(complaint.coach || 'N/A') + '</td>',
      '  <td class="seat-cell">' + escapeHtml(complaint.seat || 'N/A') + '</td>',
      '  <td class="severity-cell"><span class="severity-badge severity-' + severity.toLowerCase() + '"><span class="severity-emoji">' + getSeverityEmoji(severity) + '</span>' + severity + '</span></td>',
      '  <td class="confidence-cell">' + confidenceBar(complaint.confidence) + '</td>',
      '  <td class="department-cell">' + escapeHtml(complaint.department || 'Not assigned yet') + '</td>',
      '  <td class="status-cell"><span class="status-badge status-' + status.toLowerCase().replace(/\s+/g, '-') + '">' + status + '</span></td>',
      '  <td class="action-cell"><button type="button" class="details-btn" data-complaint-id="' + escapeHtml(id) + '">View</button></td>',
      '</tr>'
    ].join('');
  }).join('');

  els.complaintsContainer.innerHTML = [
    '<div class="table-container">',
    '  <table class="complaint-table">',
    '    <thead>',
    '      <tr>',
    '        <th>Complaint ID</th>',
    '        <th>Issue</th>',
    '        <th>Category</th>',
    '        <th>Train</th>',
    '        <th>Coach</th>',
    '        <th>Seat</th>',
    '        <th>Severity</th>',
    '        <th>Confidence</th>',
    '        <th>Department</th>',
    '        <th>Status</th>',
    '        <th>Action</th>',
    '      </tr>',
    '    </thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>'
  ].join('');

  const detailsButtons = document.querySelectorAll('.details-btn');
  detailsButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const complaintId = button.getAttribute('data-complaint-id');
      const selectedComplaint = mockComplaints.find(function (item) {
        return item.complaint_id === complaintId;
      });
      if (selectedComplaint) {
        openComplaintModal(selectedComplaint);
      }
    });
  });
}

function getSeverityEmoji(severity) {
  if (severity === 'HIGH') return '🔴';
  if (severity === 'MEDIUM') return '🟡';
  return '🟢';
}

function buildTimeline(status) {
  const normalized = normalizeStatus(status);
  const items = [
    'Complaint Submitted',
    'AI Processed',
    'Department Assigned',
    normalized,
  ];

  const currentIndex = items.indexOf(normalized);

  return items.map(function (item, index) {
    const isComplete = index < items.length - 1 || normalized === 'Resolved';
    const isActive = index === currentIndex && normalized !== 'Resolved';
    const stateClass = isComplete ? 'done' : isActive ? 'active' : 'pending';
    const marker = isComplete ? '✓' : isActive ? '●' : '○';
    return '<div class="timeline-item ' + stateClass + '"><span class="timeline-marker">' + marker + '</span><span>' + escapeHtml(item) + '</span></div>';
  }).join('');
}

function buildOptionalRows(rows) {
  const validRows = rows.filter(function (row) {
    return row && row.label && row.value !== null && typeof row.value !== 'undefined' && String(row.value).trim() !== '';
  });

  if (!validRows.length) return '';

  return '<div class="detail-list">' + validRows.map(function (row) {
    return '<div class="detail-row-item"><span>' + escapeHtml(row.label) + '</span><strong>' + escapeHtml(row.value) + '</strong></div>';
  }).join('') + '</div>';
}

function buildConfidenceBlock(confidence) {
  const percentage = pctFromDecimal(confidence);
  return [
    '<div class="confidence-detail">',
    '  <div class="confidence-detail-header"><span>AI Confidence</span><strong>' + percentage + '%</strong></div>',
    '  <div class="confidence-bar" aria-label="AI confidence ' + percentage + '%">',
    '    <span class="confidence-fill" style="width: ' + percentage + '%"></span>',
    '  </div>',
    '</div>'
  ].join('');
}

function renderComplaintDetails(complaint) {
  const severity = normalizeSeverity(complaint.severity);
  const status = normalizeStatus(complaint.status);
  const confidence = pctFromDecimal(complaint.confidence);
  const department = complaint.department || 'Not assigned yet';
  const issue = complaint.subcategory || complaint.category || 'General Issue';
  const aiCategory = complaint.category || 'Not available';
  const aiSubcategory = complaint.subcategory || complaint.category || 'General Issue';
  const detectedIssue = complaint.detected_object || complaint.vision_result || aiSubcategory;
  const complaintInfoRows = [
    { label: 'Complaint ID', value: complaint.complaint_id },
    { label: 'Category', value: complaint.category || 'Not available' },
    { label: 'Subcategory', value: complaint.subcategory || 'Not available' },
    { label: 'Description', value: complaint.description || 'No description provided' },
    { label: 'Train', value: complaint.train || 'N/A' },
    { label: 'Coach', value: complaint.coach || 'N/A' },
    { label: 'Seat', value: complaint.seat || 'N/A' },
  ];

  const passengerItems = [
    { label: 'PNR', value: complaint.pnr || 'Not available' },
    { label: 'Train', value: complaint.train || 'N/A' },
    { label: 'Coach', value: complaint.coach || 'N/A' },
    { label: 'Seat', value: complaint.seat || 'N/A' },
    { label: 'Passenger Name', value: complaint.passenger_name || complaint.name || 'Not available' },
  ];

  const assignmentRows = [
    { label: 'Assigned Department', value: department },
    { label: 'Status', value: status },
  ];

  const ocr = complaint.ocr || {};
  const ocrRows = [
    { label: 'Coach', value: ocr.coach || complaint.coach },
    { label: 'Seat', value: ocr.seat || complaint.seat },
    { label: 'Train', value: ocr.train || complaint.train },
    { label: 'Platform', value: ocr.platform },
  ];

  const transcription = complaint.transcription || complaint.voice_transcription || complaint.whisper_transcription || complaint.transcript;
  const media = complaint.media || {};
  const imageSrc = media.processed_image || media.image || complaint.processed_image || complaint.image;
  const audioSrc = media.audio || complaint.audio || complaint.voice_audio;
  const videoSrc = media.video || complaint.video;
  const videoFrameSrc = media.video_frame || complaint.video_frame;

  const location = complaint.location || {};
  const showLocation = Number.isFinite(location.lat) || Number.isFinite(location.lng);

  const detailsMarkup = [
    '<div class="details-shell">',
    '  <div class="details-header-block">',
    '    <div class="details-header-row">',
    '      <div>',
    '        <p class="detail-eyebrow">RAIL MADAD</p>',
    '        <h3>Complaint Details</h3>',
    '      </div>',
    '    </div>',
    '    <div class="details-summary-row">',
    '      <div class="details-id-block">',
    '        <div class="details-id">' + escapeHtml(complaint.complaint_id) + '</div>',
    '        <div class="details-issue-title">' + escapeHtml(issue) + '</div>',
    '      </div>',
    '      <div class="details-status-group">',
    '        <span class="severity-badge severity-' + severity.toLowerCase() + '"><span class="severity-emoji">' + getSeverityEmoji(severity) + '</span>' + severity + '</span>',
    '        <span class="status-badge status-' + status.toLowerCase().replace(/\s+/g, '-') + '">' + status + '</span>',
    '      </div>',
    '    </div>',
    '  </div>',

    '  <div class="details-layout">',
    '    <div class="details-column">',
    '      <section class="details-card">',
    '        <h4>Complaint Information</h4>',
    buildOptionalRows(complaintInfoRows),
    '      </section>',

    '      <section class="details-card">',
    '        <h4>Passenger / Journey Information</h4>',
    buildOptionalRows(passengerItems),
    '      </section>',

    '      <section class="details-card">',
    '        <h4>Assignment</h4>',
    buildOptionalRows(assignmentRows),
    '      </section>',

    showLocation ? (
      '      <section class="details-card">' +
      '        <h4>Complaint Location</h4>' +
      '        <div class="detail-list">' +
      '          <div class="detail-row-item"><span>Latitude</span><strong>' + escapeHtml(String(location.lat)) + '</strong></div>' +
      '          <div class="detail-row-item"><span>Longitude</span><strong>' + escapeHtml(String(location.lng)) + '</strong></div>' +
      '        </div>' +
      '      </section>'
    ) : '',

    '    </div>',

    '    <div class="details-column">',
    '      <section class="details-card">',
    '        <h4>AI Analysis</h4>',
    '        <div class="detail-list">',
    '          <div class="detail-row-item"><span>Category</span><strong>' + escapeHtml(aiCategory) + '</strong></div>',
    '          <div class="detail-row-item"><span>Subcategory</span><strong>' + escapeHtml(aiSubcategory) + '</strong></div>',
    '          <div class="detail-row-item"><span>Detected Issue</span><strong>' + escapeHtml(detectedIssue) + '</strong></div>',
    '        </div>',
    '        ' + buildConfidenceBlock(complaint.confidence),
    '      </section>',

    (complaint.ocr || complaint.ocr_data) ? (
      '      <section class="details-card">' +
      '        <h4>OCR Extracted Information</h4>' +
      buildOptionalRows(ocrRows) +
      '      </section>'
    ) : '',

    (transcription) ? (
      '      <section class="details-card">' +
      '        <h4>Voice Transcription</h4>' +
      '        <p class="detail-quote">"' + escapeHtml(transcription) + '"</p>' +
      '      </section>'
    ) : '',

    '    </div>',
    '  </div>',

    (imageSrc || audioSrc || videoSrc || videoFrameSrc) ? (
      '  <section class="details-card details-media-card">' +
      '    <h4>Complaint Media</h4>' +
      (imageSrc ? (
        '<div class="media-block"><div class="media-label">Processed Image</div><img src="' + escapeHtml(imageSrc) + '" alt="Processed complaint image" class="detail-media-image" /></div>'
      ) : '') +
      (audioSrc ? (
        '<div class="media-block"><div class="media-label">Voice Complaint</div><audio controls class="detail-audio"><source src="' + escapeHtml(audioSrc) + '" /></audio>' + (transcription ? '<p class="detail-quote">Voice Transcription: "' + escapeHtml(transcription) + '"</p>' : '') + '</div>'
      ) : '') +
      (videoSrc ? (
        '<div class="media-block"><div class="media-label">Complaint Video</div><video controls class="detail-video"><source src="' + escapeHtml(videoSrc) + '" /></video></div>'
      ) : '') +
      (videoFrameSrc && videoFrameSrc.url ? (
        '<div class="media-block"><div class="media-label">Representative Frame</div><img src="' + escapeHtml(videoFrameSrc.url || '') + '" alt="Representative video frame" class="detail-media-image" /><p class="detail-quote">Frame extracted for AI analysis</p></div>'
      ) : '') +
      '  </section>'
    ) : '',

    '  <section class="details-card timeline-card">',
    '    <h4>Status Timeline</h4>',
    '    <div class="timeline-list">' + buildTimeline(status) + '</div>',
    '  </section>',

    '  <div class="modal-actions">',
    '    <button type="button" class="secondary-btn" data-close="modal">Back to Complaints</button>',
    '    <button type="button" class="primary-btn" data-close="modal">Close</button>',
    '  </div>',
    '</div>'
  ].join('');

  return detailsMarkup;
}

function openComplaintModal(complaint) {
  const severity = normalizeSeverity(complaint.severity);
  const status = normalizeStatus(complaint.status);

  els.modalBody.innerHTML = renderComplaintDetails(complaint);
  document.getElementById('modalTitle').textContent = complaint.complaint_id;
  document.querySelector('#complaintModal .modal-header h2').textContent = complaint.complaint_id;
  document.querySelector('#complaintModal .modal-kicker').textContent = 'Complaint Details';

  const modalTitle = document.getElementById('modalTitle');
  modalTitle.textContent = complaint.complaint_id;
  modalTitle.setAttribute('aria-label', 'Complaint ' + complaint.complaint_id);
  els.modal.classList.remove('hidden');
}

function escapeHtml(value) {
  const safe = String(value ?? '');
  return safe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createComplaintMarker(complaint) {
  const severity = normalizeSeverity(complaint.severity);
  const colorMap = {
    HIGH: '#ef4444',
    MEDIUM: '#fbbf24',
    LOW: '#22c55e',
  };

  const color = colorMap[severity] || '#64748b';
  const markerIcon = L.divIcon({
    className: 'complaint-marker-icon',
    html: '<span style="background:' + color + '; width: 18px; height: 18px; display: block; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

  const marker = L.marker([complaint.location.lat, complaint.location.lng], { icon: markerIcon });
  const popupHtml = [
    '<div class="map-popup">',
    '  <div class="map-popup-header">' + escapeHtml(complaint.complaint_id) + '</div>',
    '  <div class="map-popup-title">' + escapeHtml(complaint.subcategory || complaint.category || 'General Issue') + '</div>',
    '  <div class="map-popup-meta">Coach: ' + escapeHtml(complaint.coach || 'N/A') + ' · Seat: ' + escapeHtml(complaint.seat || 'N/A') + '</div>',
    '  <div class="map-popup-meta">' + escapeHtml(complaint.department || 'Not assigned yet') + '</div>',
    '  <div class="map-popup-status"><span class="severity-badge severity-' + severity.toLowerCase() + '"><span class="severity-emoji">' + getSeverityEmoji(severity) + '</span>' + severity + '</span></div>',
    '  <div class="map-popup-status">Status: ' + escapeHtml(normalizeStatus(complaint.status)) + '</div>',
    '  <button type="button" class="map-details-btn" data-complaint-id="' + escapeHtml(complaint.complaint_id) + '">View Details</button>',
    '</div>'
  ].join('');

  marker.bindPopup(popupHtml);

  marker.on('popupopen', function () {
    const popupBtn = document.querySelector('.map-details-btn');
    if (!popupBtn) return;
    popupBtn.addEventListener('click', function () {
      const complaintId = popupBtn.getAttribute('data-complaint-id');
      const selectedComplaint = mockComplaints.find(function (item) {
        return item.complaint_id === complaintId;
      });
      if (selectedComplaint) {
        openComplaintModal(selectedComplaint);
      }
    });
  });

  return marker;
}

function clearMapMarkers() {
  if (!mapState.map) return;
  mapState.markers.forEach(function (marker) {
    mapState.map.removeLayer(marker);
  });
  mapState.markers = [];
}

function fitMapToComplaints(complaints) {
  if (!mapState.map) return;

  const valid = complaints.filter(function (complaint) {
    return complaint && complaint.location && Number.isFinite(complaint.location.lat) && Number.isFinite(complaint.location.lng);
  });

  if (!valid.length) {
    els.mapEmptyState.classList.remove('hidden');
    mapState.map.setView([19.1, 73.0], 10);
    return;
  }

  els.mapEmptyState.classList.add('hidden');

  if (valid.length === 1) {
    const point = valid[0].location;
    mapState.map.setView([point.lat, point.lng], 13);
    return;
  }

  const bounds = L.latLngBounds(valid.map(function (item) {
    return [item.location.lat, item.location.lng];
  }));

  mapState.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
}

function updateMapMarkers(complaints) {
  if (!mapState.map) return;

  clearMapMarkers();

  const validComplaints = complaints.filter(function (complaint) {
    return complaint && complaint.location && Number.isFinite(complaint.location.lat) && Number.isFinite(complaint.location.lng);
  });

  validComplaints.forEach(function (complaint) {
    const marker = createComplaintMarker(complaint);
    marker.addTo(mapState.map);
    mapState.markers.push(marker);
  });

  fitMapToComplaints(validComplaints);
}

function initializeComplaintMap() {
  if (mapState.initialized && mapState.map) return;

  const bounds = [
    [18.9, 72.7],
    [19.6, 73.4],
  ];

  mapState.map = L.map('complaintMap', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).fitBounds(bounds);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapState.map);

  mapState.initialized = true;
  updateMapMarkers(filterComplaints(mockComplaints));
}

function renderDashboard() {
  const filtered = filterComplaints(mockComplaints);
  const sorted = sortComplaints(filtered);
  renderKPIs(mockComplaints);
  renderComplaints(sorted);
  updateMapMarkers(filtered);

  if (sorted.length === 0) {
    els.emptyState.classList.remove('hidden');
    els.complaintsContainer.innerHTML = '';
  } else {
    els.emptyState.classList.add('hidden');
  }
}

function bindEvents() {
  els.searchInput.addEventListener('input', function (event) {
    state.search = event.target.value;
    renderDashboard();
  });

  els.severityFilter.addEventListener('change', function (event) {
    state.severity = event.target.value;
    renderDashboard();
  });

  els.statusFilter.addEventListener('change', function (event) {
    state.status = event.target.value;
    renderDashboard();
  });

  els.departmentFilter.addEventListener('change', function (event) {
    state.department = event.target.value;
    renderDashboard();
  });

  els.sortFilter.addEventListener('change', function (event) {
    state.sortBy = event.target.value;
    renderDashboard();
  });

  els.refreshBtn.addEventListener('click', function () {
    renderDashboard();
  });

  els.closeModalBtn.addEventListener('click', function () {
    els.modal.classList.add('hidden');
  });

  els.modal.addEventListener('click', function (event) {
    const closeTrigger = event.target.getAttribute('data-close');
    if (closeTrigger === 'modal') {
      els.modal.classList.add('hidden');
    }
  });
}

bindEvents();
initializeComplaintMap();
renderDashboard();
