import { applySystemTheme } from './core/theme.js';
import { fadeIn, fadeOut } from './core/utils.js';
import { waitForAuth, signInWithGoogle, handleRedirectResult } from './core/firebase.js';
import { initConfetti, resizeConfetti, stopConfetti } from './components/confetti.js';
import { initOfflineRefs, startOfflineGame, handleOfflineMove, restartOfflineGame, clearOfflineBoard } from './modes/offline.js';
import {
  initOnlineRefs, createGame, joinGame, handleOnlineMove,
  requestOnlineRestart, leaveOnlineGame, cancelWaiting, clearOnlineBoard
} from './modes/online.js';
import {
  initBotRefs, setBotDifficulty, startBotGame, handleBotMove,
  restartBotGame, resetBotLeaderboard, clearBotBoard, setBotModHook
} from './modes/bot.js';
import { setOnlineModHook } from './modes/online.js';
import { initMod, setModMode, getModState } from './components/mod.js';

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
const botImpossibleBtn = $('bot-impossible');
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
const creatingStatus = $('creating-status');
const joinStatus = $('join-status');
const modal = $('browser-modal');
const closeModalBtn = $('close-modal');
const backdrop = $('backdrop');

let currentPage = 'home';
let authReady = false;

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

  setBotModHook(getModState);
  setOnlineModHook(getModState);

  initMod({
    modBtn: $('mod-btn'),
    modMenu: $('mod-menu'),
  });

  bindEvents();
  if (isInAppBrowser()) showModal();

  handleRedirectResult().catch(() => {});

  waitForAuth()
    .then(() => { authReady = true; })
    .catch(err => console.error('Auth failed:', err));
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
    setModMode('bot');
    startBotGame();
  });

  botMediumBtn.addEventListener('click', async () => {
    setBotDifficulty('medium');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    setModMode('bot');
    startBotGame();
  });

  botHardBtn.addEventListener('click', async () => {
    setBotDifficulty('hard');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    setModMode('bot');
    startBotGame();
  });

  botImpossibleBtn.addEventListener('click', async () => {
    setBotDifficulty('impossible');
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    setModMode('bot');
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
        setModMode('online');
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
      setModMode('online');
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

  $('mod-signin-btn')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign-in failed', e);
    }
  });
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