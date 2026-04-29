import {
  ROWS, COLS, createEmptyBoard, getAvailableRow, checkWin, isBoardFull,
  getWinningCells, initBoardElement, pulseWinningCells, clearWinningPulse,
  animateFallingDisc, animateRestart
} from '../components/board.js';
import { startConfetti, stopConfetti } from '../components/confetti.js';

const PLAYER_COLORS = { 1: 'Red', 2: 'Yellow' };

let boardState    = createEmptyBoard();
let currentPlayer = 1;
let gameActive    = false;
let isAnimating   = false;
let isRestarting  = false;
let firstInit     = true;

let boardEl, infoEl, subInfoEl, restartBtn, leaderboardEl;

export const leaderboard = { p1: 0, p2: 0, draws: 0 };

export function initOfflineRefs(els) {
  boardEl      = els.boardEl;
  infoEl       = els.infoEl;
  subInfoEl    = els.subInfoEl;
  restartBtn   = els.restartBtn;
  leaderboardEl = els.leaderboardEl;
}

export function clearOfflineBoard() {
  gameActive = false;
  isAnimating = false;
  if (boardEl) {
    boardEl.querySelectorAll('.cell').forEach(cell => {
      delete cell.dataset.player;
      cell.classList.remove('winning');
    });
  }
}

export function startOfflineGame() {
  boardState    = createEmptyBoard();
  currentPlayer = 1;
  gameActive    = true;
  isAnimating   = false;

  clearWinningPulse(boardEl);
  stopConfetti();

  const hadCounters = boardEl && boardEl.querySelector('.cell[data-player]');

  initBoardElement(boardEl, firstInit);
  firstInit = false;

  if (hadCounters) {
    boardEl.style.opacity = '0.15';
    setTimeout(() => { boardEl.style.opacity = '1'; }, 220);
  } else {
    boardEl.style.opacity = '1';
  }

  restartBtn.style.display = 'inline-flex';
  setInfo(`Player 1's turn (${PLAYER_COLORS[1]})`);
  setSubInfo('');
  renderLeaderboard();
}

export async function handleOfflineMove(col) {
  if (!gameActive || isAnimating) return;

  const row = getAvailableRow(boardState, col);
  if (row === -1) return;

  isAnimating = true;
  await animateFallingDisc(boardEl, col, currentPlayer, row);

  boardState[row][col] = currentPlayer;

  const result = getWinningCells(boardState);
  if (result) {
    pulseWinningCells(boardEl, result.cells);
    setInfo(`Player ${currentPlayer} wins! 🎉`);
    const loser = currentPlayer === 1 ? 2 : 1;
    setSubInfo(`Press Restart to play again.`);
    if (currentPlayer === 1) leaderboard.p1++;
    else leaderboard.p2++;
    renderLeaderboard();
    startConfetti();
    gameActive = false;
  } else if (isBoardFull(boardState)) {
    setInfo("It's a draw!");
    setSubInfo('Press Restart to play again.');
    leaderboard.draws++;
    renderLeaderboard();
    startConfetti();
    gameActive = false;
  } else {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    setInfo(`Player ${currentPlayer}'s turn (${PLAYER_COLORS[currentPlayer]})`);
    setSubInfo('');
  }

  isAnimating = false;
}

export async function restartOfflineGame() {
  if (isRestarting || isAnimating) return;
  isRestarting = true;

  await animateRestart(boardEl);

  boardState    = createEmptyBoard();
  currentPlayer = 1;
  gameActive    = true;
  isAnimating   = false;
  clearWinningPulse(boardEl);
  stopConfetti();
  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';
  setInfo(`Player 1's turn (${PLAYER_COLORS[1]})`);
  setSubInfo('');
  renderLeaderboard();

  setTimeout(() => { isRestarting = false; }, 200);
}

function renderLeaderboard() {
  if (!leaderboardEl) return;
  leaderboardEl.classList.remove('lb-visible');
  leaderboardEl.innerHTML = `
    <div class="lb-row">
      <span class="lb-dot lb-dot-player"></span>
      <span class="lb-name">Player 1</span>
      <span class="lb-score">${leaderboard.p1}</span>
    </div>
    <div class="lb-divider"></div>
    <div class="lb-row">
      <span class="lb-dot lb-dot-player2"></span>
      <span class="lb-name">Player 2</span>
      <span class="lb-score">${leaderboard.p2}</span>
    </div>
    <div class="lb-divider"></div>
    <div class="lb-row lb-row-draws">
      <span class="lb-name">Draws</span>
      <span class="lb-score">${leaderboard.draws}</span>
    </div>
  `;
  requestAnimationFrame(() => leaderboardEl.classList.add('lb-visible'));
}

let infoTimeout = null;

function setInfo(text) {
  if (infoTimeout) { clearTimeout(infoTimeout); infoTimeout = null; }
  infoEl.style.opacity = '0';
  infoTimeout = setTimeout(() => {
    infoEl.textContent = text;
    infoEl.style.opacity = '1';
    infoTimeout = null;
  }, 180);
}

function setSubInfo(text) {
  subInfoEl.textContent = text;
  if (text) {
    subInfoEl.classList.add('has-text');
  } else {
    subInfoEl.classList.remove('has-text');
  }
}