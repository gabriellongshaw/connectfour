import { collection, addDoc, getDoc, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = window.firebaseDB;

// DOM Elements
const multiplayerScreen = document.getElementById('multiplayer-screen');
const multiplayerOptions = document.getElementById('multiplayer-options');
const createGameBtn = document.getElementById('create-game-btn');
const showJoinScreenBtn = document.getElementById('show-join-screen-btn');
const joinInputSection = document.getElementById('join-input-section');
const joinCodeInput = document.getElementById('join-code-input');
const joinGameBtn = document.getElementById('join-game-btn');
const backToOptionsBtn = document.getElementById('back-to-options-btn');
const multiplayerStatus = document.getElementById('multiplayer-status');
const roomCodeDisplay = document.getElementById('room-code-display');
const roomCodeSpan = document.getElementById('room-code');
const backToStartBtn = document.getElementById('back-to-start-btn');
const gameContainer = document.getElementById('game-container');
const boardDiv = document.getElementById('board');
const infoDiv = document.getElementById('info');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('overlay');
const playAgainBtn = document.getElementById('playAgainBtn');
const startScreen = document.getElementById('start-screen');

// Game State
const ROWS = 6;
const COLS = 7;
let gameId = null;
let playerNumber = null;
let currentPlayer = 1;
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let isAnimating = false;
let gameActive = false;
let unsubscribeGameListener = null;
let unsubscribeWaitListener = null;

// Firebase Listeners
createGameBtn.addEventListener('click', async () => {
  multiplayerStatus.textContent = "Creating game...";
  const docRef = await addDoc(collection(db, "games"), {
    board: boardState,
    currentPlayer: 1,
    status: "waiting",
    winner: 0
  });
  gameId = docRef.id;
  playerNumber = 1;

  await window.fadeOut(multiplayerOptions);
  multiplayerOptions.style.display = 'none';
  
  roomCodeSpan.textContent = gameId;
  roomCodeDisplay.style.display = 'flex';
  await window.fadeIn(roomCodeDisplay);
  
  multiplayerStatus.textContent = "Game created! Waiting for opponent...";
  waitForOpponent();
});

showJoinScreenBtn.addEventListener('click', async () => {
  await window.fadeOut(multiplayerOptions);
  multiplayerOptions.style.display = 'none';

  joinInputSection.style.display = 'flex';
  await window.fadeIn(joinInputSection);
});

joinGameBtn.addEventListener('click', async () => {
  const id = joinCodeInput.value.trim();
  if (!id) {
    multiplayerStatus.textContent = "Please enter a game ID.";
    return;
  }
  multiplayerStatus.textContent = "Joining game...";
  const gameRef = doc(db, "games", id);
  const snapshot = await getDoc(gameRef);

  if (!snapshot.exists() || snapshot.data().status !== "waiting") {
    multiplayerStatus.textContent = "Game not found or already started.";
    return;
  }

  gameId = id;
  playerNumber = 2;
  await updateDoc(gameRef, { status: "playing" });
  startGame();
});

backToOptionsBtn.addEventListener('click', async () => {
  await window.fadeOut(joinInputSection);
  joinInputSection.style.display = 'none';

  multiplayerStatus.textContent = "";

  multiplayerOptions.style.display = 'flex';
  await window.fadeIn(multiplayerOptions);
});

backToStartBtn.addEventListener('click', async () => {
  await window.fadeOut(multiplayerScreen);
  multiplayerScreen.style.display = 'none';
  
  startScreen.style.display = 'flex';
  await window.fadeIn(startScreen);
});

// Game Board Event Listener
boardDiv.addEventListener('click', e => {
  if (e.target.classList.contains('cell') && !isAnimating) {
    const col = Number(e.target.dataset.col);
    handleMove(col);
  }
});

// Restart Buttons
restartBtn.addEventListener('click', async () => {
  if (!gameActive) {
    await updateDoc(doc(db, "games", gameId), {
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      currentPlayer: 1,
      status: "playing",
      winner: 0
    });
  }
});
playAgainBtn.addEventListener('click', async () => {
  if (!gameActive) {
    hideGameOver();
    await updateDoc(doc(db, "games", gameId), {
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      currentPlayer: 1,
      status: "playing",
      winner: 0
    });
  }
});


// Game Logic Functions
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
  if (!gameActive || playerNumber !== currentPlayer || isAnimating) return;

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
    board: tempBoard,
    currentPlayer: newPlayer,
    status: (winner || isDraw) ? "finished" : "playing",
    winner: winner ? currentPlayer : 0
  };

  await updateDoc(gameRef, updateData);
  isAnimating = false;
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

function showGameOver(message) {
  const messageEl = overlay.querySelector('.message');
  if (messageEl) {
    messageEl.textContent = message;
  }
  overlay.classList.add('visible');
}

function hideGameOver() {
  overlay.classList.remove('visible');
}

// Game Flow
async function startGame() {
  await window.fadeOut(multiplayerScreen);
  multiplayerScreen.style.display = 'none';

  gameContainer.style.opacity = 0;
  gameContainer.style.display = 'block';
  await window.fadeIn(gameContainer);

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
  const gameRef = doc(db, "games", gameId);

  if (unsubscribeGameListener) {
    unsubscribeGameListener();
  }

  unsubscribeGameListener = onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    if (JSON.stringify(boardState) !== JSON.stringify(data.board)) {
      animateOpponentMove(data.board);
    }
    
    boardState = data.board;
    currentPlayer = data.currentPlayer;
    gameActive = data.status === "playing";
    const winner = data.winner || 0;

    if (winner) {
      gameActive = false;
      showGameOver(`Player ${winner} wins! 🎉`);
      updateInfo(`Player ${winner} wins!`);
      restartBtn.style.display = 'inline-block';
    } else if (data.status === "finished") {
      gameActive = false;
      showGameOver("It's a draw!");
      updateInfo("It's a draw!");
      restartBtn.style.display = 'inline-block';
    } else {
      hideGameOver();
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
  const gameRef = doc(db, "games", gameId);
  if (unsubscribeWaitListener) {
    unsubscribeWaitListener();
  }

  unsubscribeWaitListener = onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (data.status === "playing") {
      unsubscribeWaitListener();
      unsubscribeWaitListener = null;
      startGame();
    }
  });
}
