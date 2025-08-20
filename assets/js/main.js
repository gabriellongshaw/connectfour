import {doc, getDoc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const startScreen = document.getElementById('start-screen');
const multiplayerScreen = document.getElementById('multiplayer-screen');
const gameContainer = document.getElementById('game-container');
const playOfflineBtn = document.getElementById('play-offline');
const playOnlineBtn = document.getElementById('play-online');
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
const leaveGameBtn = document.getElementById('leaveGameBtn');
const roomCodeSpan = document.getElementById('room-code');
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
const restartMessage = document.getElementById('restart-message');

const ROWS = 6;
const COLS = 7;

let gameMode = null;
let currentPlayer = 1;
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let gameActive = false;
let isAnimating = false;
let confettiParticles = [];
let confettiActive = false;
let isRestarting = false; 

const db = window.firebaseDB;
const gamesCollection = collection(db, "games");

let gameId = null;
let playerNumber = 0;
let unsubscribeWaitListener = null;
let unsubscribeGameListener = null;

let lastGameData = null;

let iInitiatedLeave = false;
let onlineEventsBound = false; 

const playerColors = {
  1: 'Red',
  2: 'Yellow'
};

window.fadeOut = (element, duration = 400) => {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 0;
  return new Promise(resolve => setTimeout(() => {
    element.style.display = 'none';
    resolve();
  }, duration));
};

window.fadeIn = (element, displayType = 'flex', duration = 400) => {
  element.style.opacity = 0;
  element.style.display = displayType;
  element.style.transition = `opacity ${duration}ms`;
  void element.offsetWidth;
  element.style.opacity = 1;
  return new Promise(resolve => setTimeout(resolve, duration));
};

function showRestartButton() {
  restartBtn.style.pointerEvents = "auto"; 
  restartBtn.classList.remove("fade-out");
  restartBtn.classList.add(gameMode === "online" ? "visible" : "offline");

  requestAnimationFrame(() => restartBtn.classList.add("fade-in"));
}

function hideRestartButton() {
  restartBtn.classList.remove("fade-in");
  restartBtn.classList.add("fade-out");

  setTimeout(() => {
    restartBtn.classList.remove("visible", "offline", "fade-out");
    restartBtn.style.pointerEvents = "none"; 
  }, 400); 
}

function showRestartMessage() {
  restartMessage.textContent = "Player 1 restarted the game.";
  restartMessage.classList.add('visible');
  setTimeout(() => {
      restartMessage.classList.remove('visible');
  }, 2000); 
}

function resetUIForNewOnlineGame() {
  lastGameData = null;
  gameActive = true;           
  isAnimating = false;
  currentPlayer = 1;
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  hideWinningPulse();
  stopConfetti();
  updateInfo('');

  restartBtn.classList.remove ('visible');
  leaveGameBtn.classList.remove('hidden');
  initBoard();
}

function initGame(mode) {
  gameMode = mode;
  if (gameMode === 'offline') {
    initOfflineGame();
  } else if (gameMode === 'online') {
    initOnlineGame();
  }
}

function initOfflineGame() {
  restartBtn.style.display = 'inline-block';
  restartBtn.classList.remove('visible', 'fade-in', 'fade-out');
  restartBtn.classList.add('offline');
  restartBtn.style.pointerEvents = "auto"; 

  leaveGameBtn.classList.remove('hidden');
  window.fadeIn(boardDiv, 'grid');
  updateInfo(`Player ${currentPlayer}'s turn (${playerColors[currentPlayer]})`);
}

function initOnlineGame() {
  leaveGameBtn.classList.remove('hidden');
  addOnlineEventListeners();
  multiplayerStatus.textContent = "";
  joinCodeInput.value = "";
}

function addOnlineEventListeners() {
  if (onlineEventsBound) return; 
  onlineEventsBound = true;

  createGameBtn.addEventListener('click', createGame);
  showJoinScreenBtn.addEventListener('click', showJoinScreen);
  joinGameBtn.addEventListener('click', joinGame);
  backToOptionsBtn.addEventListener('click', backToOptions);
  backToStartBtn.addEventListener('click', backToStartFromRoomCode);
  backToStartFromMultiplayerBtn.addEventListener('click', backToStartFromMultiplayer);
  leaveGameBtn.addEventListener('click', leaveGame);
}

let firstInit = true;

function initBoard() {
  hideWinningPulse();
  boardDiv.innerHTML = '';
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  boardDiv.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardDiv.appendChild(cell);

      if (firstInit) {
        cell.style.opacity = 0;
        setTimeout(() => {
          cell.style.transition = 'opacity 0.3s ease';
          cell.style.opacity = 1;
        }, 10);
      } else {
        cell.style.opacity = 1;
      }
    }
  }

  firstInit = false; 
  gameActive = true;
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

