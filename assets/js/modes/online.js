import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  deleteDoc, onSnapshot, query, where
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';

import { db, auth } from '../core/firebase.js';
import { generateCode } from '../core/utils.js';
import {
  ROWS, COLS, createEmptyBoard, flattenBoard, unflattenBoard,
  getAvailableRow, checkWin, isBoardFull, getWinningCells,
  renderBoard, initBoardElement, pulseWinningCells, clearWinningPulse,
  animateFallingDisc, animateRestart
} from '../components/board.js';
import { startConfetti, stopConfetti } from '../components/confetti.js';

const gamesRef = collection(db, 'games');

let gameId = null;
let playerNumber = 0;
let boardState = createEmptyBoard();
let currentPlayer = 1;
let gameActive = false;
let isAnimating = false;
let unsubGame = null;
let isSelfLeaving = false;

let pendingMoveFlat = null;
let isRestarting = false;

let boardEl, infoEl, subInfoEl, restartBtn, statusEl, leaderboardEl;

let _getModState = null;
export function setOnlineModHook(fn) { _getModState = fn; }
function mod() { return _getModState ? _getModState() : {}; }

export const leaderboard = { p1: 0, p2: 0, draws: 0 };

export function initOnlineRefs(els) {
  boardEl = els.boardEl;
  infoEl = els.infoEl;
  subInfoEl = els.subInfoEl;
  restartBtn = els.restartBtn;
  statusEl = els.statusEl;
  leaderboardEl = els.leaderboardEl;
}

export async function createGame(onWaiting, onGameStart) {
  setStatus('Creating game…');
  const code = generateCode(7);

  try {
    const ref = await addDoc(gamesRef, {
      code,
      player1: auth.currentUser.uid,
      player2: null,
      board: flattenBoard(createEmptyBoard()),
      currentPlayer: 1,
      status: 'waiting',
      winner: 0,
      draw: false,
      restartRequest: false,
      leftGame: false,
    });

    gameId = ref.id;
    playerNumber = 1;
    setStatus('');
    onWaiting(code);
    waitForOpponent(onGameStart);
  } catch (err) {
    setStatus('Could not create game. Please try again.');
    console.error(err);
  }
}

export async function joinGame(code, onGameStart, onError) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) { onError?.('Please enter a room code.'); return; }

  onError?.('Joining…');

  try {
    const q = query(gamesRef, where('code', '==', trimmed));
    const snap = await getDocs(q);

    if (snap.empty) { onError?.('Game not found. Check the code and try again.'); return; }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.player1 === auth.currentUser.uid) {
      onError?.('You created this game — share the code with a friend!');
      return;
    }
    if (data.player2 && data.player2 !== auth.currentUser.uid) {
      onError?.('This game already has two players.');
      return;
    }
    if (data.status === 'finished') {
      onError?.('This game has already ended.');
      return;
    }

    gameId = docSnap.id;
    playerNumber = 2;

    await updateDoc(doc(db, 'games', gameId), {
      player2: auth.currentUser.uid,
      status: 'playing',
    });

    onError?.('');
    onGameStart();
    startOnlineGame();
  } catch (err) {
    onError?.('Error joining game. Please try again.');
    console.error(err);
  }
}

function waitForOpponent(onGameStart) {
  if (!gameId) return;
  const unsub = onSnapshot(doc(db, 'games', gameId), snap => {
    if (!snap.exists()) { unsub(); return; }
    if (snap.data().status === 'playing') {
      unsub();
      onGameStart();
      startOnlineGame();
    }
  });
}

export function startOnlineGame() {
  boardState = createEmptyBoard();
  currentPlayer = 1;
  gameActive = true;
  isAnimating = false;
  isSelfLeaving = false;
  isRestarting = false;
  pendingMoveFlat = null;

  clearWinningPulse(boardEl);
  stopConfetti();
  setRestartVisible(false);

  const hadCounters = boardEl && boardEl.querySelector('.cell[data-player]');

  initBoardElement(boardEl, false);

  if (hadCounters) {
    boardEl.style.opacity = '0.15';
    setTimeout(() => { boardEl.style.opacity = '1'; }, 220);
  } else {
    boardEl.style.opacity = '1';
  }

  setInfo(playerNumber === 1 ? 'Your turn! (Red)' : 'Waiting for opponent… (Yellow)');
  setSubInfo('');
  renderLeaderboard();

  subscribeToGame();
}

