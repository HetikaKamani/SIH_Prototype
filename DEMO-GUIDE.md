# Rail Madad Demo — Quick Reference Guide

## 🚆 Project Overview

**Rail Madad** is an AI-powered railway complaint management system for Indian Railways.

- **Maitri:** Frontend (Passenger form + Officer dashboard) ✅ COMPLETE
- **Hetika:** Backend (FastAPI + YOLO + Whisper) ⏳ IN PROGRESS

---

## 🚀 Quick Start (5 minutes)

### 1. Start Server
```bash
cd c:\Users\mshah\Downloads\sih
python -m http.server 8001 --directory project/frontend
```

### 2. Open Pages
```
Tab 1 (Passenger):  http://localhost:8001/index.html
Tab 2 (Officer):    http://localhost:8001/dashboard.html
```

### 3. Demo Sequence

#### **Phase 1-3: Passenger Report a Complaint (2 min)**

1. **Form Page Opens**
   - Header: "🚆 RAIL MADAD - Report an Issue"
   - Status: "Online" (green indicator)
   - Pre-filled: PNR=4215678901, Coach=B3, Seat=42

2. **Describe Issue**
   - Click description field
   - Type: "AC water dripping from unit"
   - OR Click tag "[AC Leakage]" to auto-insert

3. **Submit & Process**
   - Click "SUBMIT COMPLAINT"
   - See "Processing Complaint..." screen
   - Watch 6-step timeline:
     ```
     ✓ Media uploaded
     ✓ Privacy protection
     ⟳ Analyzing complaint
     ⟳ Detecting issue
     ⟳ Assigning priority
     ```
   - ~6 seconds total (intentional mock delay)

4. **View Result**
   - "Complaint Submitted" ✓
   - ID: RM-1001 (auto-generated)
   - Category: Coach Maintenance
   - Issue: AC Water Leakage
   - Severity: HIGH 🔴
   - Confidence: 94%
   - Department: Electrical/Maintenance
   - Status: Pending

#### **Phase 8: Video Upload & Frame Extraction (1.5 min)**

1. **Back to Form** - Click "Back to Home"

2. **Upload Video**
   - Click "🎥 Video" tab
   - Click "Choose Video"
   - Select any MP4/WebM from your device
   - Video player appears with controls ▶️

3. **Frame Extraction**
   - Duration displays: "Duration: 1:23" (or whatever)
   - Status: "Extracting representative frame..."
   - Wait ~3 seconds
   - Status: "Frame ready for analysis" ✓
   - Extracted frame image appears below video
   - (This is the middle frame of the video)

4. **Submit with Video**
   - Fill other fields
   - Click SUBMIT
   - Processing screen NOW SHOWS:
     ```
     ✓ Media uploaded
     ✓ Video frame extracted    ← NEW STEP!
     ✓ Privacy protection
     ...
     ```

#### **Phase 5: Officer Dashboard (1.5 min)**

1. **Switch to Tab 2: Dashboard**
   - Header: "🚆 RAIL MADAD - OFFICER CONTROL ROOM"
   - Status: "SYSTEM ONLINE"

2. **View KPIs**
   ```
   ┌──────────────────────┐
   │ TOTAL: 12 │ HIGH: 4  │
   │ MEDIUM: 5 │ LOW: 3   │
   └──────────────────────┘
   ```

3. **Try Search**
   - Type "RM-1001" in search box
   - Table filters to 1 row
   - Clear search → All 12 complaints return

4. **Apply Filters**
   - Severity: HIGH
   - See only 4 red-flagged complaints
   - Severity: All
   - See all 12 again

5. **View Map**
   - Scroll to map area
   - OpenStreetMap tiles loaded
   - Red markers (HIGH)
   - Yellow markers (MEDIUM)
   - Green markers (LOW)

6. **Click Marker**
   - Click any red marker
   - Popup shows complaint info
   - Button: "View Details"