function updateOnlineBoard() {
  boardState.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cellDiv = boardDiv.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cellDiv) {
        if (cell !== 0) {
          cellDiv.dataset.player = cell;
        } else {
          cellDiv.removeAttribute('data-player');
        }
      }
    });
  });
}

function getAvailableRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (boardState[r][col] === 0) return r;
  }
  return -1;
}

function updateInfo(text) {
  infoDiv.style.opacity = 0;
  setTimeout(() => {
    infoDiv.textContent = text;
    infoDiv.style.opacity = 1;
  }, 200);
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

function getWinningCells(player) {
  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (boardState[r][c] !== player) continue;
      for (const { r: dr, c: dc } of directions) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        const winningCells = [[r, c]];

        while (
          rr >= 0 && rr < ROWS &&
          cc >= 0 && cc < COLS &&
          boardState[rr][cc] === player
        ) {
          winningCells.push([rr, cc]);
          count++;
          rr += dr;
          cc += dc;
        }

        if (count >= 4) return winningCells;
      }
    }
  }
  return null;
}

function pulseWinningCells(cells) {
  cells.forEach(([r, c]) => {
    const cell = boardDiv.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.classList.add('winning');
    }
  });
}

function hideWinningPulse() {
  boardDiv.querySelectorAll('.cell.winning').forEach(cell => {
    cell.classList.remove('winning');
  });
}

function startConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';
  confettiCanvas.style.opacity = '1';

  confettiParticles = [];
  const count = 100;

  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      size: 7 + Math.random() * 5,
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
      opacity: 1,
      life: 300,
    });
  }
  confettiActive = true;
  requestAnimationFrame(confettiLoop);
}

function stopConfetti() {
  if (!confettiActive) return;

  confettiCanvas.style.transition = 'opacity 0.5s ease-out';
  confettiCanvas.style.opacity = '0';

  setTimeout(() => {
    confettiActive = false;
    confettiParticles = [];
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiCanvas.style.display = 'none';
  }, 500);
}

function confettiLoop() {
  if (!confettiActive) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiParticles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.rotationSpeed;
    p.life--;

    if (p.life < 20) {
      p.opacity = p.life / 20;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = p.opacity;

    confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    confettiCtx.restore();
  });

  confettiParticles = confettiParticles.filter(p => p.life > 0);

  if (confettiParticles.length === 0) {
    confettiCanvas.style.display = 'none';
    confettiActive = false;
  } else {
    requestAnimationFrame(confettiLoop);
  }
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
  if (!gameActive || isAnimating) return;

  if (gameMode === 'online' && (playerNumber !== currentPlayer || !gameId)) return;

  const row = getAvailableRow(col);
  if (row === -1) return;

  isAnimating = true;

  if (gameMode === 'offline') {
    await createFallingDisc(col, currentPlayer, row);

    boardState[row][col] = currentPlayer;
    const cell = boardDiv.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) cell.dataset.player = currentPlayer;

    const winningCells = getWinningCells(currentPlayer);
    if (winningCells) {
      pulseWinningCells(winningCells);
      updateInfo(`Player ${currentPlayer} wins! 🎉`);
      startConfetti();
      gameActive = false;
    } else if (boardState.flat().every(cell => cell !== 0)) {
      updateInfo("It's a draw!");
      gameActive = false;
    } else {
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateInfo(`Player ${currentPlayer}'s turn (${playerColors[currentPlayer]})`);
    }

    isAnimating = false;
    return;
  }

  if (gameMode === 'online') {
    const tempBoard = JSON.parse(JSON.stringify(boardState));
    tempBoard[row][col] = currentPlayer;

    const gameRef = doc(db, "games", gameId);
    const newPlayer = currentPlayer === 1 ? 2 : 1;

    const winner = checkWin(tempBoard, currentPlayer, row, col);
    const isDraw = tempBoard.flat().every(cell => cell !== 0);

    const updateData = {
      board: tempBoard.flat(),
      currentPlayer: (winner || isDraw) ? currentPlayer : newPlayer,
      status: (winner || isDraw) ? "finished" : "playing",
      winner: winner ? currentPlayer : 0
    };

    await createFallingDisc(col, currentPlayer, row);

    boardState[row][col] = currentPlayer;
    updateOnlineBoard();

    try {
      await updateDoc(gameRef, updateData);
    } catch (err) {
      console.error("Error updating game after move:", err);
      boardState[row][col] = 0;
      updateOnlineBoard();
    } finally {
      if (!(winner || isDraw)) {
        currentPlayer = newPlayer;
      } else {
        gameActive = false;
        if (winner || isDraw) {
            showRestartButton();
            gameActive = false;
        }
      }
      isAnimating = false;
    }
  }
}

