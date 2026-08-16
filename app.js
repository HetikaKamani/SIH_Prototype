/* Rail Madad — app.js
 * Vanilla JS for form handling, media capture, validation, JSON generation,
 * and Phase 2 complaint processing screen with simulated timeline.
 *
 * Architecture:
 *   - Views are toggled via showView(name) — no page reloads.
 *   - Processing is handled by simulateProcessing(complaint), which is
 *     isolated so it can be replaced with processComplaintWithAPI(complaint)
 *     when Hetika's FastAPI backend is ready.
 *   - The mock result is built by buildMockResult(complaint).
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================

  // Set to true to test the error state. Keep false for normal use.
  var SIMULATE_FAILURE = false;

  // Processing step definitions (order matters)
  var PROCESSING_STEPS = [
    { id: 'media', label: 'Media uploaded' },
    { id: 'video_frame', label: 'Video frame extracted', conditional: 'video' },
    { id: 'privacy', label: 'Privacy protection' },
    { id: 'analyzing', label: 'Analyzing complaint' },
    { id: 'detecting', label: 'Detecting issue' },
    { id: 'priority', label: 'Assigning priority' },
  ];

  // Duration per step in ms (total ~6s)
  var STEP_DURATION_MS = 1200;

  // ============================================================
  // STATE
  // ============================================================

  var state = {
    photo: null,
    video: null,
    video_frame: null,
    audio: null,
    mediaRecorder: null,
    audioChunks: [],
    voiceTimerId: null,
    voiceSeconds: 0,
    complaintCounter: 1000,
    currentComplaint: null,
    processingTimerId: null,
    processingStepIndex: 0,
  };

  // ============================================================
  // DOM HELPERS
  // ============================================================

  function $(id) { return document.getElementById(id); }

  var els = {
    // Form
    pnr: $('pnr'), coach: $('coach'), seat: $('seat'),
    description: $('description'),
    errorBanner: $('errorBanner'), errorMessage: $('errorMessage'), dismissError: $('dismissError'),
    submitBtn: $('submitBtn'),
    headerSubtitle: $('headerSubtitle'),
    networkStatusPill: $('networkStatusPill'),
    networkStatusText: $('networkStatusText'),
    pendingSyncBtn: $('pendingSyncBtn'),
    pendingSyncCount: $('pendingSyncCount'),
    offlineBanner: $('offlineBanner'),
    offlineQueueModal: $('offlineQueueModal'),
    closeOfflineQueue: $('closeOfflineQueue'),
    offlineQueueList: $('offlineQueueList'),
    syncNowBtn: $('syncNowBtn'),
    // Photo
    photoInput: $('photoInput'), photoPickBtn: $('photoPickBtn'),
    photoPreview: $('photoPreview'), photoImg: $('photoImg'), photoMeta: $('photoMeta'), photoRemove: $('photoRemove'),
    // Video
    videoInput: $('videoInput'), videoPickBtn: $('videoPickBtn'),
    videoPreview: $('videoPreview'), videoPlayer: $('videoPlayer'), videoMeta: $('videoMeta'), videoReplace: $('videoReplace'),
    videoDuration: $('videoDuration'),
    frameExtractionStatus: $('frameExtractionStatus'), frameExtractionText: $('frameExtractionText'),
    framePreviewContainer: $('framePreviewContainer'), framePreview: $('framePreview'),
    // Voice
    voiceIdle: $('voiceIdle'), voiceRecording: $('voiceRecording'), voiceRecorded: $('voiceRecorded'),
    voiceRecordBtn: $('voiceRecordBtn'), voiceStopBtn: $('voiceStopBtn'), voiceRerecordBtn: $('voiceRerecordBtn'),
    voiceTimer: $('voiceTimer'), audioPlayer: $('audioPlayer'),
    // Processing
    processingComplaintId: $('processingComplaintId'),
    processingCoach: $('processingCoach'),
    processingSeat: $('processingSeat'),
    processingPnr: $('processingPnr'),
    processingSteps: $('processingSteps'),
    progressFill: $('progressFill'),
    // Result
    resultContent: $('resultContent'),
    viewComplaintDetailsBtn: $('viewComplaintDetailsBtn'),
    backToHomeBtn: $('backToHomeBtn'),
    // Error
    errorComplaintId: $('errorComplaintId'),
    tryAgainBtn: $('tryAgainBtn'),
    backToComplaintBtn: $('backToComplaintBtn'),
    // Toast
    toast: $('toast'), toastMsg: $('toastMsg'),
  };

  // ============================================================
  // VIEW NAVIGATION
  // ============================================================

  var VIEWS = ['view-form', 'view-processing', 'view-result', 'view-error'];
  var VIEW_SUBTITLES = {
    'view-form': 'Report an Issue',
    'view-processing': 'Processing',
    'view-result': 'Complaint Status',
    'view-error': 'Error',
  };

  function showView(name) {
    VIEWS.forEach(function (v) {
      var el = $(v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    if (els.headerSubtitle) els.headerSubtitle.textContent = VIEW_SUBTITLES[name] || '';
    // Scroll the visible main to top
    var main = $(name) && $(name).querySelector('main');
    if (main) main.scrollTop = 0;
  }

  // ============================================================
  // CATEGORY INFERENCE (mock)
  // ============================================================

  var CATEGORY_MAP = [
    { tags: ['ac leakage', 'ac water', 'ac dripping'], category: 'Coach Maintenance', subcategory: 'AC Water Leakage', department: 'Electrical/Maintenance', severity: 'HIGH' },
    { tags: ['cleanliness', 'dirty', 'garbage', 'waste'], category: 'Coach Maintenance', subcategory: 'Cleanliness', department: 'Sanitation', severity: 'MEDIUM' },
    { tags: ['no water', 'water', 'tap'], category: 'Coach Maintenance', subcategory: 'Water Issue', department: 'Mechanical', severity: 'MEDIUM' },
    { tags: ['electrical', 'light', 'fan', 'power', 'charging'], category: 'Coach Maintenance', subcategory: 'Electrical Fault', department: 'Electrical', severity: 'HIGH' },
    { tags: ['toilet', 'dirty toilet'], category: 'Coach Maintenance', subcategory: 'Toilet Hygiene', department: 'Sanitation', severity: 'MEDIUM' },
    { tags: ['pest', 'cockroach', 'rat', 'insect'], category: 'Coach Maintenance', subcategory: 'Pest Control', department: 'Sanitation', severity: 'LOW' },
  ];

  function inferCategory(text) {
    var lower = (text || '').toLowerCase();
    for (var i = 0; i < CATEGORY_MAP.length; i++) {
      var c = CATEGORY_MAP[i];
      for (var j = 0; j < c.tags.length; j++) {
        if (lower.indexOf(c.tags[j]) !== -1) {
          return { category: c.category, subcategory: c.subcategory, department: c.department, severity: c.severity, confidence: 0.88 + Math.random() * 0.1 };
        }
      }
    }
    return { category: 'General', subcategory: 'Other', department: 'General', severity: 'LOW', confidence: 0.72 };
  }

  // ============================================================
  // MEDIA TABS
  // ============================================================

  var tabs = ['tab-photo', 'tab-video', 'tab-voice'];
  tabs.forEach(function (tabId) {
    $(tabId).addEventListener('click', function () {
      tabs.forEach(function (t) {
        var el = $(t);
        var isSel = t === tabId;
        el.setAttribute('aria-selected', String(isSel));
        $(el.getAttribute('aria-controls')).classList.toggle('hidden', !isSel);
      });
    });
  });

  // ============================================================
  // PHOTO HANDLING
  // ============================================================

  els.photoPickBtn.addEventListener('click', function () { els.photoInput.click(); });
  els.photoInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (state.photo) URL.revokeObjectURL(state.photo.url);
    var url = URL.createObjectURL(file);
    state.photo = { file: file, url: url, name: file.name, size: file.size };
    els.photoImg.src = url;
    els.photoMeta.textContent = file.name + ' • ' + formatSize(file.size);
    els.photoPreview.classList.remove('hidden');
  });
  els.photoRemove.addEventListener('click', function () {
    if (state.photo) URL.revokeObjectURL(state.photo.url);
    state.photo = null;
    els.photoInput.value = '';
    els.photoPreview.classList.add('hidden');
  });

  // ============================================================
  // VIDEO HANDLING
  // ============================================================

  els.videoPickBtn.addEventListener('click', function () { els.videoInput.click(); });
  els.videoReplace.addEventListener('click', function () { els.videoInput.click(); });
  els.videoInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (state.video) URL.revokeObjectURL(state.video.url);
    if (state.video_frame) {
      state.video_frame.url && URL.revokeObjectURL(state.video_frame.url);
      state.video_frame = null;
    }
    var url = URL.createObjectURL(file);
    state.video = { file: file, url: url, name: file.name, size: file.size };
    els.videoPlayer.src = url;
    els.videoMeta.textContent = file.name + ' • ' + formatSize(file.size);
    els.videoPreview.classList.remove('hidden');
    els.framePreviewContainer.classList.add('hidden');
    els.frameExtractionStatus.classList.remove('hidden');

    // Get video duration
    if (window.RailMadadVideo) {
      window.RailMadadVideo.getVideoDuration(file).then(function (duration) {
        if (duration > 0) {
          els.videoDuration.textContent = 'Duration: ' + window.RailMadadVideo.formatDuration(duration);
          els.videoDuration.classList.remove('hidden');
        } else {
          els.videoDuration.classList.add('hidden');
        }
      }).catch(function () {
        els.videoDuration.classList.add('hidden');
      });

      // Extract representative frame
      window.RailMadadVideo.extractRepresentativeFrame(file, function (status) {
        if (status === 'preparing') {
          els.frameExtractionText.textContent = 'Preparing video...';
        } else if (status === 'extracting') {
          els.frameExtractionText.textContent = 'Extracting representative frame...';
        } else if (status === 'complete') {
          els.frameExtractionText.textContent = 'Frame ready for analysis';
        }
      }).then(function (frameBlob) {
        state.video_frame = { blob: frameBlob, url: URL.createObjectURL(frameBlob) };
        els.framePreview.src = state.video_frame.url;
        els.frameExtractionStatus.classList.add('hidden');
        els.framePreviewContainer.classList.remove('hidden');
        showToast('Video frame extracted');
      }).catch(function (err) {
        els.frameExtractionStatus.classList.add('hidden');
        showError('Unable to process this video. Please try another video.');
        console.error('[video-frame] Extraction failed:', err);
      });
    }
  });

  // ============================================================
  // VOICE RECORDING
  // ============================================================

  els.voiceRecordBtn.addEventListener('click', startRecording);
  els.voiceStopBtn.addEventListener('click', stopRecording);
  els.voiceRerecordBtn.addEventListener('click', function () {
    if (state.voiceTimerId) { clearInterval(state.voiceTimerId); state.voiceTimerId = null; }
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.stop();
    }
    if (state.audio) URL.revokeObjectURL(state.audio.url);
    state.audio = null;
    state.audioChunks = [];
    state.voiceSeconds = 0;
    state.mediaRecorder = null;
    els.audioPlayer.src = '';
    els.voiceRecorded.classList.add('hidden');
    els.voiceRecording.classList.add('hidden');
    els.voiceIdle.classList.remove('hidden');
    updateVoiceTimer();
  });

  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Audio recording not supported on this device');
      return;
    }
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        state.audioChunks = [];
        var mr = new MediaRecorder(stream);
        state.mediaRecorder = mr;
        mr.ondataavailable = function (e) { if (e.data.size > 0) state.audioChunks.push(e.data); };
        mr.onstop = function () {
          var blob = new Blob(state.audioChunks, { type: 'audio/webm' });
          if (blob.size === 0) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            state.audio = null;
            state.mediaRecorder = null;
            els.voiceRecording.classList.add('hidden');
            els.voiceIdle.classList.remove('hidden');
            showToast('No audio captured. Please try again.');
            return;
          }
          var url = URL.createObjectURL(blob);
          state.audio = { blob: blob, url: url, duration: state.voiceSeconds };
          els.audioPlayer.src = url;
          els.voiceRecording.classList.add('hidden');
          els.voiceRecorded.classList.remove('hidden');
          stream.getTracks().forEach(function (t) { t.stop(); });
          state.mediaRecorder = null;
        };
        mr.start();
        els.voiceIdle.classList.add('hidden');
        els.voiceRecording.classList.remove('hidden');
        state.voiceSeconds = 0;
        updateVoiceTimer();
        state.voiceTimerId = setInterval(function () {
          state.voiceSeconds++;
          updateVoiceTimer();
          if (state.voiceSeconds >= 60) stopRecording();
        }, 1000);
      })
      .catch(function () { showToast('Microphone permission denied'); });
  }

  function stopRecording() {
    if (state.voiceTimerId) { clearInterval(state.voiceTimerId); state.voiceTimerId = null; }
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.stop();
    }
  }

  function updateVoiceTimer() {
    var fmt = function (s) {
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    };
    els.voiceTimer.textContent = fmt(state.voiceSeconds) + ' / 01:00';
  }

  // ============================================================
  // QUICK TAGS
  // ============================================================

  document.querySelectorAll('.tag-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var tag = chip.getAttribute('data-tag');
      var ta = els.description;
      var insertText = (ta.value ? (ta.value.trimEnd() + ' ') : '') + '[' + tag + '] ';
      ta.value = insertText;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      chip.classList.add('active');
      setTimeout(function () { chip.classList.remove('active'); }, 600);
    });
  });

  // ============================================================
  // ERROR BANNER
  // ============================================================

  els.dismissError.addEventListener('click', function () { els.errorBanner.hidden = true; });

  function showError(msg) {
    els.errorMessage.textContent = msg;
    els.errorBanner.hidden = false;
    els.errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clearError() {
    els.errorBanner.hidden = true;
    [els.pnr, els.coach, els.seat].forEach(function (i) { i.classList.remove('input-error'); });
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  function validate() {
    clearError();
    var pnr = els.pnr.value.trim();
    var coach = els.coach.value.trim();
    var seat = els.seat.value.trim();
    var desc = els.description.value.trim();
    var hasMedia = !!(state.photo || state.video || state.audio);

    var missing = [];
    if (!pnr) missing.push(els.pnr);
    if (!coach) missing.push(els.coach);
    if (!seat) missing.push(els.seat);

    if (missing.length) {
      missing.forEach(function (i) { i.classList.add('input-error'); });
      showError('PNR, Coach, and Seat are all required.');
      missing[0].focus();
      return false;
    }
    if (!/^\d{10}$/.test(pnr)) {
      els.pnr.classList.add('input-error');
      showError('PNR must be exactly 10 digits.');
      els.pnr.focus();
      return false;
    }
    if (!desc && !hasMedia) {
      showError('Please add a description or at least one media attachment (photo, video, or voice).');
      els.description.focus();
      return false;
    }
    return true;
  }

  // ============================================================
  // COMPLAINT BUILDING
  // ============================================================

  function buildComplaint() {
    state.complaintCounter = parseInt(localStorage.getItem('railmadad_counter') || '1000', 10) + 1;
    var desc = els.description.value.trim();
    var inferred = inferCategory(desc + ' ' + (state.photo ? 'photo' : '') + ' ' + (state.video ? 'video' : ''));
    return {
      complaint_id: 'RM-' + state.complaintCounter,
      category: inferred.category,
      subcategory: inferred.subcategory,
      description: desc || '(Voice/Video complaint — no text description)',
      pnr: els.pnr.value.trim(),
      coach: els.coach.value.trim().toUpperCase(),
      seat: els.seat.value.trim(),
      train: '12951',
      severity: inferred.severity,
      confidence: Math.round(inferred.confidence * 100) / 100,
      department: inferred.department,
      status: 'Pending',
      location: { lat: 19.2437, lng: 73.1355 },
      timestamp: new Date().toISOString(),
      media_attached: {
        has_photo: !!state.photo,
        has_video: !!state.video,
        has_audio: !!state.audio,
        has_video_frame: !!(state.video && state.video_frame),
      },
      media: {
        photo: state.photo ? { url: state.photo.url, name: state.photo.name } : null,
        video: state.video ? { url: state.video.url, name: state.video.name } : null,
        video_frame: state.video_frame ? { url: state.video_frame.url } : null,
        audio: state.audio ? { url: state.audio.url, duration: state.voiceSeconds } : null,
      },
    };
  }

  // ============================================================
  // OFFLINE / SYNC HELPERS
  // ============================================================

  function updateNetworkStatus() {
    var online = navigator.onLine !== false;
    if (!els.networkStatusPill || !els.networkStatusText) return;

    els.networkStatusPill.className = 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 border transition ' + (online ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200');
    els.networkStatusText.textContent = online ? 'Online' : 'Offline';
    els.networkStatusText.className = 'text-xs font-semibold ' + (online ? 'text-emerald-700' : 'text-rose-700');

    if (els.offlineBanner) {
      els.offlineBanner.classList.toggle('hidden', online);
    }
  }

  function updatePendingSyncCount() {
    if (!window.RailMadadDB) return;
    return window.RailMadadDB.getPendingComplaints().then(function (items) {
      var count = items ? items.length : 0;
      if (els.pendingSyncCount) els.pendingSyncCount.textContent = String(count);
      if (els.pendingSyncBtn) {
        els.pendingSyncBtn.title = count > 0 ? count + ' complaints waiting to sync' : 'No complaints waiting to sync';
      }
      return count;
    }).catch(function () {
      if (els.pendingSyncCount) els.pendingSyncCount.textContent = '0';
      return 0;
    });
  }

  function getLocalReferenceLabel(complaint) {
    if (!complaint || !complaint.local_id) return 'LOCAL';
    return complaint.local_id.toUpperCase();
  }

  function showOfflineQueue() {
    if (!els.offlineQueueModal || !window.RailMadadDB) return;
    window.RailMadadDB.getAllOfflineComplaints().then(function (items) {
      if (!items || !items.length) {
        els.offlineQueueList.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No queued complaints.</div>';
        return;
      }

      els.offlineQueueList.innerHTML = items.map(function (entry) {
        var complaint = entry && entry.complaint ? entry.complaint : {};
        var label = entry && entry.local_id ? entry.local_id.toUpperCase() : 'LOCAL';
        var description = complaint.description || 'Complaint';
        var coach = complaint.coach || 'N/A';
        var seat = complaint.seat || 'N/A';
        var statusText = entry.sync_status === 'synced' ? 'Synced' : entry.sync_status === 'syncing' ? 'Syncing...' : entry.sync_status === 'failed' ? 'Sync Failed' : 'Waiting for Internet';
        return [
          '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">',
          '  <div class="flex items-center justify-between gap-2 mb-2">',
          '    <span class="text-xs font-bold uppercase tracking-wide text-indigo-700">' + escapeHtml(label) + '</span>',
          '    <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">' + escapeHtml(statusText) + '</span>',
          '  </div>',
          '  <p class="text-sm font-semibold text-slate-800">' + escapeHtml(description) + '</p>',
          '  <p class="mt-1 text-xs text-slate-500">Coach: ' + escapeHtml(coach) + ' · Seat: ' + escapeHtml(seat) + '</p>',
          '  <p class="mt-2 text-[11px] text-slate-400">Created: ' + escapeHtml((entry.created_at || '').slice(0, 16).replace('T', ' ')) + '</p>',
          '</div>'
        ].join('');
      }).join('');
    });

    els.offlineQueueModal.classList.remove('hidden');
  }

  function hideOfflineQueue() {
    if (els.offlineQueueModal) els.offlineQueueModal.classList.add('hidden');
  }

  async function syncPendingComplaints() {
    if (!window.RailMadadDB) return;
    if (!navigator.onLine) {
      showToast('No internet connection');
      return;
    }

    var items = await window.RailMadadDB.getPendingComplaints();
    if (!items || !items.length) {
      await updatePendingSyncCount();
      return;
    }

    for (var i = 0; i < items.length; i++) {
      var entry = items[i];
      if (!entry || !entry.complaint) continue;

      try {
        var result = await window.RailMadadDB.submitComplaintToServer(entry.complaint);
        var responseComplaint = result && result.complaint ? result.complaint : entry.complaint;
        await window.RailMadadDB.markComplaintSynced(entry.local_id, responseComplaint);
        showToast('Complaint synced');
      } catch (err) {
        await window.RailMadadDB.markComplaintFailed(entry.local_id, err && err.message ? err.message : 'Sync failed');
        showToast('Sync failed, retry later');
      }
    }

    await updatePendingSyncCount();
  }

  function handleOfflineSubmit(complaint) {
    if (!window.RailMadadDB) {
      throw new Error('Offline database not available.');
    }

    return window.RailMadadDB.saveOfflineComplaint(complaint).then(function (entry) {
      return entry;
    });
  }

  function renderOfflineResult(entry) {
    var complaint = entry && entry.complaint ? entry.complaint : {};
    var localRef = entry && entry.local_id ? entry.local_id.toUpperCase() : 'LOCAL';
    var resultHtml = [
      '<div class="result-success text-center">',
      '  <div class="mx-auto mb-5 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center animate-pop" aria-hidden="true">',
      '    <svg class="h-12 w-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>',
      '  </div>',
      '  <h2 class="text-xl font-extrabold text-indigo-950">✓ Complaint Saved Offline</h2>',
      '  <p class="text-sm text-slate-500 mt-2 max-w-xs">Your complaint has been saved securely on this device and will be submitted automatically when internet connection returns.</p>',
      '  <div class="mt-5 inline-flex flex-col items-center gap-2 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">',
      '    <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Local Reference</span>',
      '    <span class="text-lg font-extrabold text-indigo-950 font-mono">' + escapeHtml(localRef) + '</span>',
      '    <span class="text-xs font-semibold text-amber-700">Status: Waiting for Internet</span>',
      '  </div>',
      '</div>',
      '<section class="result-card primary-card">',
      '  <div class="card-header"><h3>Complaint Summary</h3></div>',
      '  <div class="summary-grid">',
      '    <div class="summary-item"><span>Coach</span><strong>' + escapeHtml(complaint.coach || 'Not provided') + '</strong></div>',
      '    <div class="summary-item"><span>Seat</span><strong>' + escapeHtml(complaint.seat || 'Not provided') + '</strong></div>',
      '    <div class="summary-item"><span>Train</span><strong>' + escapeHtml(complaint.train || 'Not provided') + '</strong></div>',
      '    <div class="summary-item"><span>Issue</span><strong>' + escapeHtml(complaint.subcategory || complaint.category || 'Not available') + '</strong></div>',
      '  </div>',
      '</section>',
      '<div class="tracking-note">This complaint is queued locally and will sync automatically when the connection is restored.</div>'
    ].join('');

    els.resultContent.innerHTML = resultHtml;
    els.viewComplaintDetailsBtn.disabled = true;
    els.viewComplaintDetailsBtn.setAttribute('aria-disabled', 'true');
    els.viewComplaintDetailsBtn.title = 'Offline complaint will sync when connection returns';
  }

  function initOfflineSupport() {
    if (!window.RailMadadDB) return;

    updateNetworkStatus();
    updatePendingSyncCount();

    window.addEventListener('online', function () {
      updateNetworkStatus();
      syncPendingComplaints();
    });

    window.addEventListener('offline', function () {
      updateNetworkStatus();
    });

    els.pendingSyncBtn.addEventListener('click', function () {
      showOfflineQueue();
    });

    els.closeOfflineQueue.addEventListener('click', function () {
      hideOfflineQueue();
    });

    els.syncNowBtn.addEventListener('click', function () {
      if (!navigator.onLine) {
        showToast('No internet connection');
        return;
      }
      syncPendingComplaints();
    });

    els.offlineQueueModal.addEventListener('click', function (event) {
      if (event.target === els.offlineQueueModal) hideOfflineQueue();
    });

    if (navigator.onLine) {
      syncPendingComplaints();
    }
  }

  // ============================================================
  // SUBMIT — transitions to processing view
  // ============================================================

  els.submitBtn.addEventListener('click', function () {
    if (!validate()) return;
    var complaint = buildComplaint();
    state.currentComplaint = complaint;
    console.log('Unified Complaint JSON:', complaint);

    if (!navigator.onLine) {
      handleOfflineSubmit(complaint).then(function (entry) {
        updatePendingSyncCount();
        renderOfflineResult(entry);
        showView('view-result');
        showToast('Complaint saved offline');
      }).catch(function () {
        showError('Unable to save complaint offline.');
      });
      return;
    }

    try {
      var stored = JSON.parse(localStorage.getItem('railmadad_complaints') || '[]');
      stored.push(complaint);
      localStorage.setItem('railmadad_complaints', JSON.stringify(stored));
      localStorage.setItem('railmadad_counter', String(state.complaintCounter));
    } catch (e) { /* ignore quota errors */ }

    startProcessing(complaint);
  });

  // ============================================================
  // PROCESSING SCREEN
  // ============================================================

  function startProcessing(complaint) {
    // Populate complaint summary
    els.processingComplaintId.textContent = complaint.complaint_id;
    els.processingCoach.textContent = complaint.coach;
    els.processingSeat.textContent = complaint.seat;
    els.processingPnr.textContent = complaint.pnr;

    // Filter steps based on media presence
    var filteredSteps = PROCESSING_STEPS.filter(function (step) {
      if (step.conditional === 'video') {
        return !!(complaint.media && complaint.media.video && complaint.media.video_frame);
      }
      return true;
    });

    // Build timeline DOM
    els.processingSteps.innerHTML = '';
    filteredSteps.forEach(function (step, i) {
      var li = document.createElement('li');
      li.className = 'processing-step step-waiting';
      li.setAttribute('data-step-index', String(i));
      li.innerHTML =
        '<div class="step-icon">' +
          '<svg class="step-check h-5 w-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' +
          '<span class="step-num text-sm font-bold">' + (i + 1) + '</span>' +
          '<div class="step-spinner hidden"></div>' +
        '</div>' +
        '<div class="step-content"><span class="step-label">' + step.label + '</span></div>';
      els.processingSteps.appendChild(li);
    });

    // Store filtered steps for use in simulateProcessing
    state.processingSteps = filteredSteps;
    state.processingStepCount = filteredSteps.length;

    // Initial state: step 0 = completed, step 1 = processing, rest = waiting
    state.processingStepIndex = 0;
    setStepState(0, 'completed');
    if (state.processingStepCount > 1) {
      setStepState(1, 'processing');
    }
    updateProgressBar(0);

    showView('view-processing');

    // Begin simulated processing
    simulateProcessing(complaint, filteredSteps);
  }

  function setStepState(index, status) {
    var li = els.processingSteps.querySelector('[data-step-index="' + index + '"]');
    if (!li) return;
    li.className = 'processing-step step-' + status;
    var check = li.querySelector('.step-check');
    var num = li.querySelector('.step-num');
    var spinner = li.querySelector('.step-spinner');
    check.classList.add('hidden');
    num.classList.add('hidden');
    spinner.classList.add('hidden');
    if (status === 'completed') {
      check.classList.remove('hidden');
    } else if (status === 'processing') {
      spinner.classList.remove('hidden');
    } else {
      num.classList.remove('hidden');
    }
  }

  function updateProgressBar(completedSteps) {
    var totalSteps = state.processingStepCount || PROCESSING_STEPS.length;
    var pct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    els.progressFill.style.width = pct + '%';
  }

  /**
   * Simulated processing — progresses through steps one at a time.
   *
   * To connect the real backend later, replace this entire function with:
   *
   *   async function processComplaintWithAPI(complaint) {
   *     const res = await fetch(API_URL + '/complaints', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify(complaint),
   *     });
   *     if (!res.ok) throw new Error('Processing failed');
   *     return await res.json();
   *   }
   *
   * Then call it from startProcessing() and use the returned JSON
   * to populate the result view via showResult().
   */
  function simulateProcessing(complaint, filteredSteps) {
    var steps = filteredSteps || PROCESSING_STEPS;
    var stepIndex = 1; // step 0 already completed
    var totalSteps = steps.length;

    function advance() {
      if (stepIndex >= totalSteps) {
        // All steps done
        updateProgressBar(totalSteps);
        if (SIMULATE_FAILURE) {
          showErrorView(complaint);
        } else {
          var result = buildMockResult(complaint);
          showResult(result);
        }
        return;
      }
      // Mark previous processing step as completed
      setStepState(stepIndex, 'completed');
      updateProgressBar(stepIndex);
      stepIndex++;
      if (stepIndex < totalSteps) {
        setStepState(stepIndex, 'processing');
      }
      state.processingTimerId = setTimeout(advance, STEP_DURATION_MS);
    }

    state.processingTimerId = setTimeout(advance, STEP_DURATION_MS);
  }

  function cancelProcessing() {
    if (state.processingTimerId) {
      clearTimeout(state.processingTimerId);
      state.processingTimerId = null;
    }
  }

  // ============================================================
  // MOCK RESULT
  // ============================================================

  /**
   * Builds a mock processing result using the SAME unified JSON structure
   * agreed with the backend team. This is ONLY for frontend development.
   *
   * When the real FastAPI backend is ready, this function is no longer
   * needed — the result JSON will come from processComplaintWithAPI().
   */
  function buildMockResult(complaint) {
    var inferred = inferCategory(complaint.description);
    return {
      complaint_id: complaint.complaint_id,
      category: inferred.category,
      subcategory: inferred.subcategory,
      description: complaint.description,
      coach: complaint.coach,
      seat: complaint.seat,
      train: complaint.train || '12951',
      severity: complaint.severity || inferred.severity,
      confidence: typeof complaint.confidence === 'number' ? complaint.confidence : (Math.round(inferred.confidence * 100) / 100),
      department: complaint.department || inferred.department,
      status: complaint.status || 'Pending',
      location: complaint.location || { lat: 19.2437, lng: 73.1355 },
      timestamp: new Date().toISOString(),
      media_attached: complaint.media_attached || {
        has_photo: !!(complaint.media && complaint.media.photo),
        has_video: !!(complaint.media && complaint.media.video),
        has_audio: !!(complaint.media && complaint.media.audio),
      },
      media: complaint.media || {
        photo: null,
        video: null,
        audio: null,
      },
    };
  }

  // ============================================================
  // RESULT VIEW (Phase 3)
  // ============================================================

  function normalizeStatus(status) {
    var value = (status || 'Pending').toString().trim();
    if (!value) return 'Pending';
    var lower = value.toLowerCase();
    if (lower === 'in progress' || lower === 'in_progress' || lower === 'progress') return 'In Progress';
    if (lower === 'resolved' || lower === 'complete' || lower === 'completed') return 'Resolved';
    return 'Pending';
  }

  function normalizeSeverity(severity) {
    var value = (severity || 'MEDIUM').toString().trim().toUpperCase();
    if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value;
    return 'MEDIUM';
  }

  function formatConfidence(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    var normalized = value;
    if (normalized > 1) normalized = normalized / 100;
    var pct = Math.max(0, Math.min(100, Math.round(normalized * 100)));
    return pct + '%';
  }

  function renderDecisionBar(pct) {
    var filled = Math.max(0, Math.min(100, pct || 0));
    var blocks = 20;
    var filledBlocks = Math.round((filled / 100) * blocks);
    return '<div class="confidence-bar" aria-label="AI confidence ' + filled + '%"><span class="confidence-fill" style="width: ' + filled + '%"></span></div>' +
      '<div class="confidence-label">' + filled + '%</div>';
  }

  function renderComplaintResult(complaint) {
    var safeComplaint = complaint || {};
    var severity = normalizeSeverity(safeComplaint.severity);
    var status = normalizeStatus(safeComplaint.status);
    var department = safeComplaint.department || 'Not assigned yet';
    var confidencePct = formatConfidence(safeComplaint.confidence);
    var location = safeComplaint.location && (
      typeof safeComplaint.location.lat !== 'undefined' || typeof safeComplaint.location.lng !== 'undefined'
    ) ? safeComplaint.location : null;
    var hasPhoto = !!((safeComplaint.media && safeComplaint.media.photo && safeComplaint.media.photo.url) || (safeComplaint.media_attached && safeComplaint.media_attached.has_photo));
    var hasVideo = !!((safeComplaint.media && safeComplaint.media.video && safeComplaint.media.video.url) || (safeComplaint.media_attached && safeComplaint.media_attached.has_video));
    var hasAudio = !!((safeComplaint.media && safeComplaint.media.audio && safeComplaint.media.audio.url) || (safeComplaint.media_attached && safeComplaint.media_attached.has_audio));
    var confidenceValue = typeof safeComplaint.confidence === 'number' ? safeComplaint.confidence : null;
    var confidenceBar = confidenceValue !== null ? renderDecisionBar(Math.round(confidenceValue * 100)) : '';

    var complaintId = safeComplaint.complaint_id || 'N/A';
    var category = safeComplaint.category || 'Not available';
    var subcategory = safeComplaint.subcategory || null;
    var issue = safeComplaint.subcategory || safeComplaint.category || 'Not available';
    var description = safeComplaint.description || 'No description provided';
    var coach = safeComplaint.coach || 'Not provided';
    var seat = safeComplaint.seat || 'Not provided';
    var train = safeComplaint.train || 'Not provided';

    var severityClass = 'severity-' + severity.toLowerCase();
    var statusClass = 'status-' + status.toLowerCase().replace(/\s+/g, '-');

    var aiAnalysisMarkup = '';
    if (safeComplaint.category || safeComplaint.subcategory || confidenceValue !== null || safeComplaint.description) {
      aiAnalysisMarkup = [
        safeComplaint.category ? '<div class="detail-row"><span>Category</span><strong>' + escapeHtml(safeComplaint.category) + '</strong></div>' : '',
        safeComplaint.subcategory ? '<div class="detail-row"><span>Subcategory</span><strong>' + escapeHtml(safeComplaint.subcategory) + '</strong></div>' : '',
        confidenceValue !== null ? '<div class="detail-row"><span>AI Confidence</span><strong>' + escapeHtml(formatConfidence(confidenceValue)) + '</strong></div>' : '',
        safeComplaint.subcategory ? '<div class="detail-row"><span>Detected issue</span><strong>' + escapeHtml(safeComplaint.subcategory) + '</strong></div>' : '',
        safeComplaint.description ? '<div class="detail-row"><span>Description</span><strong>' + escapeHtml(safeComplaint.description) + '</strong></div>' : ''
      ].join('');
    }

    var mediaMarkup = '';
    if (hasPhoto && safeComplaint.media && safeComplaint.media.photo && safeComplaint.media.photo.url) {
      mediaMarkup += '<section class="result-card"><h3>Submitted Photo</h3><img src="' + safeComplaint.media.photo.url + '" alt="Submitted complaint photo" class="media-preview" /></section>';
    }
    if (hasAudio && safeComplaint.media && safeComplaint.media.audio && safeComplaint.media.audio.url) {
      mediaMarkup += '<section class="result-card"><h3>Voice Complaint</h3><audio controls class="w-full mt-2"><source src="' + safeComplaint.media.audio.url + '" /></audio></section>';
    }
    if (hasVideo && safeComplaint.media && safeComplaint.media.video && safeComplaint.media.video.url) {
      mediaMarkup += '<section class="result-card"><h3>Submitted Video</h3><video controls class="media-preview media-video"><source src="' + safeComplaint.media.video.url + '" /></video></section>';
    }

    var locationMarkup = '';
    if (location) {
      locationMarkup = '<section class="result-card"><h3>Location</h3><p class="status-value">' + escapeHtml((location.lat !== undefined ? location.lat : '') + ', ' + (location.lng !== undefined ? location.lng : '')) + '</p></section>';
    }

    var resultHtml = [
      '<div class="result-success text-center">',
      '  <div class="mx-auto mb-5 h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center animate-pop" aria-hidden="true">',
      '    <svg class="h-12 w-12 text-emerald-600 animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>',
      '  </div>',
      '  <h2 class="text-xl font-extrabold text-indigo-950">✓ Complaint Submitted</h2>',
      '  <p class="text-sm text-slate-500 mt-2 max-w-xs">Your complaint has been successfully processed.</p>',
      '  <div class="mt-5 inline-flex items-center gap-2 bg-indigo-50 rounded-lg px-4 py-2.5 flex-wrap justify-center">',
      '    <span class="text-xs font-semibold text-slate-500">Complaint ID</span>',
      '    <span id="resultComplaintId" class="text-base font-extrabold text-indigo-950 font-mono">' + escapeHtml(complaintId) + '</span>',
      '    <button id="copyComplaintIdBtn" type="button" class="copy-btn" aria-label="Copy complaint ID">Copy</button>',
      '  </div>',
      '</div>',
      '<section class="result-card primary-card">',
      '  <div class="card-header"><h3>Complaint Summary</h3></div>',
      '  <div class="summary-grid">',
      '    <div class="summary-item"><span>Category</span><strong>' + escapeHtml(category) + '</strong></div>',
      '    <div class="summary-item"><span>Issue</span><strong>' + escapeHtml(issue) + '</strong></div>',
      '    <div class="summary-item summary-full"><span>Description</span><strong>' + escapeHtml(description) + '</strong></div>',
      '    <div class="summary-item"><span>Coach</span><strong>' + escapeHtml(coach) + '</strong></div>',
      '    <div class="summary-item"><span>Seat</span><strong>' + escapeHtml(seat) + '</strong></div>',
      '    <div class="summary-item"><span>Train</span><strong>' + escapeHtml(train) + '</strong></div>',
      '    <div class="summary-item"><span>Complaint ID</span><strong>' + escapeHtml(complaintId) + '</strong></div>',
      '  </div>',
      '</section>',
      '<section class="result-card">',
      '  <div class="card-header"><h3>Severity</h3></div>',
      '  <div class="severity-badge ' + severityClass + '" aria-label="Severity ' + severity + '">',
      '    <span class="severity-icon">' + getSeverityIcon(severity) + '</span><span>' + severity + '</span>',
      '  </div>',
      '</section>',
      (confidenceValue !== null ? '<section class="result-card"><div class="card-header"><h3>AI Confidence</h3></div><p class="score-value">' + escapeHtml(formatConfidence(confidenceValue)) + '</p>' + confidenceBar + '</section>' : ''),
      '<section class="result-card"><div class="card-header"><h3>Assigned Department</h3></div><p class="status-value">' + escapeHtml(department) + '</p></section>',
      '<section class="result-card"><div class="card-header"><h3>Status</h3></div><span class="status-badge ' + statusClass + '">' + status + '</span></section>',
      '<details class="result-card details-card" open>',
      '  <summary>AI Analysis</summary>',
      '  <div class="details-body">' + (aiAnalysisMarkup || '<p class="muted">No AI analysis details were returned.</p>') + '</div>',
      '</details>',
      mediaMarkup,
      locationMarkup,
      '<div class="tracking-note">You can use your Complaint ID to track the status of this complaint.</div>'
    ].join('');

    els.resultContent.innerHTML = resultHtml;
    var copyBtn = document.getElementById('copyComplaintIdBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyComplaintId(complaintId);
      });
    }
    els.viewComplaintDetailsBtn.disabled = true;
    els.viewComplaintDetailsBtn.setAttribute('aria-disabled', 'true');
    els.viewComplaintDetailsBtn.title = 'Phase 5 detail view coming soon';
  }

  function getSeverityIcon(severity) {
    if (severity === 'HIGH') return '🔴';
    if (severity === 'LOW') return '🟢';
    return '🟠';
  }

  function escapeHtml(value) {
    var safe = String(value ?? '');
    return safe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function copyComplaintId(value) {
    var text = value || 'N/A';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Complaint ID copied');
      }).catch(function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Complaint ID copied');
    } catch (e) {
      showToast('Copy unavailable');
    }
    document.body.removeChild(textArea);
  }

  function showResult(result) {
    var complaint = result || JSON.parse(localStorage.getItem('railmadad_latest_result') || 'null');
    if (!complaint) {
      showView('view-form');
      return;
    }
    localStorage.setItem('railmadad_latest_result', JSON.stringify(complaint));
    state.currentComplaint = complaint;
    renderComplaintResult(complaint);
    showView('view-result');
  }

  els.viewComplaintDetailsBtn.addEventListener('click', function () {
    showToast('Complaint details are coming in Phase 5');
  });

  els.backToHomeBtn.addEventListener('click', function () {
    resetForm();
    showView('view-form');
  });

  // ============================================================
  // ERROR VIEW
  // ============================================================

  function showErrorView(complaint) {
    cancelProcessing();
    els.errorComplaintId.textContent = complaint.complaint_id;
    showView('view-error');
  }

  els.tryAgainBtn.addEventListener('click', function () {
    if (state.currentComplaint) {
      startProcessing(state.currentComplaint);
    } else {
      showView('view-form');
    }
  });

  els.backToComplaintBtn.addEventListener('click', function () {
    cancelProcessing();
    showView('view-form');
  });

  // ============================================================
  // FORM RESET
  // ============================================================

  function resetForm() {
    els.description.value = '';
    if (state.photo) { URL.revokeObjectURL(state.photo.url); state.photo = null; els.photoInput.value = ''; els.photoPreview.classList.add('hidden'); }
    if (state.video) { URL.revokeObjectURL(state.video.url); state.video = null; els.videoInput.value = ''; els.videoPreview.classList.add('hidden'); els.videoPlayer.src = ''; }
    if (state.video_frame) { state.video_frame.url && URL.revokeObjectURL(state.video_frame.url); state.video_frame = null; els.framePreview.src = ''; els.framePreviewContainer.classList.add('hidden'); els.frameExtractionStatus.classList.add('hidden'); }
    if (state.audio) { URL.revokeObjectURL(state.audio.url); state.audio = null; els.audioPlayer.src = ''; els.voiceRecorded.classList.add('hidden'); els.voiceIdle.classList.remove('hidden'); }
    clearError();
    els.pnr.value = '4215678901';
    els.coach.value = 'B3';
    els.seat.value = '42';
    state.currentComplaint = null;
  }

  // ============================================================
  // TOAST
  // ============================================================

  var toastTimer = null;
  function showToast(msg) {
    els.toastMsg.textContent = msg;
    els.toast.classList.remove('hidden');
    els.toast.classList.add('animate-toast');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.add('hidden');
      els.toast.classList.remove('animate-toast');
    }, 2000);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ============================================================
  // INIT
  // ============================================================

  var savedCounter = localStorage.getItem('railmadad_counter');
  if (savedCounter) state.complaintCounter = parseInt(savedCounter, 10);
  initOfflineSupport();
  showView('view-form');
})();
