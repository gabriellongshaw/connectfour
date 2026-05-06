import { applySystemTheme } from './core/theme.js';
import { difficultyIcons } from './core/icons.js';
import { fadeIn, fadeOut } from './core/utils.js';
import { waitForAuth } from './core/firebase.js';
import { initConfetti, resizeConfetti, stopConfetti } from './components/confetti.js';
import { initOfflineRefs, startOfflineGame, handleOfflineMove, restartOfflineGame, clearOfflineBoard } from './modes/offline.js';
import {
  initOnlineRefs, createGame, joinGame, handleOnlineMove,
  requestOnlineRestart, leaveOnlineGame, cancelWaiting, clearOnlineBoard
} from './modes/online.js';
import {
  initBotRefs, setBotDifficulty, startBotGame, handleBotMove,
  restartBotGame, resetBotLeaderboard, clearBotBoard
} from './modes/bot.js';

const $ = id => document.getElementById(id);

const pages = {
  home: $('page-home'),
  offline: $('page-offline'),
  botDifficulty: $('page-bot-difficulty'),
  bot: $('page-bot'),
  online: $('page-online'),
  create: $('page-create'),
  join: $('page-join'),
  game: $('page-game'),
};

const playOfflineBtn = $('play-offline');
const playBotBtn = $('play-bot');
const playOnlineBtn = $('play-online');
const botEasyBtn = $('bot-easy');
const botMediumBtn = $('bot-medium');
const botHardBtn = $('bot-hard');
const botExpertBtn = $('bot-expert');
const botImpossibleBtn = $('bot-impossible');

botEasyBtn.innerHTML = difficultyIcons.easy + ' Easy';
botMediumBtn.innerHTML = difficultyIcons.medium + ' Medium';
botHardBtn.innerHTML = difficultyIcons.hard + ' Hard';
botExpertBtn.innerHTML = difficultyIcons.expert + ' Expert';
botImpossibleBtn.innerHTML = difficultyIcons.impossible + ' Impossible';
const backFromBotDifficultyBtn = $('back-from-bot-difficulty');
const leaveBtnBot = $('leave-btn-bot');
const restartBtnBot = $('restart-btn-bot');
const boardBot = $('board-bot');
const infoBot = $('info-bot');
const subInfoBot = $('sub-info-bot');
const leaderboardBot = $('leaderboard-bot');
const createGameBtn = $('create-game-btn');
const showJoinBtn = $('show-join-btn');
const backFromOnlineBtn = $('back-from-online');
const joinGameBtn = $('join-game-btn');
const joinCodeInput = $('join-code-input');
const backFromWaitBtn = $('back-from-wait');
const backFromJoinBtn = $('back-from-join');
const leaveBtnOffline = $('leave-btn-offline');
const leaveBtnOnline = $('leave-btn-online');
const restartBtnOffline = $('restart-btn-offline');
const restartBtnOnline = $('restart-btn-online');
const boardOffline = $('board-offline');
const infoOffline = $('info-offline');
const subInfoOffline = $('sub-info-offline');
const leaderboardOffline = $('leaderboard-offline');
const boardOnline = $('board-online');
const infoOnline = $('info-online');
const subInfoOnline = $('sub-info-online');
const leaderboardOnline = $('leaderboard-online');
const roomCodeSpan = $('room-code');
const roomCodeQr = $('room-code-qr');
const roomCodeQrWrap = $('room-code-qr-wrap');
const creatingStatus = $('creating-status');
const joinStatus = $('join-status');
const scanQrBtn = $('scan-qr-btn');
const modal = $('browser-modal');
const closeModalBtn = $('close-modal');
const backdrop = $('backdrop');

let currentPage = 'home';
let authReady = false;
let modalShown = false;

function init() {
  applySystemTheme();
  initConfetti();

  initOfflineRefs({ boardEl: boardOffline, infoEl: infoOffline, subInfoEl: subInfoOffline, restartBtn: restartBtnOffline, leaderboardEl: leaderboardOffline });
  initOnlineRefs({
    boardEl: boardOnline,
    infoEl: infoOnline,
    subInfoEl: subInfoOnline,
    restartBtn: restartBtnOnline,
    statusEl: creatingStatus,
    leaderboardEl: leaderboardOnline,
  });
  initBotRefs({
    boardEl: boardBot,
    infoEl: infoBot,
    subInfoEl: subInfoBot,
    restartBtn: restartBtnBot,
    leaderboardEl: leaderboardBot,
  });

  bindEvents();

  const urlParams = new URLSearchParams(location.search);
  const joinParam = urlParams.get('join');
  if (joinParam) {
    history.replaceState({}, document.title, location.pathname);
    waitForAuth().then(() => {
      authReady = true;
      joinCodeInput.value = joinParam.trim().toUpperCase();
      goTo('join');
    }).catch(err => console.error('Auth failed:', err));
  } else {
    waitForAuth()
      .then(() => { authReady = true; })
      .catch(err => console.error('Auth failed:', err));
  }
}