7. **Open Complaint Modal**
   - Click "View Details"
   - Large modal opens with:
     - Complaint ID, Category, Severity
     - Description
     - Coach/Seat/Train
     - Passenger info
     - AI Analysis section
     - Confidence bar (94%)
     - **Media section** - shows video + extracted frame if present
     - Status timeline
   - Close modal: Click X

#### **BONUS: Offline Mode (1 min)**

1. **Simulate Offline**
   - F12 → Network tab
   - Click dropdown → Select "Offline"
   - Refresh page

2. **Offline UI Changes**
   - Header indicator: Changes to "Offline" (red)
   - Offline banner appears: "You are offline..."
   - Pending Sync button shows: "Pending Sync: 0"

3. **Submit Offline**
   - Fill form as normal
   - Click SUBMIT
   - See: "✓ Complaint Saved Offline"
   - Local Reference: "OFFLINE-1724079234-A1B2C3"
   - Status: "Waiting for Internet"

4. **Reload Page**
   - F5 / Refresh
   - Complaint still there!
   - Shows in Pending Sync queue
   - Click "Pending Sync: 1" → See queued complaint

5. **Go Back Online**
   - Network tab → "No throttling"
   - Auto-sync triggers
   - Notification: "Complaint synced"
   - Pending Sync: 0

---

## 📱 Responsive Design Demo

### Mobile View (390px)
```
DevTools → Toggle device toolbar → iPhone 12
```
- Form stacks vertically
- No horizontal overflow
- All buttons remain clickable
- Media previews fit screen

### Tablet View (768px)
- More columns visible
- Better spacing
- Table less cramped

### Desktop View (1440px)
- Full width layout
- All features visible
- Dashboard + Map side-by-side

---

## 🔑 Key Features to Show

| Feature | Phone | Tablet | Desktop | Demo Time |
|---------|-------|--------|---------|-----------|
| Form validation | ✅ | ✅ | ✅ | 0:30 |
| Processing screen | ✅ | ✅ | ✅ | 1:00 |
| Video upload | ✅ | ✅ | ✅ | 1:30 |
| Frame extraction | ✅ | ✅ | ✅ | 2:00 |
| Dashboard search | - | ✅ | ✅ | 2:30 |
| Dashboard filters | - | ✅ | ✅ | 3:00 |
| Leaflet map | - | ✅ | ✅ | 3:30 |
| Complaint details | - | ✅ | ✅ | 4:00 |
| Offline mode | ✅ | ✅ | ✅ | 5:00 |

---

## ⚙️ Technical Notes

### Stack
- **Frontend:** Vanilla JavaScript + HTML5 + Tailwind CSS
- **Video:** Canvas API for frame extraction
- **Offline:** IndexedDB
- **Map:** Leaflet.js + OpenStreetMap
- **No frameworks:** Clean, lightweight, no dependencies

### Files
```
index.html          ← Passenger form
dashboard.html      ← Officer dashboard
app.js              ← Form logic (1000+ lines)
dashboard.js        ← Dashboard logic (1000+ lines)
video-frame.js      ← Video frame extraction utility
db.js               ← Offline storage
style.css           ← Custom styles
```

### Mock Data
- 12 sample complaints in `dashboard.js`
- Random category inference from complaint text
- Confidence: 0-100% (randomized 60-95%)
- No real backend API yet

---

## 🐛 Common Issues & Fixes

### "Please fix the highlighted fields" error
- **Cause:** Form validation triggered
- **Fix:** Fill all required fields (PNR, Coach, Seat, + description or media)
- **Check:** PNR must be exactly 10 digits

### Video won't upload
- **Cause:** Browser might not support WebM
- **Fix:** Use MP4 format
- **Note:** Tested on Chrome, Firefox, Safari, Edge

### Frame not extracting
- **Cause:** Video file too large or corrupted
- **Fix:** Try a smaller video file (<10MB)
- **Debug:** Open F12 console, look for error messages

