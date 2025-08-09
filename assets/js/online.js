import { collection, addDoc, getDoc, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = window.firebaseDB;
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";

let gameId = null;
let playerNumber = null;
let currentPlayer = 1;
let board = Array.from({ length: 6 }, () => Array(7).fill(0));
let gameActive = false;

const gameContainer = document.querySelector('.game-container');
gameContainer.innerHTML = `
  <h1>Connect Four (Online)</h1>
  <div id="lobby">
    <button id="create-game" class="start-screen-button">Create Game</button>
    <button id="join-game" class="start-screen-button">Join Game</button>
    <div id="lobby-info" style="margin-top:15px;font-size:1.1rem;"></div>
  </div>
  <div id="board" class="board" style="display:none;" aria-label="Connect Four board" role="grid"></div>
  <div id="info" class="info" style="display:none;">Waiting for game...</div>
  <button id="restartBtn" class="restart-btn" style="display:none;">Restart</button>
`;

const lobbyInfo = document.getElementById('lobby-info');
const boardDiv = document.getElementById('board');
const infoDiv = document.getElementById('info');
const restartBtn = document.getElementById('restartBtn');

let unsubscribeGameListener = null;
let unsubscribeWaitListener = null;

document.getElementById('create-game').addEventListener('click', async () => {
  if (isLocal) {
    gameId = "LOCAL_TEST";
    playerNumber = 1;
    startGame();
  } else {
    const docRef = await addDoc(collection(db, "games"), {
      board,
      currentPlayer: 1,
      status: "waiting",
      winner: 0
    });
    gameId = docRef.id;
    playerNumber = 1;
    lobbyInfo.textContent = `Game created! Share this ID: ${gameId}`;
    waitForOpponent();
  }
});

document.getElementById('join-game').addEventListener('click', async () => {
  const id = prompt("Enter game ID:");
  if (!id) return;

  if (isLocal) {
    gameId = "LOCAL_TEST";
    playerNumber = 2;
    startGame();
  } else {
    const gameRef = doc(db, "games", id);
    const snapshot = await getDoc(gameRef);
    if (!snapshot.exists()) {
      lobbyInfo.textContent = "Game not found.";
      return;
    }
    gameId = id;
    playerNumber = 2;
    await updateDoc(gameRef, { status: "playing" });
    startGame();
  }
});

restartBtn.addEventListener('click', async () => {
  if (!gameActive) return;
  if (isLocal) {
    board = Array.from({ length: 6 }, () => Array(7).fill(0));
    currentPlayer = 1;
    drawBoard();
    updateInfo();
  } else {
    await updateDoc(doc(db, "games", gameId), {
      board: Array.from({ length: 6 }, () => Array(7).fill(0)),
      currentPlayer: 1,
      status: "playing",
      winner: 0
    });
  }
});

function startGame() {
  document.getElementById('lobby').style.display = 'none';
  boardDiv.style.display = 'grid';
  infoDiv.style.display = 'block';
  restartBtn.style.display = 'inline-block';
  gameActive = true;
  drawBoard();
  updateInfo();

  if (!isLocal) {
    if (unsubscribeWaitListener) {
      unsubscribeWaitListener();
      unsubscribeWaitListener = null;
    }
    subscribeToGame();
  }
}

function drawBoard() {
  boardDiv.innerHTML = '';
  boardDiv.style.gridTemplateColumns = 'repeat(7, 1fr)';
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell';
      cellDiv.dataset.col = colIndex;
      cellDiv.dataset.row = rowIndex; 

      if (rowIndex === 0 && gameActive && currentPlayer === playerNumber) {
        cellDiv.addEventListener('click', () => handleMove(colIndex));
      }

      if (cell !== 0) {
        const disc = document.createElement('div');
        disc.classList.add('disc', cell === 1 ? 'red' : 'yellow');
        cellDiv.appendChild(disc);
      }

      boardDiv.appendChild(cellDiv);
    });
  });
}