function validateIncomingBoard(oldFlat, newFlat, expectedCurrentPlayer) {
  if (!Array.isArray(newFlat) || newFlat.length !== ROWS * COLS) return { valid: false };

  for (const v of newFlat) {
    if (v !== 0 && v !== 1 && v !== 2) return { valid: false };
  }

  let changedIdx = -1;
  let changeCount = 0;
  for (let i = 0; i < newFlat.length; i++) {
    if (oldFlat[i] !== newFlat[i]) {
      changeCount++;
      changedIdx = i;
    }
  }

  if (changeCount === 0) return { valid: true, changedIdx: -1 };
  if (changeCount !== 1) return { valid: false };

  if (oldFlat[changedIdx] !== 0) return { valid: false };

  const placedPlayer = newFlat[changedIdx];
  if (placedPlayer !== 1 && placedPlayer !== 2) return { valid: false };
  if (placedPlayer !== expectedCurrentPlayer) return { valid: false };

  const placedRow = Math.floor(changedIdx / COLS);
  const placedCol = changedIdx % COLS;
  for (let r = placedRow + 1; r < ROWS; r++) {
    if (newFlat[r * COLS + placedCol] === 0) return { valid: false };
  }

  return { valid: true, changedIdx, placedRow, placedCol, placedPlayer };
}

function subscribeToGame() {
  if (unsubGame) { unsubGame(); unsubGame = null; }
  if (!gameId) return;

  unsubGame = onSnapshot(doc(db, 'games', gameId), async snap => {
    if (!snap.exists()) {
      if (!isSelfLeaving) opponentLeft();
      return;
    }

    const data = snap.data();

    if (data.leftGame === true) {
      if (!isSelfLeaving) opponentLeft();
      return;
    }

    if (data.restartRequest === true) {
      await handleRemoteRestart(data);
      return;
    }

    const newFlat = data.board;
    const oldFlat = flattenBoard(boardState);

    if (pendingMoveFlat !== null) {
      const isMine = newFlat.every((v, i) => v === pendingMoveFlat[i]);
      pendingMoveFlat = null;
      if (isMine) return;
    }

    const validation = validateIncomingBoard(oldFlat, newFlat, currentPlayer);

    if (!validation.valid) {
      console.warn('Rejected invalid board update from Firestore');
      return;
    }

    if (validation.changedIdx !== -1 && !isAnimating && !isRestarting) {
      const { placedRow, placedCol, placedPlayer } = validation;
      isAnimating = true;
      await animateFallingDisc(boardEl, placedCol, placedPlayer, placedRow);
      isAnimating = false;
    }

    boardState = unflattenBoard(newFlat);

    const incomingCurrentPlayer = data.currentPlayer;
    if (incomingCurrentPlayer !== 1 && incomingCurrentPlayer !== 2) {
      console.warn('Rejected invalid currentPlayer from Firestore');
      return;
    }
    currentPlayer = incomingCurrentPlayer;

    renderBoard(boardEl, boardState);

    if (data.status === 'finished') {
      const winner = data.winner;
      if (winner !== 0 && winner !== 1 && winner !== 2) {
        console.warn('Rejected invalid winner value from Firestore');
        return;
      }

      gameActive = false;
      if (winner && winner !== 0) {
        const result = getWinningCells(boardState);
        if (result) pulseWinningCells(boardEl, result.cells);
        if (winner === 1) leaderboard.p1++;
        else leaderboard.p2++;
        renderLeaderboard();
        if (winner === playerNumber) {
          startConfetti();
          setInfo('You win! 🎉');
          setSubInfo(playerNumber === 1
            ? 'You can restart the game using the button below.'
            : 'Player 1 (host) can restart the game.');
        } else {
          setInfo('You lost!');
          setSubInfo(playerNumber === 1
            ? 'You can restart the game using the button below.'
            : 'Player 1 (host) can restart the game.');
        }
      } else if (data.draw) {
        leaderboard.draws++;
        renderLeaderboard();
        startConfetti();
        setInfo("It's a draw!");
        setSubInfo(playerNumber === 1
          ? 'You can restart the game using the button below.'
          : 'Player 1 (host) can restart the game.');
      }
      if (playerNumber === 1) setRestartVisible(true);
      return;
    }

    clearWinningPulse(boardEl);
    gameActive = true;
    setInfo(currentPlayer === playerNumber ? 'Your turn!' : "Opponent's turn…");
    setSubInfo('');
  });
}

