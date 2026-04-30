import {
  ROWS, COLS, createEmptyBoard, getAvailableRow, getWinningCells, isBoardFull,
  initBoardElement, pulseWinningCells, clearWinningPulse,
  animateFallingDisc, animateRestart
} from '../components/board.js';
import { startConfetti, stopConfetti } from '../components/confetti.js';

let boardEl, infoEl, subInfoEl, restartBtn, leaderboardEl;

let boardState    = createEmptyBoard();
let currentPlayer = 1;
let gameActive    = false;
let isAnimating   = false;
let isRestarting  = false;
let firstInit     = true;
let difficulty    = 'medium';

export const leaderboard = { player: 0, bot: 0, draws: 0 };

export function initBotRefs(els) {
  boardEl      = els.boardEl;
  infoEl       = els.infoEl;
  subInfoEl    = els.subInfoEl;
  restartBtn   = els.restartBtn;
  leaderboardEl = els.leaderboardEl;
}

export function clearBotBoard() {
  gameActive = false;
  isAnimating = false;
  if (boardEl) {
    boardEl.querySelectorAll('.cell').forEach(cell => {
      delete cell.dataset.player;
      cell.classList.remove('winning');
    });
  }
}

export function setBotDifficulty(d) {
  difficulty = d;
}

export function startBotGame() {
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
  setInfo("Your turn (Red)");
  setSubInfo('');
  renderLeaderboard();
}

export async function handleBotMove(col) {
  if (!gameActive || isAnimating || currentPlayer !== 1) return;

  const row = getAvailableRow(boardState, col);
  if (row === -1) return;

  isAnimating = true;
  await animateFallingDisc(boardEl, col, 1, row);
  boardState[row][col] = 1;

  const result = getWinningCells(boardState);
  if (result) {
    pulseWinningCells(boardEl, result.cells);
    leaderboard.player++;
    renderLeaderboard();
    setInfo("You win! 🎉");
    setSubInfo('Press Restart to play again.');
    startConfetti();
    gameActive = false;
    isAnimating = false;
    return;
  }
  if (isBoardFull(boardState)) {
    leaderboard.draws++;
    renderLeaderboard();
    setInfo("It's a draw!");
    setSubInfo('Press Restart to play again.');
    startConfetti();
    gameActive = false;
    isAnimating = false;
    return;
  }

  currentPlayer = 2;
  setInfo("Bot is thinking…");
  setSubInfo('');
  isAnimating = false;

  setTimeout(() => doBotMove(), difficulty === 'easy' ? 300 : 500);
}

async function doBotMove() {
  if (!gameActive) return;
  isAnimating = true;

  const col = chooseBotCol(boardState, difficulty);
  const row = getAvailableRow(boardState, col);

  await animateFallingDisc(boardEl, col, 2, row);
  boardState[row][col] = 2;

  const result = getWinningCells(boardState);
  if (result) {
    pulseWinningCells(boardEl, result.cells);
    leaderboard.bot++;
    renderLeaderboard();
    setInfo("Bot wins! 🤖");
    setSubInfo('Press Restart to play again.');
    startConfetti();
    gameActive = false;
    isAnimating = false;
    return;
  }
  if (isBoardFull(boardState)) {
    leaderboard.draws++;
    renderLeaderboard();
    setInfo("It's a draw!");
    setSubInfo('Press Restart to play again.');
    startConfetti();
    gameActive = false;
    isAnimating = false;
    return;
  }

  currentPlayer = 1;
  setInfo("Your turn (Red)");
  setSubInfo('');
  isAnimating = false;
}

export async function restartBotGame() {
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
  setInfo("Your turn (Red)");
  setSubInfo('');
  renderLeaderboard();

  setTimeout(() => { isRestarting = false; }, 200);
}

export function resetBotLeaderboard() {
  leaderboard.player = 0;
  leaderboard.bot    = 0;
  leaderboard.draws  = 0;
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboardEl) return;
  const diffLabel = difficulty === 'impossible' ? 'Impossible' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  leaderboardEl.classList.remove('lb-visible');
  leaderboardEl.innerHTML = `
    <div class="lb-row">
      <span class="lb-dot lb-dot-player"></span>
      <span class="lb-name">You</span>
      <span class="lb-score">${leaderboard.player}</span>
    </div>
    <div class="lb-divider"></div>
    <div class="lb-row">
      <span class="lb-dot lb-dot-bot"></span>
      <span class="lb-name">Bot <span class="lb-diff">${diffLabel}</span></span>
      <span class="lb-score">${leaderboard.bot}</span>
    </div>
    <div class="lb-divider"></div>
    <div class="lb-row lb-row-draws">
      <span class="lb-name">Draws</span>
      <span class="lb-score">${leaderboard.draws}</span>
    </div>
  `;
  requestAnimationFrame(() => leaderboardEl.classList.add('lb-visible'));
}

