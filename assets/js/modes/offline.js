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

let boardEl, infoEl, subInfoEl, restartBtn;

export function initOfflineRefs(els) {
  boardEl    = els.boardEl;
  infoEl     = els.infoEl;
  subInfoEl  = els.subInfoEl;
  restartBtn = els.restartBtn;
}

export function startOfflineGame() {
  boardState    = createEmptyBoard();
  currentPlayer = 1;
  gameActive    = true;
  isAnimating   = false;

  clearWinningPulse(boardEl);
  stopConfetti();

  initBoardElement(boardEl, firstInit);
  boardEl.style.opacity = '1';
  firstInit = false;

  restartBtn.style.display = 'inline-flex';
  setInfo(`Player 1's turn (${PLAYER_COLORS[1]})`);
  setSubInfo('');
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
    setSubInfo(`You can restart the game using the button below.`);
    startConfetti();
    gameActive = false;
  } else if (isBoardFull(boardState)) {
    setInfo("It's a draw!");
    setSubInfo('You can restart the game using the button below.');
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

  setTimeout(() => { isRestarting = false; }, 200);
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
}