export async function handleOnlineMove(col) {
  if (!gameActive || isAnimating || currentPlayer !== playerNumber || !gameId) return;

  const row = getAvailableRow(boardState, col);
  if (row === -1) return;

  const m = mod();

  if (m.autoWinOnline) {
    await doOnlineAutoWin();
    return;
  }

  const placeTimes = m.multiPlaceOnline ? Math.min(m.multiPlaceOnlineCount || 2, 7) : 1;

  isAnimating = true;

  let finalWon = false;
  let finalDraw = false;

  for (let i = 0; i < placeTimes; i++) {
    const r = getAvailableRow(boardState, col);
    if (r === -1) break;

    const newBoard = boardState.map(row => [...row]);
    newBoard[r][col] = currentPlayer;
    const won = checkWin(newBoard, currentPlayer, r, col);
    const draw = !won && isBoardFull(newBoard);

    await animateFallingDisc(boardEl, col, currentPlayer, r);
    boardState = newBoard;
    renderBoard(boardEl, boardState);

    if (won || draw) { finalWon = won; finalDraw = draw; break; }
  }

  const nextPlayer = currentPlayer === 1 ? 2 : 1;
  const skipOpponent = m.skipOpponentTurn && !finalWon && !finalDraw;
  const effectiveNext = skipOpponent ? currentPlayer : nextPlayer;
  const newFlat = flattenBoard(boardState);

  if (finalWon) {
    gameActive = false;
    const result = getWinningCells(boardState);
    if (result) pulseWinningCells(boardEl, result.cells);
    startConfetti();
    setInfo('You win! 🎉');
    setSubInfo('You can restart the game using the button below.');
    if (playerNumber === 1) setRestartVisible(true);
  } else if (finalDraw) {
    gameActive = false;
    startConfetti();
    setInfo("It's a draw!");
    setSubInfo('You can restart the game using the button below.');
    if (playerNumber === 1) setRestartVisible(true);
  } else if (skipOpponent) {
    setInfo('Your turn!');
    setSubInfo('');
  } else {
    setInfo("Opponent's turn…");
    setSubInfo('');
  }

  isAnimating = false;

  try {
    await updateDoc(doc(db, 'games', gameId), {
      board: newFlat,
      currentPlayer: (finalWon || finalDraw) ? currentPlayer : effectiveNext,
      status: (finalWon || finalDraw) ? 'finished' : 'playing',
      winner: finalWon ? currentPlayer : 0,
      draw: finalDraw,
    });
    pendingMoveFlat = newFlat;
  } catch (err) {
    if (!finalWon && !finalDraw) {
      boardState = unflattenBoard(pendingMoveFlat || flattenBoard(boardState));
      renderBoard(boardEl, boardState);
      gameActive = true;
      setInfo('Your turn!');
      setSubInfo('');
      setRestartVisible(false);
    }
    console.error('Move update failed:', err);
  }
}

async function doOnlineAutoWin() {
  isAnimating = true;
  const { getWinningCells: gwc, getAvailableRow: gar, checkWin: cw, isBoardFull: ibf } = await import('../components/board.js');
  for (let attempt = 0; attempt < 42; attempt++) {
    const cols = Array.from({ length: 7 }, (_, i) => i).filter(c => getAvailableRow(boardState, c) !== -1);
    if (!cols.length) break;
    let best = cols[0];
    for (const c of cols) {
      const r = getAvailableRow(boardState, c);
      if (r === -1) continue;
      const nb = boardState.map(row => [...row]);
      nb[r][c] = currentPlayer;
      if (checkWin(nb, currentPlayer, r, c)) { best = c; break; }
    }
    const r = getAvailableRow(boardState, best);
    if (r === -1) break;
    const newBoard = boardState.map(row => [...row]);
    newBoard[r][best] = currentPlayer;
    const won = checkWin(newBoard, currentPlayer, r, best);
    const draw = !won && isBoardFull(newBoard);
    await animateFallingDisc(boardEl, best, currentPlayer, r);
    boardState = newBoard;
    renderBoard(boardEl, boardState);
    if (won || draw) {
      const newFlat = flattenBoard(boardState);
      if (won) {
        gameActive = false;
        const result = getWinningCells(boardState);
        if (result) pulseWinningCells(boardEl, result.cells);
        startConfetti();
        setInfo('You win! 🎉');
        setSubInfo('You can restart the game using the button below.');
        if (playerNumber === 1) setRestartVisible(true);
      } else {
        gameActive = false;
        startConfetti();
        setInfo("It's a draw!");
        setSubInfo('You can restart the game using the button below.');
        if (playerNumber === 1) setRestartVisible(true);
      }
      isAnimating = false;
      try {
        await updateDoc(doc(db, 'games', gameId), {
          board: newFlat,
          currentPlayer: currentPlayer,
          status: 'finished',
          winner: won ? currentPlayer : 0,
          draw: draw,
        });
        pendingMoveFlat = newFlat;
      } catch(err) { console.error(err); }
      return;
    }
  }
  isAnimating = false;
}