async function handleMove(col) {
  if (!gameActive) return;
  if (playerNumber !== currentPlayer) return;

  let placedRow = -1;
  for (let row = 5; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = currentPlayer;
      placedRow = row;
      break;
    }
  }
  if (placedRow === -1) return;

  const targetCell = boardDiv.querySelector(`.cell[data-col="${col}"][data-row="${placedRow}"]`);
  if (targetCell) {
    const fallingDisc = document.createElement('div');
    fallingDisc.classList.add('falling-disc', currentPlayer === 1 ? 'red' : 'yellow');
    targetCell.appendChild(fallingDisc);

    fallingDisc.addEventListener('animationend', async () => {
      fallingDisc.remove();
      const finalDisc = document.createElement('div');
      finalDisc.classList.add('disc', currentPlayer === 1 ? 'red' : 'yellow');
      targetCell.appendChild(finalDisc);

      const winner = checkWin(board, currentPlayer, placedRow, col);
      if (winner) {
        gameActive = false;
        infoDiv.textContent = `Player ${currentPlayer} wins! 🎉`;
        if (!isLocal) {
          await updateDoc(doc(db, "games", gameId), {
            board,
            currentPlayer,
            status: "finished",
            winner: currentPlayer
          });
        }
        return;
      }

      if (board.flat().every(cell => cell !== 0)) {
        gameActive = false;
        infoDiv.textContent = "It's a draw!";
        if (!isLocal) {
          await updateDoc(doc(db, "games", gameId), {
            board,
            currentPlayer,
            status: "finished",
            winner: 0
          });
        }
        return;
      }

      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateInfo();

      if (!isLocal) {
        await updateDoc(doc(db, "games", gameId), {
          board,
          currentPlayer
        });
      }
    });
  }

}

function updateInfo() {
  if (!gameActive) {
    restartBtn.disabled = false;
    return;
  }
  infoDiv.textContent = `Player ${currentPlayer}'s turn (${currentPlayer === 1 ? 'Red' : 'Yellow'})`;
  restartBtn.disabled = true;
}

function subscribeToGame() {
  const gameRef = doc(db, "games", gameId);

  if (unsubscribeGameListener) {
    unsubscribeGameListener();
  }

  unsubscribeGameListener = onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    const oldBoard = JSON.stringify(board);
    const newBoard = JSON.stringify(data.board);

    if (oldBoard !== newBoard) {
        const oldFlat = board.flat();
        const newFlat = data.board.flat();
        let placedDiscIndex = -1;

        for (let i = 0; i < oldFlat.length; i++) {
            if (oldFlat[i] !== newFlat[i]) {
                placedDiscIndex = i;
                break;
            }
        }

        if (placedDiscIndex !== -1) {
            const placedRow = Math.floor(placedDiscIndex / 7);
            const placedCol = placedDiscIndex % 7;
            const targetCell = boardDiv.querySelector(`.cell[data-col="${placedCol}"][data-row="${placedRow}"]`);

            if (targetCell) {
                const fallingDisc = document.createElement('div');
                fallingDisc.classList.add('falling-disc', data.currentPlayer === 1 ? 'yellow' : 'red');
                targetCell.appendChild(fallingDisc);

                fallingDisc.addEventListener('animationend', () => {
                    fallingDisc.remove();
                    const finalDisc = document.createElement('div');
                    finalDisc.classList.add('disc', data.currentPlayer === 1 ? 'yellow' : 'red');
                    targetCell.appendChild(finalDisc);
                });
            }
        }
    }

    board = data.board;
    currentPlayer = data.currentPlayer;
    gameActive = data.status === "playing";
    const winner = data.winner || 0;

    if (winner) {
      gameActive = false;
      updateInfo();
      infoDiv.textContent = `Player ${winner} wins! 🎉`;
      restartBtn.disabled = false;
    } else if (!gameActive) {
      updateInfo();
      infoDiv.textContent = "Game ended.";
      restartBtn.disabled = false;
    } else {

      updateInfo();
    }
  });
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
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = lastRow - dr;
    c = lastCol - dc;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= 4) return true;
  }
  return false;
}