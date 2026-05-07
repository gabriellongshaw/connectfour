import { goTo } from '../navigation.js';
import { joinGame } from '../modes/online.js';
import { openQrScanner } from '../components/qrScanner.js';

const $ = id => document.getElementById(id);

export function initJoinGame({ boardOnline, getAuthReady }) {
  const showJoinBtn = $('show-join-btn');
  const joinGameBtn = $('join-game-btn');
  const joinCodeInput = $('join-code-input');
  const backFromJoinBtn = $('back-from-join');
  const joinStatus = $('join-status');
  const qrStatus = $('qr-status');
  const scanQrBtn = $('scan-qr-btn');

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

  function resetJoin() {
    joinCodeInput.value = '';
    applyStatus(joinStatus, 'join', '', false);
    applyStatus(qrStatus, 'qr', '', false);
  }

  showJoinBtn.addEventListener('click', async () => {
    resetJoin();
    await goTo('join');
  });

  joinGameBtn.addEventListener('click', async () => {
    if (!getAuthReady()) { setJoinStatus('Connecting\u2026 please wait.'); return; }
    const code = joinCodeInput.value.trim().toUpperCase();
    joinCodeInput.value = code;
    joinGame(code, async () => {
      boardOnline.style.display = 'grid';
      await goTo('game');
    }, text => { setJoinStatus(text); });
  });

  joinCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') joinGameBtn.click();
  });

  backFromJoinBtn.addEventListener('click', async () => {
    resetJoin();
    await goTo('online');
  });

  scanQrBtn?.addEventListener('click', () => {
    openQrScanner({
      onResult: data => {
        let code;
        try {
          const url = new URL(data);
          code = url.searchParams.get('join') || data;
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
}
