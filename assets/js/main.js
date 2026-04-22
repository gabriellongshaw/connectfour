import { applySystemTheme } from './core/theme.js';
import { fadeIn, fadeOut } from './core/utils.js';
import { waitForAuth } from './core/firebase.js';
import { initConfetti, resizeConfetti, stopConfetti } from './components/confetti.js';
import { initOfflineRefs, startOfflineGame, handleOfflineMove, restartOfflineGame } from './modes/offline.js';
import {
  initOnlineRefs, createGame, joinGame, handleOnlineMove,
  requestOnlineRestart, leaveOnlineGame, cancelWaiting
} from './modes/online.js';

const $ = id => document.getElementById(id);

const pages = {
  home:    $('page-home'),
  offline: $('page-offline'),
  online:  $('page-online'),
  create:  $('page-create'),
  join:    $('page-join'),
  game:    $('page-game'),
};

const playOfflineBtn    = $('play-offline');
const playOnlineBtn     = $('play-online');
const createGameBtn     = $('create-game-btn');
const showJoinBtn       = $('show-join-btn');
const backFromOnlineBtn = $('back-from-online');
const joinGameBtn       = $('join-game-btn');
const joinCodeInput     = $('join-code-input');
const backFromWaitBtn   = $('back-from-wait');
const backFromJoinBtn   = $('back-from-join');
const leaveBtnOffline   = $('leave-btn-offline');
const leaveBtnOnline    = $('leave-btn-online');
const restartBtnOffline = $('restart-btn-offline');
const restartBtnOnline  = $('restart-btn-online');
const boardOffline      = $('board-offline');
const infoOffline       = $('info-offline');
const boardOnline       = $('board-online');
const infoOnline        = $('info-online');
const roomCodeSpan      = $('room-code');
const creatingStatus    = $('creating-status');
const joinStatus        = $('join-status');
const modal             = $('browser-modal');
const closeModalBtn     = $('close-modal');
const backdrop          = $('backdrop');

let currentPage = 'home';
let authReady   = false;

function init() {
  applySystemTheme();
  initConfetti();

  initOfflineRefs({ boardEl: boardOffline, infoEl: infoOffline, restartBtn: restartBtnOffline });
  initOnlineRefs({
    boardEl:    boardOnline,
    infoEl:     infoOnline,
    restartBtn: restartBtnOnline,
    statusEl:   creatingStatus,
  });

  bindEvents();
  if (isInAppBrowser()) showModal();

  waitForAuth()
    .then(() => { authReady = true; })
    .catch(err => console.error('Auth failed:', err));
}

async function goTo(name) {
  if (name === currentPage) return;
  const from = pages[currentPage];
  const to   = pages[name];
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

  playOnlineBtn.addEventListener('click', async () => {
    if (!authReady) return;
    await goTo('online');
  });

  backFromOnlineBtn.addEventListener('click', async () => {
    await goTo('home');
  });

  createGameBtn.addEventListener('click', async () => {
    if (!authReady) return;
    roomCodeSpan.textContent = '';
    creatingStatus.textContent = '';
    await goTo('create');
    createGame(
      code => { roomCodeSpan.textContent = code; },
      async () => {
        boardOnline.style.display = 'grid';
        await goTo('game');
      }
    );
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
    await cancelWaiting();
    await goTo('online');
  });

  leaveBtnOffline.addEventListener('click', async () => {
    stopConfetti();
    await goTo('home');
  });

  leaveBtnOnline.addEventListener('click', async () => {
    await leaveOnlineGame();
    stopConfetti();
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

  addTouchHover('.start-screen-button, .btn-ghost, .btn-leave, #restart-btn-offline, #restart-btn-online');
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
  setTimeout(() => modal.classList.add('open'), 10);
  backdrop.classList.add('visible');
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