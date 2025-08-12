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
const leaveGameBtn = document.getElementById('leave-game-btn');

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

function unflattenBoard(flatBoard) {
  const newBoard = [];
  while (flatBoard.length) {
    newBoard.push(flatBoard.splice(0, COLS));
  }
  return newBoard;
}

function generateRoomCode(length = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- Event Listeners ---

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
    multiplayerStatus.textContent = "Please enter a game code.";
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

// Leave button toggling & logic
if (leaveGameBtn) {
  leaveGameBtn.addEventListener('click', async () => {
    if (!gameId) return;

    try {
      // Delete or reset the game to effectively kick players
      await updateDoc(doc(db, "games", gameId), {
        status: "finished"
      });
    } catch (err) {
      console.error("Error leaving game:", err);
    }
    resetToStart();
  });
}

// --- Functions ---

function updateInfo(text) {
  infoDiv.classList.add('fade-out');
  setTimeout(() => {
    infoDiv.textContent = text;
    infoDiv.classList.remove('fade-out');
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

  await createFallingDisc(col, currentPlayer, row);

  boardState[row][col] = currentPlayer;
  drawBoard();

  if (checkWin(row, col, currentPlayer)) {
    await updateDoc(doc(db, "games", gameId), {
      board: boardState.flat(),
      status: "finished",
      winner: currentPlayer
    });
    updateInfo(`Player ${currentPlayer} wins!`);
    gameActive = false;
  } else if (checkDraw()) {
    await updateDoc(doc(db, "games", gameId), {
      board: boardState.flat(),
      status: "finished",
      winner: 0
    });
    updateInfo("Draw game.");
    gameActive = false;
  } else {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    await updateDoc(doc(db, "games", gameId), {
      board: boardState.flat(),
      currentPlayer: currentPlayer
    });
    updateInfo(`Player ${currentPlayer}'s turn.`);
  }

  isAnimating = false;
}

function getAvailableRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (boardState[r][col] === 0) return r;
  }
  return -1;
}

function checkWin(row, col, player) {
  return (
    checkDirection(row, col, player, 1, 0) ||  // vertical
    checkDirection(row, col, player, 0, 1) ||  // horizontal
    checkDirection(row, col, player, 1, 1) ||  // diagonal /
    checkDirection(row, col, player, 1, -1)    // diagonal \
  );
}

function checkDirection(row, col, player, dRow, dCol) {
  let count = 1;

  for (let i = 1; i < 4; i++) {
    const r = row + dRow * i;
    const c = col + dCol * i;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || boardState[r][c] !== player) break;
    count++;
  }
  for (let i = 1; i < 4; i++) {
    const r = row - dRow * i;
    const c = col - dCol * i;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || boardState[r][c] !== player) break;
    count++;
  }

  return count >= 4;
}

function checkDraw() {
  return boardState.every(row => row.every(cell => cell !== 0));
}

function startGame() {
  multiplayerStatus.textContent = "";
  joinInputSection.style.display = "none";
  roomCodeDisplay.style.display = "none";
  multiplayerOptions.style.display = "none";
  multiplayerScreen.style.display = "flex";

  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  drawBoard();

  gameActive = true;
  currentPlayer = 1;

  updateInfo(`Player ${currentPlayer}'s turn.`);

  listenForGameUpdates();
  showLeaveButton(true);
}

function waitForOpponent() {
  unsubscribeWaitListener = onSnapshot(doc(db, "games", gameId), (docSnap) => {
    if (!docSnap.exists()) {
      multiplayerStatus.textContent = "Game canceled.";
      unsubscribeWaitListener();
      return;
    }

    const data = docSnap.data();
    if (data.status === "playing") {
      unsubscribeWaitListener();
      startGame();
    }
  });
}

function listenForGameUpdates() {
  unsubscribeGameListener = onSnapshot(doc(db, "games", gameId), (docSnap) => {
    if (!docSnap.exists()) {
      updateInfo("Game ended or canceled.");
      cleanupListeners();
      resetToStart();
      return;
    }

    const data = docSnap.data();
    if (!data) return;

    boardState = unflattenBoard([...data.board]);
    currentPlayer = data.currentPlayer;
    drawBoard();

    if (data.status === "finished") {
      gameActive = false;
      if (data.winner === 0) {
        updateInfo("Game ended in a draw.");
      } else {
        updateInfo(`Player ${data.winner} wins!`);
      }
      showLeaveButton(true);
    } else {
      gameActive = true;
      updateInfo(`Player ${currentPlayer}'s turn.`);
      showLeaveButton(true);
    }
  });
}

function cleanupListeners() {
  if (unsubscribeGameListener) {
    unsubscribeGameListener();
    unsubscribeGameListener = null;
  }
  if (unsubscribeWaitListener) {
    unsubscribeWaitListener();
    unsubscribeWaitListener = null;
  }
}

function resetToStart() {
  cleanupListeners();
  gameActive = false;
  currentPlayer = 1;
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  drawBoard();

  multiplayerScreen.style.display = "none";
  multiplayerOptions.style.display = "flex";
  joinInputSection.style.display = "none";
  roomCodeDisplay.style.display = "none";
  multiplayerStatus.textContent = "";
  joinCodeInput.value = "";
  showLeaveButton(false);
  gameId = null;
  playerNumber = 0;
}

function showLeaveButton(show) {
  if (!leaveGameBtn) return;
  if (show) {
    leaveGameBtn.classList.add('visible');
  } else {
    leaveGameBtn.classList.remove('visible');
  }
}

// Initialize board at load
drawBoard();