export const ROWS = 6;
export const COLS = 7;

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function flattenBoard(board) {
  return board.flat();
}

export function unflattenBoard(flat) {
  return Array.from({ length: ROWS }, (_, r) => flat.slice(r * COLS, (r + 1) * COLS));
}

export function getAvailableRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

export function checkWin(board, player, lastRow, lastCol) {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];
  for (const { dr, dc } of directions) {
    let count = 1;
    let r = lastRow + dr, c = lastCol + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) { count++; r += dr; c += dc; }
    r = lastRow - dr; c = lastCol - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) { count++; r -= dr; c -= dc; }
    if (count >= 4) return true;
  }
  return false;
}

export function getWinningCells(board) {
  const directions = [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: -1 }];
  for (let player = 1; player <= 2; player++) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== player) continue;
        for (const { r: dr, c: dc } of directions) {
          const cells = [[r, c]];
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === player) {
            cells.push([rr, cc]); rr += dr; cc += dc;
          }
          if (cells.length >= 4) return { player, cells };
        }
      }
    }
  }
  return null;
}

export function isBoardFull(board) {
  return board.flat().every(v => v !== 0);
}

export function renderBoard(boardEl, board) {
  boardEl.querySelectorAll('.cell').forEach(cell => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const val = board[r][c];
    if (val !== 0) {
      cell.dataset.player = val;
    } else {
      delete cell.dataset.player;
    }
  });
}

export function initBoardElement(boardEl, firstInit) {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (firstInit) {
        cell.classList.add('cell-in');
        cell.style.setProperty('--cell-delay', `${(r + c) * 35}ms`);
        cell.addEventListener('animationend', () => {
          cell.classList.remove('cell-in');
          cell.style.removeProperty('--cell-delay');
        }, { once: true });
      }
      boardEl.appendChild(cell);
    }
  }
}

export function pulseWinningCells(boardEl, cells) {
  cells.forEach(([r, c], i) => {
    const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (!cell) return;
    cell.style.setProperty('--win-delay', `${i * 90}ms`);
    cell.classList.add('winning');
  });
}

export function clearWinningPulse(boardEl) {
  boardEl.querySelectorAll('.cell.winning').forEach(c => {
    c.classList.remove('winning');
    c.style.removeProperty('--win-delay');
  });
}

export function animateFallingDisc(boardEl, col, player, targetRow) {
  return new Promise(resolve => {
    const disc = document.createElement('div');
    disc.className = `falling-disc ${player === 1 ? 'red' : 'yellow'}`;
    boardEl.appendChild(disc);

    const cell = boardEl.querySelector(`.cell[data-row="${targetRow}"][data-col="${col}"]`);
    if (!cell) { disc.remove(); resolve(); return; }

    const boardRect = boardEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const discSize = cellRect.width;
    const startX = cellRect.left - boardRect.left;
    const endY = cellRect.top - boardRect.top;
    const startY = -discSize * 1.6;

    disc.style.width = `${discSize}px`;
    disc.style.height = `${discSize}px`;
    disc.style.left = `${startX}px`;
    disc.style.top = `${startY}px`;

    const duration = 300 + targetRow * 45;
    let startTime = null;

    function easeOut(t) {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
      if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
      t -= 2.625 / 2.75;
      return 7.5625 * t * t + 0.984375;
    }

    function tick(time) {
      if (!startTime) startTime = time;
      const elapsed = Math.min(time - startTime, duration);
      const progress = easeOut(elapsed / duration);
      disc.style.top = `${startY + (endY - startY) * progress}px`;

      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        cell.dataset.player = player;
        disc.remove();
        cell.classList.remove('landed');
        void cell.offsetWidth;
        cell.classList.add('landed');
        cell.addEventListener('animationend', () => cell.classList.remove('landed'), { once: true });
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

export function animateRestart(boardEl) {
  return new Promise(resolve => {
    boardEl.classList.add('shake');
    boardEl.style.transition = 'opacity 350ms';
    boardEl.style.opacity = '0.25';
    setTimeout(() => {
      boardEl.style.opacity = '1';
      setTimeout(() => boardEl.classList.remove('shake'), 350);
      resolve();
    }, 480);
  });
}