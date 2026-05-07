import { goTo } from '../navigation.js';
import { createGame, cancelWaiting } from '../modes/online.js';

const $ = id => document.getElementById(id);

export function initCreateGame({ boardOnline, addTouchHover }) {
  const createGameBtn = $('create-game-btn');
  const backFromWaitBtn = $('back-from-wait');
  const roomCodeSpan = $('room-code');
  const roomCodeQr = $('room-code-qr');
  const roomCodeQrWrap = $('room-code-qr-wrap');
  const showQrToggle = $('show-qr-toggle');
  const creatingStatus = $('creating-status');
  const sendLinkBtn = $('send-link-btn');

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
    }, creatingStatus.textContent ? 150 : 0);
  }

  function resetQr() {
    roomCodeQr.innerHTML = '';
    roomCodeQrWrap.classList.remove('qr-panel-open');
    if (showQrToggle) {
      showQrToggle.setAttribute('aria-expanded', 'false');
      showQrToggle.innerHTML = '<i class="fa-solid fa-qrcode"></i> Show QR Code';
    }
  }

  createGameBtn.addEventListener('click', async () => {
    roomCodeSpan.textContent = '';
    resetQr();
    setCreatingStatus('');
    currentJoinUrl = '';
    await goTo('create');
    createGame(
      code => {
        roomCodeSpan.textContent = code;
        currentJoinUrl = location.origin + location.pathname + '?join=' + encodeURIComponent(code);
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
      async () => {
        boardOnline.style.display = 'grid';
        await goTo('game');
      }
    );
  });

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

  backFromWaitBtn.addEventListener('click', async () => {
    resetQr();
    await cancelWaiting();
    await goTo('online');
  });
}