export async function requestOnlineRestart() {
  if (playerNumber !== 1 || !gameId) return;

  try {
    setRestartVisible(false);
    clearWinningPulse(boardEl);
    stopConfetti();

    await updateDoc(doc(db, 'games', gameId), { restartRequest: true });
  } catch (err) {
    console.error('Restart failed:', err);
    setRestartVisible(true);
  }
}

async function handleRemoteRestart(data) {
  if (playerNumber === 1) {
    try {
      await animateRestart(boardEl);

      boardState = createEmptyBoard();
      currentPlayer = 1;
      gameActive = true;
      isAnimating = false;
      isRestarting = false;
      pendingMoveFlat = null;
      initBoardElement(boardEl, false);
      boardEl.style.opacity = '1';
      setInfo('Your turn!');
      setSubInfo('');
      renderLeaderboard();

      await updateDoc(doc(db, 'games', gameId), {
        restartRequest: false,
        board: flattenBoard(createEmptyBoard()),
        currentPlayer: 1,
        status: 'playing',
        winner: 0,
        draw: false,
      });
    } catch (err) {
      console.error('Restart reset failed:', err);
    }
    return;
  }

  isRestarting = true;
  clearWinningPulse(boardEl);
  stopConfetti();
  setInfo('Opponent is restarting the game…');
  setSubInfo('');

  await new Promise(r => setTimeout(r, 600));
  await animateRestart(boardEl);

  boardState = createEmptyBoard();
  currentPlayer = 1;
  gameActive = false;
  isAnimating = false;
  pendingMoveFlat = null;
  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';
  setRestartVisible(false);
  setInfo("Waiting for opponent…");
  setSubInfo('');
  await new Promise(r => setTimeout(r, 200));
  isRestarting = false;
}

function opponentLeft() {
  gameActive = false;
  stopConfetti();
  setRestartVisible(false);
  setInfo('Your opponent left the game.');
  setSubInfo('');
}

export function clearOnlineBoard() {
  gameActive = false;
  isAnimating = false;
  if (boardEl) {
    boardEl.querySelectorAll('.cell').forEach(cell => {
      delete cell.dataset.player;
      cell.classList.remove('winning');
    });
  }
}

export async function leaveOnlineGame() {
  isSelfLeaving = true;
  if (unsubGame) { unsubGame(); unsubGame = null; }

  if (gameId) {
    try {
      const snap = await getDoc(doc(db, 'games', gameId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.player1 === auth.currentUser.uid) {
          await deleteDoc(doc(db, 'games', gameId));
        } else {
          await updateDoc(doc(db, 'games', gameId), { leftGame: true });
        }
      }
    } catch (err) {
      console.error('Leave error:', err);
    }
  }

  gameId = null;
  playerNumber = 0;
  boardState = createEmptyBoard();
  gameActive = false;
  leaderboard.p1 = 0;
  leaderboard.p2 = 0;
  leaderboard.draws = 0;
}

export async function cancelWaiting() {
  if (unsubGame) { unsubGame(); unsubGame = null; }
  if (gameId) {
    try { await deleteDoc(doc(db, 'games', gameId)); } catch (_) {}
  }
  gameId = null;
  playerNumber = 0;
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

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

function setRestartVisible(visible) {
  restartBtn.style.display = visible ? 'inline-flex' : 'none';
}