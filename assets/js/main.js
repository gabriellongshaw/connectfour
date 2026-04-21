import { applySystemTheme } from './core/theme.js';
import { fadeIn, fadeOut, showInstant, hideInstant } from './core/utils.js';
import { waitForAuth } from './core/firebase.js';
import { initConfetti, resizeConfetti, stopConfetti } from './components/confetti.js';
import { initOfflineRefs, startOfflineGame, handleOfflineMove, restartOfflineGame } from './components/offline.js';
import {
  initOnlineRefs, createGame, joinGame, handleOnlineMove,
  requestOnlineRestart, leaveOnlineGame, cancelWaiting
} from './components/online.js';

const $ = id => document.getElementById(id);

const startScreen       = $('start-screen');
const multiplayerScreen = $('multiplayer-screen');
const gameContainer     = $('game-container');

const playOfflineBtn    = $('play-offline');
const playOnlineBtn     = $('play-online');

const mpOptions         = $('multiplayer-options');
const joinSection       = $('join-section');
const roomCodeDisplay   = $('room-code-display');

const createGameBtn     = $('create-game-btn');
const showJoinBtn       = $('show-join-btn');
const joinGameBtn       = $('join-game-btn');
const joinCodeInput     = $('join-code-input');

const backFromMpBtn     = $('back-from-mp');
const backToOptionsBtn  = $('back-to-options');
const backFromWaitBtn   = $('back-from-wait');

const boardEl           = $('board');
const infoEl            = $('info');
const restartBtn        = $('restart-btn');
const leaveBtn          = $('leave-btn');
const statusEl          = $('multiplayer-status');
const roomCodeSpan      = $('room-code');
const modal             = $('browser-modal');
const closeModalBtn     = $('close-modal');
const backdrop          = $('backdrop');

let gameMode  = null;
let authReady = false;

function init() {
  applySystemTheme();
  initConfetti();

  // Set initial visibility — start screen visible, everything else hidden
  showInstant(startScreen);
  hideInstant(multiplayerScreen);
  hideInstant(gameContainer);
  hideInstant(joinSection);
  hideInstant(roomCodeDisplay);

  initOfflineRefs({ boardEl, infoEl, restartBtn });
  initOnlineRefs({ boardEl, infoEl, restartBtn, leaveBtn, statusEl });

  bindEvents();
  showModal();

  waitForAuth()
    .then(() => { authReady = true; })
    .catch(err => console.error('Auth failed:', err));
}

function bindEvents() {
  playOfflineBtn.addEventListener('click', async () => {
    gameMode = 'offline';
    await fadeOut(startScreen);
    showInstant(gameContainer);
    startOfflineGame();
    showLeaveBtn();
    await fadeIn(gameContainer);
  });

  playOnlineBtn.addEventListener('click', async () => {
    if (!authReady) {
      if (statusEl) statusEl.textContent = 'Connecting… please wait.';
      return;
    }
    gameMode = 'online';
    await fadeOut(startScreen);
    showMpOptions();
    showInstant(multiplayerScreen);
    await fadeIn(multiplayerScreen);
  });

  createGameBtn.addEventListener('click', async () => {
    if (!authReady) { if (statusEl) statusEl.textContent = 'Connecting… please wait.'; return; }
    await fadeOut(mpOptions);
    showInstant(roomCodeDisplay);
    await fadeIn(roomCodeDisplay);
    createGame(
      code => { roomCodeSpan.textContent = code; },
      async () => {
        await fadeOut(multiplayerScreen);
        showInstant(gameContainer);
        startOnlineGameUI();
        await fadeIn(gameContainer);
      }
    );
  });

  showJoinBtn.addEventListener('click', async () => {
    await fadeOut(mpOptions);
    showInstant(joinSection);
    await fadeIn(joinSection);
  });

  joinGameBtn.addEventListener('click', async () => {
    if (!authReady) { if (statusEl) statusEl.textContent = 'Connecting… please wait.'; return; }
    joinCodeInput.value = joinCodeInput.value.trim().toUpperCase();
    await joinGame(joinCodeInput.value, async () => {
      await fadeOut(multiplayerScreen);
      showInstant(gameContainer);
      startOnlineGameUI();
      await fadeIn(gameContainer);
    });
  });

  joinCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') joinGameBtn.click();
  });

  backFromMpBtn.addEventListener('click', async () => {
    await fadeOut(multiplayerScreen);
    resetMpUI();
    showInstant(startScreen);
    await fadeIn(startScreen);
  });

  backToOptionsBtn.addEventListener('click', async () => {
    await fadeOut(joinSection);
    hideInstant(joinSection);
    showInstant(mpOptions);
    await fadeIn(mpOptions);
    if (statusEl) statusEl.textContent = '';
  });

  backFromWaitBtn.addEventListener('click', async () => {
    await cancelWaiting();
    await fadeOut(roomCodeDisplay);
    hideInstant(roomCodeDisplay);
    showInstant(mpOptions);
    await fadeIn(mpOptions);
    if (statusEl) statusEl.textContent = '';
  });

  boardEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const col = Number(cell.dataset.col);
    if (gameMode === 'offline') handleOfflineMove(col);
    else if (gameMode === 'online') handleOnlineMove(col);
  });

  restartBtn.addEventListener('click', () => {
    if (gameMode === 'offline') restartOfflineGame();
    else if (gameMode === 'online') requestOnlineRestart();
  });

  leaveBtn.addEventListener('click', async () => {
    if (gameMode === 'online') await leaveOnlineGame();
    await returnToStart();
  });

  closeModalBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  window.addEventListener('resize', resizeConfetti);

  addTouchHover('.start-screen-button, .btn-ghost, #leave-btn, #restart-btn');
}

function startOnlineGameUI() {
  showLeaveBtn();
}

async function returnToStart() {
  stopConfetti();
  restartBtn.style.display = 'none';
  leaveBtn.style.display = 'none';
  boardEl.style.display = 'none';
  gameMode = null;

  const fromGame = !gameContainer.classList.contains('is-hidden');
  const fromMp   = !multiplayerScreen.classList.contains('is-hidden');

  if (fromGame) await fadeOut(gameContainer);
  if (fromMp)   await fadeOut(multiplayerScreen);

  resetMpUI();
  showInstant(startScreen);
  await fadeIn(startScreen);
}

function showMpOptions() {
  showInstant(mpOptions);
  hideInstant(joinSection);
  hideInstant(roomCodeDisplay);
  if (statusEl) statusEl.textContent = '';
  joinCodeInput.value = '';
}

function resetMpUI() {
  showInstant(mpOptions);
  hideInstant(joinSection);
  hideInstant(roomCodeDisplay);
  if (statusEl) statusEl.textContent = '';
  joinCodeInput.value = '';
  roomCodeSpan.textContent = '';
}

function showLeaveBtn() {
  leaveBtn.style.display = 'block';
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