async function goTo(name) {
  if (name === currentPage) return;
  const from = pages[currentPage];
  const to = pages[name];
  currentPage = name;
  await fadeOut(from, 300);
  from.classList.add('page-hidden');
  to.classList.remove('page-hidden');
  await fadeIn(to, 300);
}

function bindEvents() {
  playOfflineBtn.addEventListener('click', async () => {
    await goTo('offline');
    boardOffline.style.display = 'grid';
    startOfflineGame();
  });

  playBotBtn.addEventListener('click', async () => {
    await goTo('botDifficulty');
  });

  botEasyBtn.addEventListener('click', async () => {
    setBotDifficulty('easy');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  });

  botMediumBtn.addEventListener('click', async () => {
    setBotDifficulty('medium');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  });

  botHardBtn.addEventListener('click', async () => {
    setBotDifficulty('hard');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  });

  botExpertBtn.addEventListener('click', async () => {
    setBotDifficulty('expert');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  });

  botImpossibleBtn.addEventListener('click', async () => {
    setBotDifficulty('impossible');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  });

  backFromBotDifficultyBtn.addEventListener('click', async () => {
    await goTo('home');
  });

  leaveBtnBot.addEventListener('click', async () => {
    stopConfetti();
    clearBotBoard();
    await goTo('home');
  });

  restartBtnBot.addEventListener('click', () => restartBotGame());

  boardBot.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleBotMove(Number(cell.dataset.col));
  });

  playOnlineBtn.addEventListener('click', async () => {
    if (!authReady) return;
    await goTo('online');
    if (!modalShown && isInAppBrowser()) {
      modalShown = true;
      showModal();
    }
  });

  backFromOnlineBtn.addEventListener('click', async () => {
    await goTo('home');
  });

  createGameBtn.addEventListener('click', async () => {
    if (!authReady) return;
    roomCodeSpan.textContent = '';
    roomCodeQr.innerHTML = '';
    roomCodeQrWrap.classList.remove('qr-visible');
    creatingStatus.textContent = '';
    await goTo('create');
    createGame(
      code => {
        roomCodeSpan.textContent = code;
        roomCodeQr.innerHTML = '';
        roomCodeQrWrap.classList.remove('qr-visible');
        const joinUrl = location.origin + location.pathname + '?join=' + encodeURIComponent(code);
        new QRCode(roomCodeQr, {
          text: joinUrl,
          width: 148,
          height: 148,
          colorDark: '#111111',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M,
        });
        const qrImg = roomCodeQr.querySelector('img');
        const showQr = () => roomCodeQrWrap.classList.add('qr-visible');
        if (qrImg) {
          if (qrImg.complete) showQr();
          else qrImg.addEventListener('load', showQr, { once: true });
        } else {
          setTimeout(showQr, 80);
        }
      },
      async () => {
        boardOnline.style.display = 'grid';
        await goTo('game');
      }
    );
  });

  scanQrBtn?.addEventListener('click', () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        joinStatus.textContent = 'Camera scanning requires HTTPS. Enter the code above instead.';
      } else {
        joinStatus.textContent = "Your browser doesn't support camera access. Try Safari or Chrome, or enter the code above.";
      }
      return;
    }

    const cameraPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
    });

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'padding:24px;box-sizing:border-box;',
    ].join('');

    const title = document.createElement('p');
    title.textContent = 'Scan QR Code';
    title.style.cssText = 'color:#fff;font-size:1.1rem;font-weight:600;margin:0 0 16px;';

    const videoWrap = document.createElement('div');
    videoWrap.style.cssText = [
      'position:relative;width:100%;max-width:320px;aspect-ratio:1;',
      'border-radius:16px;overflow:hidden;background:#111;',
    ].join('');

    const video = document.createElement('video');
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    const finder = document.createElement('div');
    finder.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const bracketStyle = 'position:absolute;width:36px;height:36px;border-color:#fff;border-style:solid;border-width:0;';
    [
      'top:12px;left:12px;border-top-width:3px;border-left-width:3px;border-radius:4px 0 0 0;',
      'top:12px;right:12px;border-top-width:3px;border-right-width:3px;border-radius:0 4px 0 0;',
      'bottom:12px;left:12px;border-bottom-width:3px;border-left-width:3px;border-radius:0 0 0 4px;',
      'bottom:12px;right:12px;border-bottom-width:3px;border-right-width:3px;border-radius:0 0 4px 0;',
    ].forEach(s => {
      const b = document.createElement('div');
      b.style.cssText = bracketStyle + s;
      finder.appendChild(b);
    });

    videoWrap.appendChild(video);
    videoWrap.appendChild(finder);

    const hint = document.createElement('p');
    hint.textContent = 'Starting camera\u2026';
    hint.style.cssText = 'color:rgba(255,255,255,0.7);font-size:0.9rem;margin:14px 0 0;text-align:center;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = [
      'margin-top:24px;padding:11px 36px;border:2px solid rgba(255,255,255,0.4);',
      'border-radius:10px;background:transparent;color:#fff;cursor:pointer;font-size:1rem;',
    ].join('');

    overlay.appendChild(title);
    overlay.appendChild(videoWrap);
    overlay.appendChild(hint);
    overlay.appendChild(cancelBtn);
    document.body.appendChild(overlay);

    let stream = null;
    let rafId = null;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (overlay.parentNode) document.body.removeChild(overlay);
    };

    cancelBtn.addEventListener('click', stop);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scanFrame = () => {
      if (stopped) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (result?.data) {
          stop();
          try {
            const url = new URL(result.data);
            const code = url.searchParams.get('join') || result.data;
            joinCodeInput.value = code.trim().toUpperCase();
          } catch (_) {
            joinCodeInput.value = result.data.trim().toUpperCase();
          }
          joinStatus.textContent = '';
          joinGameBtn.click();
          return;
        }
      }
      rafId = requestAnimationFrame(scanFrame);
    };

    cameraPromise
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        video.srcObject = s;
        hint.textContent = 'Point the QR code at the camera';
        video.addEventListener('loadedmetadata', () => { rafId = requestAnimationFrame(scanFrame); }, { once: true });
      })
      .catch(err => {
        stop();
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          joinStatus.textContent = 'Camera permission denied \u2014 allow camera access in your browser settings, or enter the code above.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          joinStatus.textContent = 'No camera found on this device. Enter the code above.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          joinStatus.textContent = 'Camera is in use by another app. Close it and try again, or enter the code above.';
        } else if (err.name === 'OverconstrainedError') {
          joinStatus.textContent = "Camera doesn't meet requirements. Enter the code above.";
        } else if (err.name === 'SecurityError') {
          joinStatus.textContent = 'Camera blocked \u2014 this page must be served over HTTPS. Enter the code above.';
        } else {
          joinStatus.textContent = 'Camera error: ' + (err.message || err.name) + '. Enter the code above.';
        }
      });
  });


  showJoinBtn.addEventListener('click', async () => {
    joinCodeInput.value = '';
    joinStatus.textContent = '';
    await goTo('join');
  });

  joinGameBtn.addEventListener('click', async () => {
    if (!authReady) { joinStatus.textContent = 'Connecting… please wait.'; return; }
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
    joinStatus.textContent = '';
    joinCodeInput.value = '';
    await goTo('online');
  });

  backFromWaitBtn.addEventListener('click', async () => {
    roomCodeQrWrap.classList.remove('qr-visible');
    await cancelWaiting();
    await goTo('online');
  });

  leaveBtnOffline.addEventListener('click', async () => {
    stopConfetti();
    clearOfflineBoard();
    await goTo('home');
  });

  leaveBtnOnline.addEventListener('click', async () => {
    await leaveOnlineGame();
    stopConfetti();
    clearOnlineBoard();
    await goTo('home');
  });

  restartBtnOffline.addEventListener('click', () => restartOfflineGame());
  restartBtnOnline.addEventListener('click', () => requestOnlineRestart());

  boardOffline.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleOfflineMove(Number(cell.dataset.col));
  });

  boardOnline.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleOnlineMove(Number(cell.dataset.col));
  });

  closeModalBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  window.addEventListener('resize', resizeConfetti);

  addTouchHover('.button, .secondary-button, .tertiary-button, .btn-leave');
}

function isInAppBrowser() {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) return false;
  return /FB_IAB|FBAN|FBAV|Instagram|Twitter|LinkedInApp|Snapchat|TikTok|BytedanceWebview|GSA|musical_ly/.test(ua)
    || /wv/.test(ua)
    || (/Android/.test(ua) && !/Chrome\/[.0-9]* Mobile/.test(ua) && /Version\//.test(ua))
    || (window.ReactNativeWebView !== undefined)
    || (typeof Android !== 'undefined');
}

function showModal() {
  if (!modal) return;
  modal.showModal();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.classList.add('open');
      backdrop.classList.add('visible');
    });
  });
}

function closeModal() {
  modal.classList.add('closing');
  modal.classList.remove('open');
  backdrop.classList.remove('visible');
  modal.addEventListener('transitionend', () => {
    modal.close();
    modal.classList.remove('closing');
  }, { once: true });
}

function addTouchHover(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const rem = () => el.classList.remove('hover');
    el.addEventListener('touchend', rem, { passive: true });
    el.addEventListener('touchcancel', rem, { passive: true });
    el.addEventListener('touchmove', rem, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', init);