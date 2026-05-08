import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { waitForAuth } from '../core/firebase.js';
import { createGame, cancelWaiting, saveGameSession } from '../modes/online.js';

function addTouchHover(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const rem = () => el.classList.remove('hover');
    el.addEventListener('touchend', rem, { passive: true });
    el.addEventListener('touchcancel', rem, { passive: true });
    el.addEventListener('touchmove', rem, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  applySystemTheme();
  initPageFadeIn();

  const roomCodeSpan = document.getElementById('room-code');
  const roomCodeQr = document.getElementById('room-code-qr');
  const roomCodeQrWrap = document.getElementById('room-code-qr-wrap');
  const showQrToggle = document.getElementById('show-qr-toggle');
  const creatingStatus = document.getElementById('creating-status');
  const sendLinkBtn = document.getElementById('send-link-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  let currentJoinUrl = '';
  let statusTimeout = null;

  function setCreatingStatus(text, isError = false) {
    if (statusTimeout) { clearTimeout(statusTimeout); statusTimeout = null; }
    creatingStatus.style.opacity = '0';
    statusTimeout = setTimeout(() => {
      creatingStatus.textContent = text;
      creatingStatus.classList.toggle('status-error', isError);
      creatingStatus.style.opacity = '';
      statusTimeout = null;
    }, 180);
  }

  function resetQr() {
    roomCodeQr.innerHTML = '';
    roomCodeQrWrap.classList.remove('qr-panel-open');
    if (showQrToggle) {
      showQrToggle.setAttribute('aria-expanded', 'false');
      showQrToggle.innerHTML = '<i class="fa-solid fa-qrcode"></i> Show QR Code';
    }
  }

  showQrToggle?.addEventListener('click', () => {
    const open = roomCodeQrWrap.classList.toggle('qr-panel-open');
    showQrToggle.setAttribute('aria-expanded', String(open));
    showQrToggle.innerHTML = open
      ? '<i class="fa-solid fa-qrcode"></i> Hide QR Code'
      : '<i class="fa-solid fa-qrcode"></i> Show QR Code';
  });

  sendLinkBtn?.addEventListener('click', async () => {
    const url = sendLinkBtn.dataset.url || currentJoinUrl;
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Connect Four', text: 'Join my Connect Four game!', url });
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setCreatingStatus('Could not share. Try copying the link manually.', true);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        const orig = sendLinkBtn.innerHTML;
        sendLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => { sendLinkBtn.innerHTML = orig; }, 1800);
      } catch (_) {
        setCreatingStatus('Could not copy to clipboard. Link: ' + url, true);
      }
    }
  });

  cancelBtn.addEventListener('click', async () => {
    resetQr();
    await cancelWaiting();
    navigateTo('../');
  });

  try {
    await waitForAuth();
  } catch (err) {
    console.error('Auth failed:', err);
  }

  resetQr();
  setCreatingStatus('');
  currentJoinUrl = '';

  createGame(
    code => {
      roomCodeSpan.textContent = code;
      currentJoinUrl = location.origin + '/projects/connectfour/online/join-game/?code=' + encodeURIComponent(code);
      roomCodeQr.innerHTML = '';
      new QRCode(roomCodeQr, {
        text: currentJoinUrl,
        width: 148,
        height: 148,
        colorDark: '#111111',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
      if (sendLinkBtn) sendLinkBtn.dataset.url = currentJoinUrl;
      addTouchHover('#show-qr-toggle, #send-link-btn');
    },
    () => {
      saveGameSession();
      navigateTo('../game/');
    }
  );

  addTouchHover('.secondary-button, .tertiary-button');
});