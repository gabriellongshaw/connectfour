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

  function resetJoin() {
    joinCodeInput.value = '';
    joinStatus.textContent = '';
  }

  showJoinBtn.addEventListener('click', async () => {
    resetJoin();
    await goTo('join');
  });

  joinGameBtn.addEventListener('click', async () => {
    if (!getAuthReady()) { joinStatus.textContent = 'Connecting\u2026 please wait.'; return; }
    const code = joinCodeInput.value.trim().toUpperCase();
    joinCodeInput.value = code;
    joinStatus.textContent = '';
    joinGame(code, async () => {
      boardOnline.style.display = 'grid';
      await goTo('game');
    }, text => { joinStatus.textContent = text; });
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
        joinStatus.textContent = '';
      },
      onError: msg => {
        joinStatus.textContent = msg;
      },
    });
  });
}