async function animateRestart() {
  if (isAnimating) return;
  isAnimating = true;
  
  stopConfetti();
  hideWinningPulse();
  
  document.querySelectorAll('.counter').forEach(c => {
    c.style.transition = 'opacity 200ms';
    c.style.opacity = 0;
  });
  
  boardDiv.style.transition = 'opacity 400ms';
  boardDiv.style.opacity = 0.3;
  
  await new Promise(r => setTimeout(r, 10));
  
  boardDiv.classList.add('shake');
  
  await new Promise(r => setTimeout(r, 700));
  
  boardDiv.innerHTML = '';
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  updateOnlineBoard();
  

  boardDiv.style.opacity = 1;
  boardDiv.classList.remove('shake');
  document.querySelectorAll('.counter').forEach(c => {
    c.style.opacity = 1;
  });
  
  isAnimating = false;
}

async function handleGameRestart() {
  await animateRestart();

  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  updateOnlineBoard();
  currentPlayer = 1;
  gameActive = true;
  updateInfo("Player 1's turn");

  boardDiv.style.opacity = 1;
  document.querySelectorAll('.counter').forEach(c => c.style.opacity = 1);
  setTimeout(() => boardDiv.classList.remove('shake'), 700);

  isAnimating = false;
}

async function handleOfflineRestart() {
    if (isRestarting) return;
    isRestarting = true;

    await handleGameRestart();

    setTimeout(() => {
        isRestarting = false;
    }, 800); 
}

async function handleOnlineRestart() {
  if (isAnimating) return;
  if (playerNumber !== 1) {
    updateInfo("Only Player 1 can restart the game.");
    return;
  }

  try {
    await updateDoc(doc(db, "games", gameId), {
      restart: true,
      board: Array(ROWS * COLS).fill(0),
      currentPlayer: 1,
      status: "playing",
      winner: 0
    });
    hideRestartButton();
  } catch (e) {
    console.error("Error restarting online game:", e);
    updateInfo("Could not restart the game. Try again.");
  }
}

restartBtn.addEventListener('click', () => {
  if (gameMode === 'offline') {
    handleOfflineRestart();
  } else if (gameMode === 'online') {
    handleOnlineRestart();
  }
});

boardDiv.addEventListener('click', e => {
  if (isAnimating) return;
  if (e.target.classList.contains('cell')) {
    const col = Number(e.target.dataset.col);
    handleMove(col);
  }
});

leaveGameBtn.addEventListener('click', async () => {
  iInitiatedLeave = true;
  if (gameMode === 'online' && gameId) {
    try {
      await deleteDoc(doc(db, "games", gameId));
    } catch (e) {

    }
  }
  handleLeaveGame();
});

function handleLeaveGame() {
  if (gameMode === 'online') {
    if (unsubscribeWaitListener) { unsubscribeWaitListener(); unsubscribeWaitListener = null; }
    if (unsubscribeGameListener) { unsubscribeGameListener(); unsubscribeGameListener = null; }
    gameId = null;
    playerNumber = 0;
  }

  gameMode = null; 
  gameActive = false;
  currentPlayer = 1;
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  updateInfo('');
  hideWinningPulse();
  stopConfetti();

  leaveGameBtn.classList.add('hidden'); 

  window.fadeOut(gameContainer);
  window.fadeIn(startScreen, 'flex'); 

  setTimeout(() => { iInitiatedLeave = false; }, 0);
}

function endGameOpponentLeft(previousData) {
  if (previousData && previousData.status === "finished") {
    return;
  }
  gameActive = false;
  updateInfo(`Opponent left the game. You win! 🎉`);
  startConfetti();
  restartBtn.classList.remove('visible');
  leaveGameBtn.classList.remove('hidden');
}

