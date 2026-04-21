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
} from './board.js';
import { startConfetti, stopConfetti } from './confetti.js';

const gamesRef = collection(db, 'games');

let gameId = null;
let playerNumber = 0;
let boardState = createEmptyBoard();
let currentPlayer = 1;
let gameActive = false;
let isAnimating = false;
let unsubGame = null;
let isSelfLeaving = false;
let lastSnapshot = null;

let boardEl, infoEl, restartBtn, leaveBtn, statusEl;

export function initOnlineRefs(els) {
  boardEl = els.boardEl;
  infoEl = els.infoEl;
  restartBtn = els.restartBtn;
  leaveBtn = els.leaveBtn;
  statusEl = els.statusEl;
}

export async function createGame(onWaiting, onGameStart) {
  statusEl.textContent = 'Creating game…';
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
      restartRequest: false,
    });

    gameId = ref.id;
    playerNumber = 1;
    statusEl.textContent = '';
    onWaiting(code);
    waitForOpponent(onGameStart);
  } catch (err) {
    statusEl.textContent = 'Could not create game. Please try again.';
    console.error(err);
  }
}

export async function joinGame(code, onGameStart) {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) { statusEl.textContent = 'Please enter a room code.'; return; }

  statusEl.textContent = 'Joining…';

  try {
    const q = query(gamesRef, where('code', '==', trimmed));
    const snap = await getDocs(q);

    if (snap.empty) {
      statusEl.textContent = 'Game not found. Check the code and try again.';
      return;
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.player1 === auth.currentUser.uid) {
      statusEl.textContent = 'You created this game — share the code with a friend!';
      return;
    }

    if (data.player2 && data.player2 !== auth.currentUser.uid) {
      statusEl.textContent = 'This game already has two players.';
      return;
    }

    if (data.status === 'finished') {
      statusEl.textContent = 'This game has already ended.';
      return;
    }

    gameId = docSnap.id;
    playerNumber = 2;

    if (data.player2 !== auth.currentUser.uid) {
      await updateDoc(doc(db, 'games', gameId), {
        player2: auth.currentUser.uid,
        status: 'playing',
      });
    }

    statusEl.textContent = '';
    onGameStart();
    startOnlineGame();
  } catch (err) {
    statusEl.textContent = 'Error joining game. Please try again.';
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
  lastSnapshot = null;
  isSelfLeaving = false;

  clearWinningPulse(boardEl);
  stopConfetti();
  setRestartVisible(false);

  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';
  boardEl.style.display = 'grid';

  setInfo(playerNumber === 1 ? "Your turn! (Red)" : "Waiting for opponent… (Yellow)");

  subscribeToGame();
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
    const prev = lastSnapshot;
    lastSnapshot = data;

    if (data.restartRequest === true && prev?.restartRequest !== true) {
      await handleRemoteRestart(data);
      return;
    }

    const newBoard = unflattenBoard(data.board);
    const prevFlat = prev ? prev.board : flattenBoard(createEmptyBoard());
    const newFlat = data.board;

    let changedIdx = -1;
    for (let i = 0; i < newFlat.length; i++) {
      if (prevFlat[i] !== newFlat[i]) { changedIdx = i; break; }
    }

    if (changedIdx !== -1) {
      const placedRow = Math.floor(changedIdx / COLS);
      const placedCol = changedIdx % COLS;
      const movedPlayer = newFlat[changedIdx];

      if (boardState[placedRow][placedCol] !== movedPlayer && !isAnimating) {
        isAnimating = true;
        await animateFallingDisc(boardEl, placedCol, movedPlayer, placedRow);
        isAnimating = false;
      }
    }

    boardState = newBoard;
    currentPlayer = data.currentPlayer;

    if (data.status === 'finished') {
      gameActive = false;
      renderBoard(boardEl, boardState);
      if (data.winner) {
        const result = getWinningCells(boardState);
        if (result) pulseWinningCells(boardEl, result.cells);
        startConfetti();
        setInfo(data.winner === playerNumber ? 'You win! 🎉' : 'Opponent wins!');
      } else {
        clearWinningPulse(boardEl);
        setInfo("It's a draw!");
        startConfetti();
      }
      if (playerNumber === 1) setRestartVisible(true);
      return;
    }

    renderBoard(boardEl, boardState);
    clearWinningPulse(boardEl);
    gameActive = true;
    setInfo(currentPlayer === playerNumber ? 'Your turn!' : "Opponent's turn…");
  });
}