### Map won't load
- **Cause:** Internet required for OpenStreetMap tiles
- **Fix:** Ensure online, might take 2-3 seconds
- **Debug:** Check Network tab in F12 for blocked requests

### Offline mode not working
- **Cause:** IndexedDB disabled in browser
- **Fix:** Check browser settings, enable IndexedDB
- **Debug:** F12 → Application tab → IndexedDB

---

## 📊 Demo Talking Points

### For Judges
> "Rail Madad is a complete end-to-end complaint management system. The **Maitri frontend** handles passenger complaints and officer dashboards. While Hetika is building the AI backend (YOLO + Whisper), we've implemented **Phase 8 video frame extraction** to prepare video data for future AI processing. The system works **100% offline** with automatic sync when connection returns."

### Unique Features
1. **Video Frame Extraction** - Extracts representative middle frame from video (Phase 8)
2. **Offline-First** - Complaints sync automatically when back online (IndexedDB + Service Workers ready)
3. **No Dependencies** - Pure JavaScript, no npm packages (Tailwind CDN only)
4. **Responsive** - Works on 390px phone to 1440px desktop
5. **Mock-Ready** - Full feature demo with mock data, ready for real backend

### What's NOT Here (By Design)
- ❌ Real FastAPI backend (Hetika)
- ❌ Real YOLO detection
- ❌ Real Whisper transcription  
- ❌ Real database (using localStorage + IndexedDB for demo)
- ❌ Authentication system
- ❌ Real railway APIs

**Why?** This is a hackathon prototype. Maitri focused on **responsive, working frontend**. Hetika will add **intelligent backend**.

---

## 📝 Quick Test Checklist

- [ ] Form loads
- [ ] Submit with description → Processing works
- [ ] Video upload → Frame extracts
- [ ] Dashboard loads → KPIs show correct counts
- [ ] Search filters results
- [ ] Map shows markers
- [ ] Modal opens from "View Details"
- [ ] Modal shows video + frame (if video complaint)
- [ ] Offline mode: submit → "Saved Offline"
- [ ] Offline: reload → complaint persists
- [ ] Back online: Auto-sync triggers
- [ ] Mobile (390px): No overflow, still usable
- [ ] No console errors (F12)

---

## 🎯 Presentation Timeline

**Total: 5 minutes**

```
0:00 - 0:30   Introduction & form explanation
0:30 - 1:00   Submit complaint, watch processing
1:00 - 2:00   Video upload & frame extraction  
2:00 - 3:00   Dashboard overview
3:00 - 3:30   Filters & map demo
3:30 - 4:00   Complaint details & media
4:00 - 4:30   Offline mode demo
4:30 - 5:00   Questions & summary
```

---

## 🔗 Useful Links

- **Passenger Form:** http://localhost:8001/index.html
- **Dashboard:** http://localhost:8001/dashboard.html
- **Tests:** http://localhost:8001/test-comprehensive.html
- **Implementation Report:** `IMPLEMENTATION-REPORT.md`
- **Testing Guide:** `TESTING-WALKTHROUGH.js`

---

## 📞 Support

**If something breaks during demo:**

1. Open F12 → Console
2. Check for error messages
3. Refresh page (F5)
4. Restart server
5. Force refresh (Ctrl+Shift+R)
6. Switch to offline demo (doesn't need server)

**Fallback:** Show offline mode - it works without internet!

---

## ✅ Pre-Demo Checklist

- [ ] Server running: `python -m http.server 8001 --directory project/frontend`
- [ ] Index.html loads without errors
- [ ] Dashboard loads without errors
- [ ] Mouse and keyboard responsive
- [ ] Internet enabled (for map)
- [ ] Video file ready to upload (small MP4)
- [ ] Battery charged on laptop
- [ ] Projector/screen ready

---

**Good luck! 🚀**

