import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const multiplayerScreen = document.getElementById('multiplayer-screen');
const multiplayerOptions = document.getElementById('multiplayer-options');
const joinInputSection = document.getElementById('join-input-section');
const roomCodeDisplay = document.getElementById('room-code-display');
const multiplayerStatus = document.getElementById('multiplayer-status');
const createGameBtn = document.getElementById('create-game-btn');
const showJoinScreenBtn = document.getElementById('show-join-screen-btn');
const joinCodeInput = document.getElementById('join-code-input');
const joinGameBtn = document.getElementById('join-game-btn');
const backToOptionsBtn = document.getElementById('back-to-options-btn');
const backToStartBtn = document.getElementById('back-to-start-btn');
const backToStartFromMultiplayerBtn = document.getElementById('back-to-start-from-multiplayer'); 
const boardDiv = document.getElementById('board');
const infoDiv = document.getElementById('info');
const restartBtn = document.getElementById('restartBtn');
const gameContainer = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const roomCodeSpan = document.getElementById('room-code');

const ROWS = 6;
const COLS = 7;

const db = window.firebaseDB;
const gamesCollection = collection(db, "games");

let currentPlayer = 1;
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let gameActive = false;
let isAnimating = false;
let gameId = null;
let playerNumber = 0;
let unsubscribeWaitListener = null;
let unsubscribeGameListener = null;

const unflattenBoard = (flatBoard) => {
  const newBoard = [];
  while (flatBoard.length) {
    newBoard.push(flatBoard.splice(0, COLS));
  }
  return newBoard;
};

function generateRoomCode(length = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

createGameBtn.addEventListener('click', async () => {
  try {
    const shortCode = generateRoomCode(7);

    const newGameRef = await addDoc(gamesCollection, {
      shortCode: shortCode,
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)).flat(),
      currentPlayer: 1,
      status: "waiting",
      winner: 0
    });

    gameId = newGameRef.id;
    playerNumber = 1;

    await window.fadeOut(multiplayerOptions);

    roomCodeSpan.textContent = shortCode;
    multiplayerStatus.textContent = "Game created! Waiting for opponent...";

    await window.fadeIn(roomCodeDisplay, 'flex');

    waitForOpponent();
  } catch (err) {
    console.error("Error creating game:", err);
    multiplayerStatus.textContent = "Error creating game. Try again.";
  }
});

showJoinScreenBtn.addEventListener('click', async () => {
  await window.fadeOut(multiplayerOptions);
  await window.fadeIn(joinInputSection, 'flex');
});

joinGameBtn.addEventListener('click', async () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) {
    multiplayerStatus.textContent = "Please enter a game ID.";
    return;
  }

  try {
    multiplayerStatus.textContent = "Joining game...";

    const q = query(gamesCollection, where("shortCode", "==", code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      multiplayerStatus.textContent = "Game not found or already started.";
      return;
    }

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();

    if (!data || data.status !== "waiting") {
      multiplayerStatus.textContent = "Game not found or already started.";
      return;
    }

    gameId = docSnap.id;
    playerNumber = 2;

    await updateDoc(doc(db, "games", gameId), { status: "playing" });

    await window.fadeOut(joinInputSection);
    multiplayerStatus.textContent = "";
    await window.fadeIn(gameContainer, 'block');

    startGame();
  } catch (err) {
    console.error("Error joining game:", err);
    multiplayerStatus.textContent = "Error joining game. Try again.";
  }
});

if (backToStartFromMultiplayerBtn) {
  backToStartFromMultiplayerBtn.addEventListener('click', async () => {
    await window.fadeOut(multiplayerScreen);
    multiplayerStatus.textContent = "";
    joinCodeInput.value = "";
    await window.fadeIn(startScreen, 'flex');
  });
}

backToOptionsBtn.addEventListener('click', async () => {
  await window.fadeOut(joinInputSection);
  multiplayerStatus.textContent = "";
  await window.fadeIn(multiplayerOptions, 'flex');
});

backToStartBtn.addEventListener('click', async () => {
  await window.fadeOut(roomCodeDisplay);
  multiplayerStatus.textContent = "";
  await window.fadeIn(multiplayerOptions, 'flex');
});

boardDiv.addEventListener('click', e => {
  if (e.target.classList.contains('cell') && !isAnimating) {
    const col = Number(e.target.dataset.col);
    handleMove(col);
  }
});

restartBtn.addEventListener('click', async () => {
  if (!gameActive && gameId) {
    try {
      await updateDoc(doc(db, "games", gameId), {
        board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)).flat(),
        currentPlayer: 1,
        status: "playing",
        winner: 0
      });
    } catch (err) {
      console.error("Error restarting:", err);
    }
  }
});

function updateInfo(text) {
  infoDiv.style.opacity = 0;
  setTimeout(() => {
    infoDiv.textContent = text;
    infoDiv.style.opacity = 1;
  }, 200);
}

function drawBoard() {
  boardDiv.innerHTML = '';
  boardDiv.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  boardState.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cellDiv = document.createElement('div');
      cellDiv.classList.add('cell');
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;
      if (cell !== 0) {
        cellDiv.dataset.player = cell;
      }
      boardDiv.appendChild(cellDiv);
    });
  });
}