export async function handleOnlineMove(col) {
  if (!gameActive || isAnimating || currentPlayer !== playerNumber || !gameId) return;

  const row = getAvailableRow(boardState, col);
  if (row === -1) return;

  isAnimating = true;

  const newBoard = boardState.map(r => [...r]);
  newBoard[row][col] = currentPlayer;

  const won = checkWin(newBoard, currentPlayer, row, col);
  const draw = !won && isBoardFull(newBoard);
  const nextPlayer = currentPlayer === 1 ? 2 : 1;

  await animateFallingDisc(boardEl, col, currentPlayer, row);
  boardState[row][col] = currentPlayer;
  renderBoard(boardEl, boardState);

  const updatedDoc = {
    board: flattenBoard(newBoard),
    currentPlayer: (won || draw) ? currentPlayer : nextPlayer,
    status: (won || draw) ? 'finished' : 'playing',
    winner: won ? currentPlayer : 0,
  };

  lastSnapshot = { ...lastSnapshot, ...updatedDoc };

  if (won) {
    gameActive = false;
    boardState = newBoard;
    renderBoard(boardEl, boardState);
    const result = getWinningCells(boardState);
    if (result) pulseWinningCells(boardEl, result.cells);
    startConfetti();
    setInfo('You win! 🎉');
    if (playerNumber === 1) setRestartVisible(true);
  } else if (draw) {
    gameActive = false;
    boardState = newBoard;
    renderBoard(boardEl, boardState);
    setInfo("It's a draw!");
    startConfetti();
    if (playerNumber === 1) setRestartVisible(true);
  }

  isAnimating = false;

  try {
    await updateDoc(doc(db, 'games', gameId), updatedDoc);
  } catch (err) {
    boardState[row][col] = 0;
    renderBoard(boardEl, boardState);
    clearWinningPulse(boardEl);
    stopConfetti();
    gameActive = true;
    setRestartVisible(false);
    setInfo('Your turn!');
    console.error('Move update failed:', err);
  }
}

export async function requestOnlineRestart() {
  if (playerNumber !== 1 || !gameId) {
    setInfo('Only the host (Player 1) can restart.');
    return;
  }

  try {
    setRestartVisible(false);
    clearWinningPulse(boardEl);
    stopConfetti();

    await animateRestart(boardEl);

    boardState = createEmptyBoard();
    currentPlayer = 1;
    gameActive = true;
    isAnimating = false;
    initBoardElement(boardEl, false);
    boardEl.style.opacity = '1';
    setInfo('Your turn!');

    const resetDoc = {
      restartRequest: true,
      board: flattenBoard(createEmptyBoard()),
      currentPlayer: 1,
      status: 'playing',
      winner: 0,
    };
    lastSnapshot = { ...lastSnapshot, ...resetDoc };

    await updateDoc(doc(db, 'games', gameId), resetDoc);
  } catch (err) {
    console.error('Restart failed:', err);
    setRestartVisible(true);
  }
}

async function handleRemoteRestart(data) {
  if (playerNumber === 1) {
    lastSnapshot = { ...data, restartRequest: false };
    try {
      await updateDoc(doc(db, 'games', gameId), { restartRequest: false });
    } catch (err) {
      console.error('Could not clear restartRequest:', err);
    }
    return;
  }

  await animateRestart(boardEl);

  boardState = createEmptyBoard();
  currentPlayer = 1;
  gameActive = true;
  isAnimating = false;
  clearWinningPulse(boardEl);
  stopConfetti();
  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';
  setRestartVisible(false);
  setInfo("Opponent's turn…");
  lastSnapshot = { ...data, restartRequest: false };
}

function opponentLeft() {
  gameActive = false;
  stopConfetti();
  startConfetti();
  setInfo('Opponent left. You win! 🎉');
  if (playerNumber === 1) setRestartVisible(true);
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
          await updateDoc(doc(db, 'games', gameId), { status: 'finished', winner: 0 });
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
}

export async function cancelWaiting() {
  if (unsubGame) { unsubGame(); unsubGame = null; }
  if (gameId) {
    try { await deleteDoc(doc(db, 'games', gameId)); } catch (_) {}
  }
  gameId = null;
  playerNumber = 0;
}

function setInfo(text) {
  infoEl.style.opacity = '0';
  setTimeout(() => {
    infoEl.textContent = text;
    infoEl.style.opacity = '1';
  }, 180);
}

function setRestartVisible(visible) {
  restartBtn.style.display = visible ? 'inline-flex' : 'none';
}
