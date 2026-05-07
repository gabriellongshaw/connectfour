export function openQrScanner({ onResult, onError }) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const msg = location.protocol !== 'https:' && location.hostname !== 'localhost'
      ? 'Camera scanning requires HTTPS. Enter the code above instead.'
      : "Your browser doesn't support camera access. Try Safari or Chrome, or enter the code above.";
    if (onError) onError(msg);
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'qr-scanner-overlay';
  const inner = document.createElement('div');
  inner.className = 'qr-scanner-inner';
  const handle = document.createElement('div');
  handle.className = 'qr-scanner-handle';
  handle.setAttribute('aria-label', 'Drag to close');
  const title = document.createElement('p');
  title.className = 'qr-scanner-title';
  title.textContent = 'Scan QR Code';
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'qr-scanner-video-wrap';
  const displayCanvas = document.createElement('canvas');
  displayCanvas.className = 'qr-scanner-video';
  const finder = document.createElement('div');
  finder.className = 'qr-scanner-finder';
  ['tl', 'tr', 'bl', 'br'].forEach(pos => {
    const b = document.createElement('div');
    b.className = `qr-scanner-bracket qr-scanner-bracket-${pos}`;
    finder.appendChild(b);
  });

  canvasWrap.appendChild(displayCanvas);
  canvasWrap.appendChild(finder);

  const hint = document.createElement('p');
  hint.className = 'qr-scanner-hint';
  hint.textContent = 'Starting camera\u2026';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'secondary-button';
  cancelBtn.textContent = 'Cancel';

  inner.appendChild(handle);
  inner.appendChild(title);
  inner.appendChild(canvasWrap);
  inner.appendChild(hint);
  inner.appendChild(cancelBtn);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('qr-scanner-overlay-visible'));
  });

  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');

  const scanCanvas = document.createElement('canvas');
  const scanCtx = scanCanvas.getContext('2d');
  const displayCtx = displayCanvas.getContext('2d');

  let stream = null;
  let rafId = null;
  let stopped = false;
  const removeOverlay = () => {
    if (overlay.parentNode) document.body.removeChild(overlay);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;

    overlay.classList.remove('qr-scanner-overlay-visible');
    inner.style.transform = 'translateY(100%)';
    const fallback = setTimeout(removeOverlay, 500);
    inner.addEventListener('transitionend', () => {
      clearTimeout(fallback);
      removeOverlay();
    }, { once: true });
  };

  cancelBtn.addEventListener('click', stop);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) stop();
  });

  let dragStartY = 0;
  let dragCurrentY = 0;
  let isDragging = false;

  const onDragStart = e => {
    if (stopped) return;
    isDragging = true;
    dragStartY = e.touches ? e.touches[0].clientY : e.clientY;
    dragCurrentY = dragStartY;
    inner.style.transition = 'none';
  };

  const onDragMove = e => {
    if (!isDragging || stopped) return;
    dragCurrentY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, dragCurrentY - dragStartY);
    inner.style.transform = `translateY(${delta}px)`;
    const progress = Math.min(delta / 300, 1);
    overlay.style.background = `rgba(0,0,0,${0.88 * (1 - progress)})`;
  };

  const onDragEnd = () => {
    if (!isDragging || stopped) return;
    isDragging = false;
    const delta = Math.max(0, dragCurrentY - dragStartY);
    inner.style.transition = '';
    if (delta > 120) {
      stop();
    } else {
      inner.style.transform = 'translateY(0)';
      overlay.style.background = '';
    }
  };
  
  [handle, title].forEach(el => {
    el.addEventListener('touchstart', onDragStart, { passive: true });
    el.addEventListener('mousedown', onDragStart);
  });
  window.addEventListener('touchmove', onDragMove, { passive: true });
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('touchend', onDragEnd);
  window.addEventListener('mouseup', onDragEnd);

  const scanFrame = () => {
    if (stopped) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      scanCanvas.width = w;
      scanCanvas.height = h;
      scanCtx.drawImage(video, 0, 0);

      displayCanvas.width = displayCanvas.offsetWidth || 280;
      displayCanvas.height = displayCanvas.offsetHeight || 280;
      displayCtx.drawImage(video, 0, 0, displayCanvas.width, displayCanvas.height);

      const imageData = scanCtx.getImageData(0, 0, w, h);
      const result = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (result?.data) {
        stop();
        onResult(result.data);
        return;
      }
    }
    rafId = requestAnimationFrame(scanFrame);
  };

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
  })
    .then(s => {
      if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      video.srcObject = s;
      hint.textContent = 'Point the QR code at the camera';
      video.addEventListener('loadedmetadata', () => { rafId = requestAnimationFrame(scanFrame); }, { once: true });
    })
    .catch(err => {
      stop();
      const msgs = {
        NotAllowedError: 'Camera permission denied \u2014 allow camera access in your browser settings, or enter the code above.',
        PermissionDeniedError: 'Camera permission denied \u2014 allow camera access in your browser settings, or enter the code above.',
        NotFoundError: 'No camera found on this device. Enter the code above.',
        DevicesNotFoundError: 'No camera found on this device. Enter the code above.',
        NotReadableError: 'Camera is in use by another app. Close it and try again, or enter the code above.',
        TrackStartError: 'Camera is in use by another app. Close it and try again, or enter the code above.',
        OverconstrainedError: "Camera doesn't meet requirements. Enter the code above.",
        SecurityError: 'Camera blocked \u2014 this page must be served over HTTPS. Enter the code above.',
      };
      if (onError) onError(msgs[err.name] || ('Camera error: ' + (err.message || err.name) + '. Enter the code above.'));
    });
}