function createFallingDisc(col, player, targetRow) {
  return new Promise((resolve) => {
    const disc = document.createElement('div');
    disc.classList.add('falling-disc', player === 1 ? 'red' : 'yellow');
    boardDiv.appendChild(disc);

    const cell = boardDiv.querySelector(`.cell[data-row="${targetRow}"][data-col="${col}"]`);
    if (!cell) {

      disc.remove();
      resolve();
      return;
    }
    const boardRect = boardDiv.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const startX = cellRect.left - boardRect.left;
    const startY = -cellRect.height * 1.5;
    const endY = cellRect.top - boardRect.top;

    disc.style.left = `${startX}px`;
    disc.style.top = `${startY}px`;

    const duration = 300;
    let startTime = null;

    function easeOutQuad(t) {
      return t * (2 - t);
    }

    function animate(time) {
      if (!startTime) startTime = time;
      let elapsed = time - startTime;
      if (elapsed > duration) elapsed = duration;
      let progress = elapsed / duration;
      let easedProgress = easeOutQuad(progress);

      let currentY = startY + (endY - startY) * easedProgress;
      disc.style.top = `${currentY}px`;

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        disc.remove();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

async function handleMove(col) {
  if (!gameActive || playerNumber !== currentPlayer || isAnimating || !gameId) return;

  const row = getAvailableRow(col);
  if (row === -1) return;

  isAnimating = true;

  const tempBoard = JSON.parse(JSON.stringify(boardState));
  tempBoard[row][col] = currentPlayer;

  await createFallingDisc(col, currentPlayer, row);

  const gameRef = doc(db, "games", gameId);
  const newPlayer = currentPlayer === 1 ? 2 : 1;

  const winner = checkWin(tempBoard, currentPlayer, row, col);
  const isDraw = tempBoard.flat().every(cell => cell !== 0);

  const updateData = {
    board: tempBoard.flat(),
    currentPlayer: newPlayer,
    status: (winner || isDraw) ? "finished" : "playing",
    winner: winner ? currentPlayer : 0
  };

  try {
    await updateDoc(gameRef, updateData);
  } catch (err) {
    console.error("Error updating game after move:", err);
  } finally {
    isAnimating = false;
  }
}

function getAvailableRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (boardState[r][col] === 0) return r;
  }
  return -1;
}

function checkWin(board, player, lastRow, lastCol) {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }
  ];

  for (const { dr, dc } of directions) {
    let count = 1;
    let r = lastRow + dr;
    let c = lastCol + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = lastRow - dr;
    c = lastCol - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= 4) return true;
  }
  return false;
}

async function startGame() {
  await window.fadeOut(multiplayerScreen);
  await window.fadeIn(gameContainer, 'block');
  gameActive = true;
  drawBoard();
  updateInfo(`Player ${currentPlayer}'s turn`);

  if (playerNumber === 1) {
    infoDiv.textContent = `You are Player 1 (Red). Waiting for opponent...`;
  } else {
    infoDiv.textContent = `You are Player 2 (Yellow). Game started.`;
  }

  subscribeToGame();
}

function subscribeToGame() {
  if (!gameId) return;

  const gameRef = doc(db, "games", gameId);
  if (unsubscribeGameListener) {
    unsubscribeGameListener();
  }

  unsubscribeGameListener = onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    const receivedBoard = unflattenBoard([...data.board]);

    if (JSON.stringify(boardState) !== JSON.stringify(receivedBoard)) {
      animateOpponentMove(receivedBoard);
    }

    boardState = receivedBoard;
    currentPlayer = data.currentPlayer;
    gameActive = data.status === "playing";
    const winner = data.winner || 0;

    if (winner) {
      gameActive = false;
      updateInfo(`Player ${winner} wins!`);
      restartBtn.style.display = 'inline-block';
    } else if (data.status === "finished") {
      gameActive = false;
      updateInfo("It's a draw!");
      restartBtn.style.display = 'inline-block';
    } else {
      updateInfo(gameActive ? `Player ${currentPlayer}'s turn` : 'Waiting for game...');
      restartBtn.style.display = 'none';
      if (playerNumber === currentPlayer) {
        infoDiv.textContent = `Your turn!`;
      } else {
        infoDiv.textContent = `Player ${currentPlayer}'s turn`;
      }
    }
    drawBoard();
  });
}

async function animateOpponentMove(newBoard) {
  const oldFlat = boardState.flat();
  const newFlat = newBoard.flat();
  let placedDiscIndex = -1;

  for (let i = 0; i < oldFlat.length; i++) {
    if (oldFlat[i] !== newFlat[i]) {
      placedDiscIndex = i;
      break;
    }
  }

  if (placedDiscIndex !== -1) {
    const placedRow = Math.floor(placedDiscIndex / COLS);
    const placedCol = placedDiscIndex % COLS;
    const playerWhoMoved = newBoard[placedRow][placedCol];

    isAnimating = true;
    await createFallingDisc(placedCol, playerWhoMoved, placedRow);
    isAnimating = false;
  }
}

function waitForOpponent() {
  if (!gameId) return;

  const gameRef = doc(db, "games", gameId);
  if (unsubscribeWaitListener) {
    unsubscribeWaitListener();
  }

  unsubscribeWaitListener = onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (data.status === "playing") {
      if (unsubscribeWaitListener) {
        unsubscribeWaitListener();
        unsubscribeWaitListener = null;
      }
      startGame();
    }
  });
}