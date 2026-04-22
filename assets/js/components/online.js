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

let gameId        = null;
let playerNumber  = 0;
let boardState    = createEmptyBoard();
let currentPlayer = 1;
let gameActive    = false;
let isAnimating   = false;
let unsubGame     = null;
let isSelfLeaving = false;

let pendingMoveFlat = null;

let boardEl, infoEl, restartBtn, statusEl;

export function initOnlineRefs(els) {
  boardEl    = els.boardEl;
  infoEl     = els.infoEl;
  restartBtn = els.restartBtn;
  statusEl   = els.statusEl;
}

export async function createGame(onWaiting, onGameStart) {
  setStatus('Creating game…');
  const code = generateCode(7);

  try {
    const ref = await addDoc(gamesRef, {
      code,
      player1:        auth.currentUser.uid,
      player2:        null,
      board:          flattenBoard(createEmptyBoard()),
      currentPlayer:  1,
      status:         'waiting',
      winner:         0,
      draw:           false,
      restartRequest: false,
    });

    gameId       = ref.id;
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
    const q    = query(gamesRef, where('code', '==', trimmed));
    const snap = await getDocs(q);

    if (snap.empty) { onError?.('Game not found. Check the code and try again.'); return; }

    const docSnap = snap.docs[0];
    const data    = docSnap.data();

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

    gameId       = docSnap.id;
    playerNumber = 2;

    await updateDoc(doc(db, 'games', gameId), {
      player2: auth.currentUser.uid,
      status:  'playing',
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
  boardState      = createEmptyBoard();
  currentPlayer   = 1;
  gameActive      = true;
  isAnimating     = false;
  isSelfLeaving   = false;
  pendingMoveFlat = null;

  clearWinningPulse(boardEl);
  stopConfetti();
  setRestartVisible(false);

  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';

  setInfo(playerNumber === 1 ? 'Your turn! (Red)' : 'Waiting for opponent… (Yellow)');

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

    if (data.restartRequest === true) {
      await handleRemoteRestart(data);
      return;
    }

    const newFlat = data.board;

    if (pendingMoveFlat !== null) {
      const isMine = newFlat.every((v, i) => v === pendingMoveFlat[i]);
      pendingMoveFlat = null;
      if (isMine && data.status !== 'finished') return;
    }

    const oldFlat = flattenBoard(boardState);
    let changedIdx = -1;
    for (let i = 0; i < newFlat.length; i++) {
      if (oldFlat[i] !== newFlat[i]) { changedIdx = i; break; }
    }

    if (changedIdx !== -1 && !isAnimating) {
      const placedRow   = Math.floor(changedIdx / COLS);
      const placedCol   = changedIdx % COLS;
      const movedPlayer = newFlat[changedIdx];

      isAnimating = true;
      await animateFallingDisc(boardEl, placedCol, movedPlayer, placedRow);
      boardState[placedRow][placedCol] = movedPlayer;
      isAnimating = false;
    } else if (changedIdx === -1) {
      boardState = unflattenBoard(newFlat);
    }

    boardState    = unflattenBoard(newFlat);
    currentPlayer = data.currentPlayer;

    renderBoard(boardEl, boardState);

    if (data.status === 'finished') {
      gameActive = false;
      boardState = unflattenBoard(newFlat);
      renderBoard(boardEl, boardState);
      if (data.winner && data.winner !== 0) {
        const result = getWinningCells(boardState);
        if (result) pulseWinningCells(boardEl, result.cells);
        if (data.winner !== playerNumber) {
          startConfetti();
          setInfo('You lost!');
        } else if (playerNumber === 2) {
          startConfetti();
          setInfo('You win! 🎉');
        }
      } else if (data.draw) {
        startConfetti();
        setInfo("It's a draw!");
      }
      if (playerNumber === 1) setRestartVisible(true);
      return;
    }

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

  const won        = checkWin(newBoard, currentPlayer, row, col);
  const draw       = !won && isBoardFull(newBoard);
  const nextPlayer = currentPlayer === 1 ? 2 : 1;
  const newFlat    = flattenBoard(newBoard);

  await animateFallingDisc(boardEl, col, currentPlayer, row);
  boardState = newBoard;

  renderBoard(boardEl, boardState);

  if (won) {
    gameActive = false;
    const result = getWinningCells(boardState);
    if (result) pulseWinningCells(boardEl, result.cells);
    startConfetti();
    setInfo('You win! 🎉');
    if (playerNumber === 1) setRestartVisible(true);
  } else if (draw) {
    gameActive = false;
    startConfetti();
    setInfo("It's a draw!");
    if (playerNumber === 1) setRestartVisible(true);
  } else {
    setInfo("Opponent's turn…");
  }

  isAnimating = false;

  try {
    pendingMoveFlat = newFlat;
    await updateDoc(doc(db, 'games', gameId), {
      board:         newFlat,
      currentPlayer: (won || draw) ? currentPlayer : nextPlayer,
      status:        (won || draw) ? 'finished' : 'playing',
      winner:        won ? currentPlayer : 0,
      draw:          draw,
    });
  } catch (err) {
    pendingMoveFlat = null;
    if (!won && !draw) {
      boardState[row][col] = 0;
      renderBoard(boardEl, boardState);
      gameActive = true;
      setInfo('Your turn!');
    }
    console.error('Move update failed:', err);
  }
}

export async function requestOnlineRestart() {
  if (playerNumber !== 1 || !gameId) return;

  try {
    setRestartVisible(false);
    clearWinningPulse(boardEl);
    stopConfetti();

    await animateRestart(boardEl);

    boardState    = createEmptyBoard();
    currentPlayer = 1;
    gameActive    = true;
    isAnimating   = false;
    pendingMoveFlat = null;
    initBoardElement(boardEl, false);
    boardEl.style.opacity = '1';
    setInfo('Your turn!');

    await updateDoc(doc(db, 'games', gameId), {
      restartRequest: true,
      board:          flattenBoard(createEmptyBoard()),
      currentPlayer:  1,
      status:         'playing',
      winner:         0,
      draw:           false,
    });
  } catch (err) {
    console.error('Restart failed:', err);
    setRestartVisible(true);
  }
}

async function handleRemoteRestart(data) {
  if (playerNumber === 1) {
    try {
      await updateDoc(doc(db, 'games', gameId), { restartRequest: false });
    } catch (err) {
      console.error('Could not clear restartRequest:', err);
    }
    return;
  }

  clearWinningPulse(boardEl);
  stopConfetti();
  setInfo('Opponent restarted the game…');

  await new Promise(r => setTimeout(r, 1800));
  await animateRestart(boardEl);

  boardState      = createEmptyBoard();
  currentPlayer   = 1;
  gameActive      = true;
  isAnimating     = false;
  pendingMoveFlat = null;
  initBoardElement(boardEl, false);
  boardEl.style.opacity = '1';
  setRestartVisible(false);
  setInfo("Opponent's turn…");
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
          await updateDoc(doc(db, 'games', gameId), { status: 'finished', winner: 0, draw: false });
        }
      }
    } catch (err) {
      console.error('Leave error:', err);
    }
  }

  gameId       = null;
  playerNumber = 0;
  boardState   = createEmptyBoard();
  gameActive   = false;
}

export async function cancelWaiting() {
  if (unsubGame) { unsubGame(); unsubGame = null; }
  if (gameId) {
    try { await deleteDoc(doc(db, 'games', gameId)); } catch (_) {}
  }
  gameId       = null;
  playerNumber = 0;
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

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

function setRestartVisible(visible) {
  restartBtn.style.display = visible ? 'inline-flex' : 'none';
}