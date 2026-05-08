import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { waitForAuth } from '../core/firebase.js';
import { joinGame, saveGameSession } from '../modes/online.js';
import { openQrScanner } from '../components/qrScanner.js';

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

  const joinCodeInput = document.getElementById('join-code-input');
  const joinGameBtn = document.getElementById('join-game-btn');
  const joinStatus = document.getElementById('join-status');
  const qrStatus = document.getElementById('qr-status');
  const scanQrBtn = document.getElementById('scan-qr-btn');
  const backBtn = document.getElementById('back-btn');

  const JOIN_ERRORS = new Set([
    'Game not found. Check the code and try again.',
    'You created this game — share the code with a friend!',
    'This game already has two players.',
    'This game has already ended.',
    'Error joining game. Please try again.',
    'Please enter a room code.',
  ]);

  const QR_ERRORS = new Set([
    'Camera scanning is not available. Please enter the code manually.',
    'Camera access was denied. Please allow camera access in your browser settings.',
    'No camera found on this device.',
    'Could not start camera. Please enter the code manually.',
  ]);

  const timeouts = { join: null, qr: null };

  function applyStatus(el, key, text, isError) {
    if (timeouts[key]) { clearTimeout(timeouts[key]); timeouts[key] = null; }
    el.style.opacity = '0';
    timeouts[key] = setTimeout(() => {
      el.textContent = text;
      el.classList.toggle('status-error', isError);
      el.style.opacity = '';
      timeouts[key] = null;
    }, 180);
  }

  function setJoinStatus(text) {
    applyStatus(qrStatus, 'qr', '', false);
    applyStatus(joinStatus, 'join', text, JOIN_ERRORS.has(text));
  }

  function setQrStatus(text) {
    applyStatus(joinStatus, 'join', '', false);
    applyStatus(qrStatus, 'qr', text, QR_ERRORS.has(text));
  }

  let authReady = false;

  try {
    await waitForAuth();
    authReady = true;
  } catch (err) {
    console.error('Auth failed:', err);
  }

  const params = new URLSearchParams(location.search);
  const codeParam = params.get('code');
  if (codeParam) {
    joinCodeInput.value = codeParam.trim().toUpperCase();
    history.replaceState({}, document.title, location.pathname);
  }

  joinGameBtn.addEventListener('click', () => {
    if (!authReady) { setJoinStatus('Connecting\u2026 please wait.'); return; }
    const code = joinCodeInput.value.trim().toUpperCase();
    joinCodeInput.value = code;
    joinGame(code, () => {
      saveGameSession();
      navigateTo('../game/');
    }, text => { setJoinStatus(text); });
  });

  joinCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') joinGameBtn.click();
  });

  backBtn.addEventListener('click', () => navigateTo('../'));

  scanQrBtn?.addEventListener('click', () => {
    openQrScanner({
      onResult: data => {
        let code;
        try {
          const url = new URL(data);
          code = url.searchParams.get('code') || url.searchParams.get('join') || data;
        } catch (_) {
          code = data;
        }
        joinCodeInput.value = code.trim().toUpperCase();
        joinCodeInput.focus();
        setQrStatus('');
      },
      onError: msg => {
        setQrStatus(msg);
      },
    });
  });

  addTouchHover('.button, .secondary-button, .tertiary-button');
});