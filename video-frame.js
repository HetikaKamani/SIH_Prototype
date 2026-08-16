/* Rail Madad — video-frame.js
 * Video frame extraction utility for Phase 8
 * 
 * Handles:
 * - Loading video metadata
 * - Calculating representative timestamp (middle of video)
 * - Extracting frame to canvas
 * - Converting frame to Blob
 * - Error handling
 */

(function () {
  'use strict';

  /**
   * Extract a representative frame from a video file.
   * Uses the middle of the video as the representative timestamp.
   * 
   * @param {File} videoFile - The selected video file
   * @param {Function} onProgress - Optional callback for progress states
   *                                onProgress('preparing') -> onProgress('extracting') -> onProgress('complete')
   * @returns {Promise<Blob>} A blob representing the extracted frame as a JPEG image
   */
  async function extractRepresentativeFrame(videoFile, onProgress) {
    if (!videoFile) {
      throw new Error('Video file is required.');
    }

    if (!(videoFile instanceof Blob || videoFile instanceof File)) {
      throw new Error('Invalid video file provided.');
    }

    // Check file size — warn if over 50MB
    var MAX_WARN_SIZE = 50 * 1024 * 1024;
    if (videoFile.size > MAX_WARN_SIZE) {
      console.warn('[video-frame] Large video file: ' + (videoFile.size / (1024 * 1024)).toFixed(1) + ' MB');
    }

    if (onProgress) onProgress('preparing');

    return new Promise(function (resolve, reject) {
      // Create a temporary object URL for the video
      var videoUrl = URL.createObjectURL(videoFile);
      var video = document.createElement('video');
      video.style.display = 'none';
      video.src = videoUrl;
      video.preload = 'metadata';

      // Handle metadata load
      var timeoutId = setTimeout(function () {
        cleanup();
        reject(new Error('Video metadata failed to load. Please try another video.'));
      }, 10000);

      video.addEventListener('loadedmetadata', function onMetadataLoaded() {
        clearTimeout(timeoutId);
        video.removeEventListener('loadedmetadata', onMetadataLoaded);

        try {
          var duration = video.duration;
          if (!Number.isFinite(duration) || duration <= 0) {
            throw new Error('Invalid video duration.');
          }

          // Calculate representative timestamp: middle of the video
          var timestamp = Math.min(duration / 2, Math.max(duration - 0.1, 0));

          // Seek to the timestamp
          video.currentTime = timestamp;

          if (onProgress) onProgress('extracting');

          // Handle the seek complete
          var seekHandler = function onSeeked() {
            video.removeEventListener('seeked', seekHandler);
            clearTimeout(timeoutId);

            try {
              // Draw the frame to canvas
              var canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              if (canvas.width <= 0 || canvas.height <= 0) {
                throw new Error('Unable to determine video dimensions.');
              }

              var ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Canvas context not available.');
              }

              ctx.drawImage(video, 0, 0);

              // Convert canvas to blob
              canvas.toBlob(
                function onCanvasBlob(blob) {
                  if (onProgress) onProgress('complete');
                  cleanup();
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Unable to extract frame from video.'));
                  }
                },
                'image/jpeg',
                0.85
              );
            } catch (err) {
              cleanup();
              reject(err || new Error('Frame extraction failed.'));
            }
          };

          video.addEventListener('seeked', seekHandler);
        } catch (err) {
          cleanup();
          reject(err || new Error('Metadata processing failed.'));
        }
      });

      video.addEventListener('error', function onVideoError() {
        clearTimeout(timeoutId);
        video.removeEventListener('error', onVideoError);
        cleanup();
        reject(new Error('Unable to load video. Please try another file.'));
      });

      // Append to DOM temporarily (required for some browsers to process video)
      document.body.appendChild(video);

      function cleanup() {
        if (video.parentNode) {
          document.body.removeChild(video);
        }
        URL.revokeObjectURL(videoUrl);
      }
    });
  }

  /**
   * Get the video duration in seconds.
   * Useful for displaying duration to the user.
   * 
   * @param {File} videoFile - The selected video file
   * @returns {Promise<number>} Duration in seconds, or -1 if unavailable
   */
  function getVideoDuration(videoFile) {
    if (!videoFile || !(videoFile instanceof Blob || videoFile instanceof File)) {
      return Promise.reject(new Error('Invalid video file.'));
    }

    return new Promise(function (resolve) {
      var videoUrl = URL.createObjectURL(videoFile);
      var video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'metadata';

      var timeoutId = setTimeout(function () {
        cleanup();
        resolve(-1); // Duration unavailable
      }, 5000);

      video.addEventListener('loadedmetadata', function () {
        clearTimeout(timeoutId);
        var duration = Number.isFinite(video.duration) ? video.duration : -1;
        cleanup();
        resolve(duration);
      });

      video.addEventListener('error', function () {
        clearTimeout(timeoutId);
        cleanup();
        resolve(-1);
      });

      document.body.appendChild(video);

      function cleanup() {
        if (video.parentNode) {
          document.body.removeChild(video);
        }
        URL.revokeObjectURL(videoUrl);
      }
    });
  }

  /**
   * Format duration in seconds to a human-readable string.
   * 
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration like "1:23" or "0:45"
   */
  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return 'Unknown';
    }
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + String(secs).padStart(2, '0');
  }

  // Export to window
  window.RailMadadVideo = {
    extractRepresentativeFrame: extractRepresentativeFrame,
    getVideoDuration: getVideoDuration,
    formatDuration: formatDuration
  };
})();
