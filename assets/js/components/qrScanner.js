export function openQrScanner({ onResult, onError }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    if (onError) onError('Camera scanning is not available. Please enter the code manually.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'qr-scanner-overlay';
  const inner = document.createElement('div');
  inner.className = 'qr-scanner-inner';
  
  const title = document.createElement('p');
  title.className = 'qr-scanner-title';
  title.textContent = 'Scan QR Code';

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'qr-scanner-video-wrap';
  
  const canvas = document.createElement('canvas');
  canvas.className = 'qr-scanner-video';
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const finder = document.createElement('div');
  finder.className = 'qr-scanner-finder';
  ['tl', 'tr', 'bl', 'br'].forEach(pos => {
    const b = document.createElement('div');
    b.className = `qr-scanner-bracket qr-scanner-bracket-${pos}`;
    finder.appendChild(b);
  });

  canvasWrap.appendChild(canvas);
  canvasWrap.appendChild(finder);

  const hint = document.createElement('p');
  hint.className = 'qr-scanner-hint';
  hint.textContent = 'Starting camera...';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'secondary-button';
  cancelBtn.textContent = 'Cancel';

  // Wire up touch hover to match the rest of the app's button behaviour
  cancelBtn.addEventListener('touchstart', () => cancelBtn.classList.add('hover'), { passive: true });
  const removeCancelHover = () => cancelBtn.classList.remove('hover');
  cancelBtn.addEventListener('touchend', removeCancelHover, { passive: true });
  cancelBtn.addEventListener('touchcancel', removeCancelHover, { passive: true });
  cancelBtn.addEventListener('touchmove', removeCancelHover, { passive: true });

  inner.appendChild(title);
  inner.appendChild(canvasWrap);
  inner.appendChild(hint);
  inner.appendChild(cancelBtn);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  const video = document.createElement('video');
  video.muted = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.style.display = 'none';
  const scanCanvas = document.createElement('canvas');
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let rafId = null;
  let stopped = false;
  let lastScanTime = 0;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    overlay.classList.remove('qr-scanner-overlay-visible');
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach(t => t.stop());
    setTimeout(() => {
      if (overlay.parentNode) document.body.removeChild(overlay);
    }, 350);
  };

  const renderFrame = (time) => {
    if (stopped) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (time - lastScanTime > 200) {
        const scanSize = 400;
        scanCanvas.width = scanSize;
        scanCanvas.height = scanSize;
        scanCtx.drawImage(video, (canvas.width - scanSize)/2, (canvas.height - scanSize)/2, scanSize, scanSize, 0, 0, scanSize, scanSize);
        
        const imageData = scanCtx.getImageData(0, 0, scanSize, scanSize);
        const result = jsQR(imageData.data, scanSize, scanSize, { inversionAttempts: 'dontInvert' });
        
        if (result) {
          stop();
          onResult(result.data);
          return;
        }
        lastScanTime = time;
      }
    }
    rafId = requestAnimationFrame(renderFrame);
  };

  cancelBtn.addEventListener('click', stop);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) stop(); });

  requestAnimationFrame(() => overlay.classList.add('qr-scanner-overlay-visible'));

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } }
  }).then(s => {
    stream = s;
    video.srcObject = s;
    video.play().then(() => {
      hint.textContent = 'Point at a QR Code';
      rafId = requestAnimationFrame(renderFrame);
    });
  }).catch(err => {
    const msg = err?.name === 'NotAllowedError'
      ? 'Camera access was denied. Please allow camera access in your browser settings.'
      : err?.name === 'NotFoundError'
      ? 'No camera found on this device.'
      : 'Could not start camera. Please enter the code manually.';
    stop();
    // Delay until after the overlay close animation (350ms) so the status
    // message fade-in doesn't race with the scanner sheet animating out
    setTimeout(() => { if (onError) onError(msg); }, 360);
  });
}