(function () {
  'use strict';

  var DB_NAME = 'RailMadadDB';
  var STORE_NAME = 'complaints';
  var dbPromise = null;

  var API_CONFIG = {
    useMock: true,
    mockModeLabel: 'Development Mock API',
    apiUrl: ''
  };

  function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var request = window.indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: 'local_id' });
          store.createIndex('sync_status', 'sync_status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error || new Error('Unable to open IndexedDB.'));
      };
    });

    return dbPromise;
  }

  function getAllOfflineComplaints() {
    return initDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readonly');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.getAll();

        request.onsuccess = function () {
          var items = Array.isArray(request.result) ? request.result : [];
          items.sort(function (a, b) {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          });
          resolve(items);
        };

        request.onerror = function () {
          reject(request.error || new Error('Unable to load queued complaints.'));
        };
      });
    });
  }

  function getPendingComplaints() {
    return getAllOfflineComplaints().then(function (items) {
      return items.filter(function (item) {
        return item && (item.sync_status === 'pending' || item.sync_status === 'failed');
      });
    });
  }

  function getComplaintByLocalId(localId) {
    return initDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readonly');
        var request = transaction.objectStore(STORE_NAME).get(localId);

        request.onsuccess = function () {
          resolve(request.result || null);
        };

        request.onerror = function () {
          reject(request.error || new Error('Unable to load complaint.'));
        };
      });
    });
  }

  function saveOfflineComplaint(complaint) {
    var localId = 'offline-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
    var record = {
      local_id: localId,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_sync_attempt: null,
      last_error: null,
      complaint: complaint || {}
    };

    return initDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var request = transaction.objectStore(STORE_NAME).put(record);

        request.onsuccess = function () {
          resolve(record);
        };

        request.onerror = function () {
          reject(request.error || new Error('Unable to save complaint offline.'));
        };
      });
    });
  }

  function markComplaintSynced(localId, serverComplaint) {
    return getComplaintByLocalId(localId).then(function (record) {
      if (!record) return null;
      record.sync_status = 'synced';
      record.last_sync_attempt = new Date().toISOString();
      record.last_error = null;
      record.server_complaint_id = serverComplaint && serverComplaint.complaint_id ? serverComplaint.complaint_id : record.complaint.complaint_id;
      record.server_result = serverComplaint || null;

      return initDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var transaction = db.transaction(STORE_NAME, 'readwrite');
          var request = transaction.objectStore(STORE_NAME).put(record);

          request.onsuccess = function () {
            resolve(record);
          };

          request.onerror = function () {
            reject(request.error || new Error('Unable to mark complaint as synced.'));
          };
        });
      });
    });
  }

  function markComplaintFailed(localId, errorMessage) {
    return getComplaintByLocalId(localId).then(function (record) {
      if (!record) return null;
      record.retry_count = Number(record.retry_count || 0) + 1;
      record.sync_status = 'failed';
      record.last_sync_attempt = new Date().toISOString();
      record.last_error = errorMessage || 'Sync failed';

      return initDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var transaction = db.transaction(STORE_NAME, 'readwrite');
          var request = transaction.objectStore(STORE_NAME).put(record);

          request.onsuccess = function () {
            resolve(record);
          };

          request.onerror = function () {
            reject(request.error || new Error('Unable to update failed sync status.'));
          };
        });
      });
    });
  }

  function deleteOfflineComplaint(localId) {
    return initDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var request = transaction.objectStore(STORE_NAME).delete(localId);

        request.onsuccess = function () {
          resolve(true);
        };

        request.onerror = function () {
          reject(request.error || new Error('Unable to delete offline complaint.'));
        };
      });
    });
  }

  async function submitComplaintToServer(complaint) {
    if (!complaint) {
      throw new Error('Complaint payload is required.');
    }

    if (API_CONFIG.useMock) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          var serverComplaint = JSON.parse(JSON.stringify(complaint));
          serverComplaint.complaint_id = 'RM-DEV-' + Date.now();
          serverComplaint.status = 'Pending';
          serverComplaint._mock_sync = true;
          resolve({
            source: API_CONFIG.mockModeLabel,
            complaint: serverComplaint,
            message: 'Development mock sync completed.'
          });
        }, 700);
      });
    }

    if (!window.fetch) {
      throw new Error('Fetch API is unavailable in this browser.');
    }

    if (!API_CONFIG.apiUrl) {
      throw new Error('No backend API URL configured.');
    }

    var response = await fetch(API_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaint)
    });

    if (!response.ok) {
      throw new Error('Complaint submission failed.');
    }

    return await response.json();
  }

  window.RailMadadDB = {
    DB_NAME: DB_NAME,
    STORE_NAME: STORE_NAME,
    initDB: initDB,
    saveOfflineComplaint: saveOfflineComplaint,
    getPendingComplaints: getPendingComplaints,
    getAllOfflineComplaints: getAllOfflineComplaints,
    getComplaintByLocalId: getComplaintByLocalId,
    markComplaintSynced: markComplaintSynced,
    markComplaintFailed: markComplaintFailed,
    deleteOfflineComplaint: deleteOfflineComplaint,
    submitComplaintToServer: submitComplaintToServer,
    API_CONFIG: API_CONFIG
  };

  window.submitComplaintToServer = submitComplaintToServer;
})();
