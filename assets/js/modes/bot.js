import {
  ROWS, COLS, createEmptyBoard, getAvailableRow, getWinningCells, isBoardFull,
  initBoardElement, pulseWinningCells, clearWinningPulse,
  animateFallingDisc, animateRestart
} from '../components/board.js';
import { startConfetti, stopConfetti } from '../components/confetti.js';

let boardEl, infoEl, subInfoEl, restartBtn, leaderboardEl;

let boardState = createEmptyBoard();
let currentPlayer = 1;
let gameActive = false;
let isAnimating = false;
let isRestarting = false;
let firstInit = true;
let difficulty = 'medium';

export const leaderboard = { player: 0, bot: 0, draws: 0 };

export function initBotRefs(els) {
  boardEl = els.boardEl;
  infoEl = els.infoEl;
  subInfoEl = els.subInfoEl;
  restartBtn = els.restartBtn;
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
  boardState = createEmptyBoard();
  currentPlayer = 1;
  gameActive = true;
  isAnimating = false;

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

  boardState = createEmptyBoard();
  currentPlayer = 1;
  gameActive = true;
  isAnimating = false;

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
  leaderboard.bot = 0;
  leaderboard.draws = 0;
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboardEl) return;
  const diffLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', impossible: 'Impossible' };
  const diffLabel = diffLabels[difficulty] || difficulty;
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
  if (diff === 'easy') return easyMove(board);
  if (diff === 'medium') return mediumMove(board);
  if (diff === 'hard') return hardMove(board);
  if (diff === 'expert') return expertMove(board);
  return impossibleMove(board);
}

function givesOpponentWin(board, col, botPlayer) {
  const opp = botPlayer === 2 ? 1 : 2;
  const next = dropPiece(board, col, botPlayer);
  if (!next) return false;
  return findImmediateWin(next, opp) !== -1;
}

function safeCols(board, cols, botPlayer) {
  const safe = cols.filter(c => !givesOpponentWin(board, c, botPlayer));
  return safe.length > 0 ? safe : cols;
}

function easyMove(board) {
  const cols = getValidCols(board);

  const win = findImmediateWin(board, 2);
  if (win !== -1 && Math.random() < 0.4) return win;

  const block = findImmediateWin(board, 1);
  if (block !== -1 && Math.random() < 0.3) return block;

  if (Math.random() < 0.15) {
    return cols[Math.floor(Math.random() * cols.length)];
  }

  const candidates = safeCols(board, cols, 2);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function mediumMove(board) {
  const cols = getValidCols(board);

  const win = findImmediateWin(board, 2);
  if (win !== -1) return win;

  const block = findImmediateWin(board, 1);
  if (block !== -1 && Math.random() < 0.85) return block;

  if (Math.random() < 0.18) {
    const candidates = safeCols(board, cols, 2);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const candidates = safeCols(board, cols, 2);
  const scored = candidates.map(c => {
    const next = dropPiece(board, c, 2);
    return { col: c, score: next ? scoreBoard(next, 2) : -Infinity };
  });
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0].score;
  const topTier = scored.filter(s => s.score >= topScore - 1);
  return topTier[Math.floor(Math.random() * topTier.length)].col;
}

function hardMove(board) {
  if (Math.random() < 0.08) {
    const cols = getValidCols(board);
    const candidates = safeCols(board, cols, 2);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  const result = minimaxIterativeDeepening(board, 5);
  return result.col;
}

function expertMove(board) {
  const result = minimaxIterativeDeepening(board, 7);
  return result.col;
}

function impossibleMove(board) {
  const result = minimaxIterativeDeepeningTimed(board, 10, 2000);
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
  score += centerCol.filter(v => v === player).length * 2;
  const nearCenter = [center - 1, center + 1];
  for (const nc of nearCenter) {
    if (nc >= 0 && nc < COLS) {
      score += board.map(r => r[nc]).filter(v => v === player).length * 1;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += scoreWindow(window, player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += scoreWindow(window, player);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
      score += scoreWindow(window, player);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
      score += scoreWindow(window, player);
    }
  }
  return score;
}

const ZOBRIST_TABLE = (() => {
  const t = [];
  for (let r = 0; r < ROWS; r++) {
    t[r] = [];
    for (let c = 0; c < COLS; c++) {
      t[r][c] = [0, 0, 0];
      for (let p = 1; p <= 2; p++) {
        t[r][c][p] = (Math.random() * 0xFFFFFFFF) >>> 0;
      }
    }
  }
  return t;
})();

function zobristHash(board) {
  let h = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) h ^= ZOBRIST_TABLE[r][c][board[r][c]];
    }
  }
  return h;
}

const TT_SIZE = 1 << 20;
const transpositionTable = new Map();

const EXACT = 0, LOWER = 1, UPPER = 2;

let killerMoves = [];

function minimax(board, depth, alpha, beta, maximizing) {
  const hash = zobristHash(board);
  const ttEntry = transpositionTable.get(hash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === EXACT) return { col: ttEntry.col, score: ttEntry.score };
    if (ttEntry.flag === LOWER && ttEntry.score > alpha) alpha = ttEntry.score;
    if (ttEntry.flag === UPPER && ttEntry.score < beta) beta = ttEntry.score;
    if (alpha >= beta) return { col: ttEntry.col, score: ttEntry.score };
  }

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
  const killer = killerMoves[depth];

  validCols.sort((a, b) => {
    const aIsKiller = a === killer ? -1 : 0;
    const bIsKiller = b === killer ? -1 : 0;
    if (aIsKiller !== bIsKiller) return aIsKiller - bIsKiller;
    return Math.abs(a - center) - Math.abs(b - center);
  });

  let best = { col: validCols[0], score: maximizing ? -Infinity : Infinity };
  const origAlpha = alpha;

  for (const col of validCols) {
    const next = dropPiece(board, col, maximizing ? 2 : 1);
    if (!next) continue;
    const result = minimax(next, depth - 1, alpha, beta, !maximizing);
    if (maximizing) {
      if (result.score > best.score) best = { col, score: result.score };
      alpha = Math.max(alpha, best.score);
    } else {
      if (result.score < best.score) best = { col, score: result.score };
      beta = Math.min(beta, best.score);
    }
    if (alpha >= beta) {
      killerMoves[depth] = col;
      break;
    }
  }

  const flag = best.score <= origAlpha ? UPPER : best.score >= beta ? LOWER : EXACT;
  if (transpositionTable.size >= TT_SIZE) transpositionTable.clear();
  transpositionTable.set(hash, { depth, score: best.score, col: best.col, flag });

  return best;
}

function minimaxIterativeDeepening(board, maxDepth) {
  transpositionTable.clear();
  killerMoves = [];
  let best = { col: Math.floor(COLS / 2), score: 0 };
  for (let d = 1; d <= maxDepth; d++) {
    const result = minimax(board, d, -Infinity, Infinity, true);
    if (result.col !== -1) best = result;
    if (Math.abs(best.score) >= 100000) break;
  }
  return best;
}

function minimaxIterativeDeepeningTimed(board, maxDepth, timeLimitMs) {
  transpositionTable.clear();
  killerMoves = [];
  const deadline = Date.now() + timeLimitMs;
  let best = { col: Math.floor(COLS / 2), score: 0 };
  for (let d = 1; d <= maxDepth; d++) {
    if (Date.now() >= deadline) break;
    const result = minimax(board, d, -Infinity, Infinity, true);
    if (result.col !== -1) best = result;
    if (Math.abs(best.score) >= 100000) break;
  }
  return best;
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