function getValidCols(board) {
  return Array.from({ length: COLS }, (_, i) => i).filter(c => getAvailableRow(board, c) !== -1);
}

function cloneBoard(board) {
  return board.map(r => [...r]);
}

function dropPiece(board, col, player) {
  const b = cloneBoard(board);
  const row = getAvailableRow(b, col);
  if (row === -1) return null;
  b[row][col] = player;
  return b;
}

function boardHasWinner(board) {
  return getWinningCells(board) !== null;
}

function chooseBotCol(board, diff) {
  if (diff === 'easy')       return easyMove(board);
  if (diff === 'medium')     return mediumMove(board);
  if (diff === 'hard')       return hardMove(board);
  return impossibleMove(board);
}

function easyMove(board) {
  const cols = getValidCols(board);
  if (Math.random() < 0.25) {
    const block = findImmediateWin(board, 1);
    if (block !== -1) return block;
  }
  return cols[Math.floor(Math.random() * cols.length)];
}

function mediumMove(board) {
  if (Math.random() < 0.35) {
    const cols = getValidCols(board);
    return cols[Math.floor(Math.random() * cols.length)];
  }
  const win = findImmediateWin(board, 2);
  if (win !== -1) return win;
  if (Math.random() < 0.5) {
    const block = findImmediateWin(board, 1);
    if (block !== -1) return block;
  }
  const cols = getValidCols(board);
  const center = Math.floor(COLS / 2);
  if (cols.includes(center) && Math.random() < 0.5) return center;
  return cols[Math.floor(Math.random() * cols.length)];
}

function hardMove(board) {
  if (Math.random() < 0.08) {
    const cols = getValidCols(board);
    return cols[Math.floor(Math.random() * cols.length)];
  }
  const result = minimax(board, 5, -Infinity, Infinity, true);
  return result.col;
}

function impossibleMove(board) {
  const result = minimax(board, 7, -Infinity, Infinity, true);
  return result.col;
}

function findImmediateWin(board, player) {
  for (const col of getValidCols(board)) {
    const next = dropPiece(board, col, player);
    if (next && boardHasWinner(next)) return col;
  }
  return -1;
}

function scoreWindow(window, player) {
  const opp = player === 2 ? 1 : 2;
  const pCount = window.filter(v => v === player).length;
  const eCount = window.filter(v => v === 0).length;
  const oCount = window.filter(v => v === opp).length;
  if (pCount === 4) return 100;
  if (pCount === 3 && eCount === 1) return 5;
  if (pCount === 2 && eCount === 2) return 2;
  if (oCount === 3 && eCount === 1) return -4;
  return 0;
}

function scoreBoard(board, player) {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerCol = board.map(r => r[center]);
  score += centerCol.filter(v => v === player).length * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
      score += scoreWindow(window, player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += scoreWindow(window, player);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += scoreWindow(window, player);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
      score += scoreWindow(window, player);
    }
  }
  return score;
}

function minimax(board, depth, alpha, beta, maximizing) {
  const isTerminal = boardHasWinner(board) || isBoardFull(board) || depth === 0;
  if (isTerminal) {
    if (boardHasWinner(board)) {
      const w = getWinningCells(board);
      if (w && w.player === 2) return { col: -1, score: 100000 + depth };
      if (w && w.player === 1) return { col: -1, score: -100000 - depth };
      return { col: -1, score: 0 };
    }
    return { col: -1, score: scoreBoard(board, 2) };
  }

  const validCols = getValidCols(board);
  const center = Math.floor(COLS / 2);
  validCols.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

  if (maximizing) {
    let best = { col: validCols[0], score: -Infinity };
    for (const col of validCols) {
      const next = dropPiece(board, col, 2);
      if (!next) continue;
      const result = minimax(next, depth - 1, alpha, beta, false);
      if (result.score > best.score) best = { col, score: result.score };
      alpha = Math.max(alpha, best.score);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = { col: validCols[0], score: Infinity };
    for (const col of validCols) {
      const next = dropPiece(board, col, 1);
      if (!next) continue;
      const result = minimax(next, depth - 1, alpha, beta, true);
      if (result.score < best.score) best = { col, score: result.score };
      beta = Math.min(beta, best.score);
      if (alpha >= beta) break;
    }
    return best;
  }
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