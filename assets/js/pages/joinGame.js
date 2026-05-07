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
  const scanQrBtn = $('scan-qr-btn');

  // Info messages: neutral styling. Error messages: red styling.
  const ERROR_MESSAGES = new Set([
    'Game not found. Check the code and try again.',
    'You created this game — share the code with a friend!',
    'This game already has two players.',
    'This game has already ended.',
    'Error joining game. Please try again.',
    'Please enter a room code.',
    'Camera scanning is not available. Please enter the code manually.',
    'Camera access was denied. Please allow camera access in your browser settings.',
    'No camera found on this device.',
    'Could not start camera. Please enter the code manually.',
  ]);

  function setJoinStatus(text) {
    joinStatus.textContent = text;
    if (!text) {
      joinStatus.classList.remove('status-error');
    } else if (ERROR_MESSAGES.has(text)) {
      joinStatus.classList.add('status-error');
    } else {
      joinStatus.classList.remove('status-error');
    }
  }

  function resetJoin() {
    joinCodeInput.value = '';
    setJoinStatus('');
  }

  showJoinBtn.addEventListener('click', async () => {
    resetJoin();
    await goTo('join');
  });

  joinGameBtn.addEventListener('click', async () => {
    if (!getAuthReady()) { setJoinStatus('Connecting\u2026 please wait.'); return; }
    const code = joinCodeInput.value.trim().toUpperCase();
    joinCodeInput.value = code;
    setJoinStatus('');
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
        setJoinStatus('');
      },
      onError: msg => {
        setJoinStatus(msg);
      },
    });
  });
}