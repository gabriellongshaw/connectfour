const board = document.getElementById('board');
const info = document.getElementById('info');
const restartBtn = document.getElementById('restartBtn');
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
const ROWS = 6;
const COLS = 7;

let currentPlayer = 1;
let isAnimating = false;
let boardState = [];
let confettiParticles = [];
let confettiActive = false;

function initBoard() {
  board.innerHTML = '';
  boardState = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      board.appendChild(cell);
    }
  }
}

function getAvailableRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (boardState[r][col] === 0) return r;
  }
  return -1;
}

const playerColors = {
  1: 'Red',
  2: 'Yellow'
};

function updateInfo(text) {
  const info = document.getElementById('info');
  info.style.opacity = 0;
  setTimeout(() => {
    info.textContent = text;
    info.style.opacity = 1;
  }, 200);
}

updateInfo(`It's ${playerColors[currentPlayer]}'s turn`);

function createFallingDisc(col, player, targetRow) {
  return new Promise((resolve) => {
    const disc = document.createElement('div');
    disc.classList.add('falling-disc', player === 1 ? 'red' : 'yellow');
    board.appendChild(disc);

    const cell = board.querySelector(`.cell[data-row="${targetRow}"][data-col="${col}"]`);
    const boardRect = board.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const startX = cellRect.left - boardRect.left;
    const startY = -cellRect.height * 1.5; 
    const endY = cellRect.top - boardRect.top;

    disc.style.left = `${startX}px`;
    disc.style.top = `${startY}px`;

    let startTime = null;
    const duration = 400;

    function easeOutQuad(t) {
      return t * (2 - t);
    }

    function animate(time) {
      if (!startTime) startTime = time;
      let elapsed = time - startTime;
      if (elapsed > duration) elapsed = duration;
      const progress = elapsed / duration;

      const easeProgress = easeOutQuad(progress);
      const currentY = startY + (endY - startY) * easeProgress;

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

function checkWin(player) {

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
    const cell = board.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.classList.add('winning');
    }
  });
}

function clearWinningPulse() {
  board.querySelectorAll('.cell.winning').forEach(cell => {
    cell.classList.remove('winning');
  });
}

function startConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';

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
      life: 100,
    });
  }
  confettiActive = true;
  requestAnimationFrame(confettiLoop);
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

async function placeDisc(col) {
  if (isAnimating) return;

  const row = getAvailableRow(col);
  if (row === -1) return;

  isAnimating = true;
  await createFallingDisc(col, currentPlayer, row);

  boardState[row][col] = currentPlayer;
  const cell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  cell.dataset.player = currentPlayer;

  const winningCells = checkWin(currentPlayer);

  if (winningCells) {
    pulseWinningCells(winningCells);
    updateInfo(`Player ${currentPlayer} wins! 🎉`);
    startConfetti();
    restartBtn.disabled = false;
    isAnimating = false;
    return;
  }

  if (boardState.flat().every(cell => cell !== 0)) {
    updateInfo("It's a draw!");
    restartBtn.disabled = false;
    isAnimating = false;
    return;
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateInfo(`Player ${currentPlayer}'s turn`);
  isAnimating = false;
}

async function restartGame() {
  if (isAnimating) return;

  restartBtn.disabled = true;
  clearWinningPulse();
  updateInfo('');

  board.classList.add('shake');
  board.style.opacity = '0.5';

  await new Promise(r => setTimeout(r, 700));

  board.classList.remove('shake');
  board.style.opacity = '1';

  initBoard();
  currentPlayer = 1;
  updateInfo(`Player ${currentPlayer}'s turn`);
  restartBtn.disabled = false;
}

board.addEventListener('click', e => {
  if (e.target.classList.contains('cell')) {
    if (restartBtn.disabled) return;
    if (isAnimating) return;
    const col = Number(e.target.dataset.col);
    placeDisc(col);
  }
});

restartBtn.addEventListener('click', restartGame);

window.addEventListener('resize', () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

initBoard();
updateInfo(`Player ${currentPlayer}'s turn`);