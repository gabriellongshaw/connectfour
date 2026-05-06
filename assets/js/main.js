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
        requestAnimationFrame(() => {
          requestAnimationFrame(() => roomCodeQrWrap.classList.add('qr-visible'));
        });
      },
      async () => {
        boardOnline.style.display = 'grid';
        await goTo('game');
      }
    );
  });

  scanQrBtn?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return;
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = (await import('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js')).default;
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        try {
          const url = new URL(result.data);
          const code = url.searchParams.get('join') || result.data;
          joinCodeInput.value = code.trim().toUpperCase();
        } catch {
          joinCodeInput.value = result.data.trim().toUpperCase();
        }
        joinGameBtn.click();
      } else {
        joinStatus.textContent = 'Could not read QR code — enter the code above.';
      }
    });
    input.addEventListener('cancel', () => document.body.removeChild(input));
    input.click();
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