const unflattenBoard = (flatBoard) => {
  const newBoard = [];
  for (let r = 0; r < ROWS; r++) {
    newBoard.push(flatBoard.slice(r * COLS, (r + 1) * COLS));
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

async function createGame() {
  multiplayerStatus.textContent = "";
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
}

async function showJoinScreen() {
  await window.fadeOut(multiplayerOptions);
  await window.fadeIn(joinInputSection, 'flex');
}

async function joinGame() {
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

    await window.fadeOut(multiplayerScreen);
    multiplayerStatus.textContent = "";
    await window.fadeIn(gameContainer, 'block');
    resetUIForNewOnlineGame();
    startOnlineGame();
  } catch (err) {
      console.error("Error joining game:", err);
      multiplayerStatus.textContent = "Error joining game. Try again.";
  }
}

async function backToOptions() {
  await window.fadeOut(joinInputSection);
  multiplayerStatus.textContent = "";
  await window.fadeIn(multiplayerOptions, 'flex');
}

async function backToStartFromRoomCode() {
  await window.fadeOut(roomCodeDisplay);
  multiplayerStatus.textContent = "";
  await window.fadeIn(multiplayerOptions, 'flex');
}

async function backToStartFromMultiplayer() {
  await window.fadeOut(multiplayerScreen);
  multiplayerStatus.textContent = "";
  joinCodeInput.value = "";
  await window.fadeIn(startScreen, 'flex');
}

function startOnlineGame() {
  updateInfo(`You are Player ${playerNumber}. Game started.`);
  window.fadeIn(boardDiv, 'grid');
  subscribeToGame();
}

function subscribeToGame() {
  if (!gameId) return;
  hideRestartButton();

  const gameRef = doc(db, "games", gameId);
  if (unsubscribeGameListener) {
    unsubscribeGameListener();
  }

  unsubscribeGameListener = onSnapshot(gameRef, async (snapshot) => {
    if (!snapshot.exists()) {
      if (!iInitiatedLeave) {
        endGameOpponentLeft(lastGameData);
      }
      return;
    }

    const data = snapshot.data();
    const oldData = lastGameData;
    lastGameData = data;

    const receivedBoard = unflattenBoard(data.board);
    const oldFlat = oldData ? oldData.board : [];
    const newFlat = data.board;

if (data.restart === true) {
  if (playerNumber === 2) {
    showRestartMessage();
  }

  await animateRestart(); 

  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  updateOnlineBoard();
  currentPlayer = 1;
  gameActive = true;
  updateInfo("Player 1's turn");

  setTimeout(() => {
    boardDiv.style.opacity = 1;
    document.querySelectorAll('.counter').forEach(c => c.style.opacity = 1);
    boardDiv.classList.remove('shake'); 
    isAnimating = false; 
  }, 700);

  if (playerNumber === 1) {
    try {
      await updateDoc(doc(db, "games", gameId), { restart: false });
    } catch (e) {
      console.error("Failed to clear restart flag:", e);
    }
  }
  return;
}

    hideWinningPulse();

    if (data.status === 'finished') {
      boardState = receivedBoard;
      updateOnlineBoard();
      gameActive = false;

      if (data.winner) {
        const winningCells = getWinningCells(data.winner);
        if (winningCells) {
          pulseWinningCells(winningCells);
          startConfetti();
        }
        updateInfo(`Player ${data.winner} wins! 🎉`);
      } else {
        updateInfo("It's a draw!");
      }

      if (playerNumber === 1) showRestartButton();
      return;
    }

    currentPlayer = data.currentPlayer;
    gameActive = true;

    let placedDiscIndex = -1;
    for (let i = 0; i < newFlat.length; i++) {
      if (oldFlat[i] !== newFlat[i]) {
        placedDiscIndex = i;
        break;
      }
    }

    if (placedDiscIndex !== -1) {
      const placedRow = Math.floor(placedDiscIndex / COLS);
      const placedCol = placedDiscIndex % COLS;
      const playerWhoMoved = newFlat[placedDiscIndex];

      if (boardState[placedRow][placedCol] !== playerWhoMoved) {
        isAnimating = true;
        await createFallingDisc(placedCol, playerWhoMoved, placedRow);
        isAnimating = false;
      }
    }

    boardState = receivedBoard;
    updateOnlineBoard();

    infoDiv.textContent = (playerNumber === currentPlayer) ?
      'Your turn!' :
      `Player ${currentPlayer}'s turn`;
  });
}

function waitForOpponent() {
  if (!gameId) return;

  const gameRef = doc(db, "games", gameId);
  if (unsubscribeWaitListener) {
    unsubscribeWaitListener();
  }

  unsubscribeWaitListener = onSnapshot(gameRef, async (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (data.status === "playing") {
      if (unsubscribeWaitListener) {
        unsubscribeWaitListener();
        unsubscribeWaitListener = null;
      }

      await window.fadeOut(multiplayerScreen);
      await window.fadeIn(gameContainer, 'block');
      resetUIForNewOnlineGame();
      startOnlineGame();
    }
  });
}

window.addEventListener('resize', () => {
  if (confettiActive) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

playOfflineBtn.addEventListener('click', async () => {
  await window.fadeOut(startScreen);
  await window.fadeIn(gameContainer, 'block');

  boardDiv.style.opacity = 0;
  initBoard();
  initGame('offline');
});

playOnlineBtn.addEventListener('click', async () => {
  await window.fadeOut(startScreen);
  await window.fadeIn(multiplayerScreen, 'flex');
  initGame('online');
});