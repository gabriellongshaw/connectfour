import { goTo } from '../navigation.js';
import { stopConfetti } from '../components/confetti.js';
import { initOfflineRefs, startOfflineGame, handleOfflineMove, restartOfflineGame, clearOfflineBoard } from '../modes/offline.js';
import { initOnlineRefs, handleOnlineMove, requestOnlineRestart, leaveOnlineGame, clearOnlineBoard } from '../modes/online.js';

const $ = id => document.getElementById(id);

export function initOfflineGame() {
  const playOfflineBtn = $('play-offline');
  const leaveBtnOffline = $('leave-btn-offline');
  const restartBtnOffline = $('restart-btn-offline');
  const boardOffline = $('board-offline');

  initOfflineRefs({
    boardEl: boardOffline,
    infoEl: $('info-offline'),
    subInfoEl: $('sub-info-offline'),
    restartBtn: restartBtnOffline,
    leaderboardEl: $('leaderboard-offline'),
  });

  playOfflineBtn.addEventListener('click', async () => {
    await goTo('offline');
    boardOffline.style.display = 'grid';
    startOfflineGame();
  });

  leaveBtnOffline.addEventListener('click', async () => {
    stopConfetti();
    clearOfflineBoard();
    await goTo('home');
  });

  restartBtnOffline.addEventListener('click', () => restartOfflineGame());

  boardOffline.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleOfflineMove(Number(cell.dataset.col));
  });
}

export function initOnlineGame({ creatingStatus }) {
  const leaveBtnOnline = $('leave-btn-online');
  const restartBtnOnline = $('restart-btn-online');
  const boardOnline = $('board-online');

  initOnlineRefs({
    boardEl: boardOnline,
    infoEl: $('info-online'),
    subInfoEl: $('sub-info-online'),
    restartBtn: restartBtnOnline,
    statusEl: creatingStatus,
    leaderboardEl: $('leaderboard-online'),
  });

  leaveBtnOnline.addEventListener('click', async () => {
    await leaveOnlineGame();
    stopConfetti();
    clearOnlineBoard();
    await goTo('home');
  });

  restartBtnOnline.addEventListener('click', () => requestOnlineRestart());

  boardOnline.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleOnlineMove(Number(cell.dataset.col));
  });

  return { boardOnline };
}