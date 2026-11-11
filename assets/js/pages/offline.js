import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn } from '../core/transition.js';
import { initBackButton } from '../components/backButton.js';
import { initConfetti, resizeConfetti } from '../components/confetti.js';
import {
  initOfflineRefs, startOfflineGame, handleOfflineMove,
  restartOfflineGame, clearOfflineBoard
} from '../modes/offline.js';

function addTouchHover(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const rem = () => el.classList.remove('hover');
    el.addEventListener('touchend', rem, { passive: true });
    el.addEventListener('touchcancel', rem, { passive: true });
    el.addEventListener('touchmove', rem, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applySystemTheme();
  initPageFadeIn();
  initConfetti();

  const boardEl = document.getElementById('board');

  initOfflineRefs({
    boardEl,
    infoEl: document.getElementById('info'),
    subInfoEl: document.getElementById('sub-info'),
    restartBtn: document.getElementById('restart-btn'),
    leaderboardEl: document.getElementById('leaderboard'),
  });

  boardEl.style.display = 'grid';
  startOfflineGame();

  initBackButton({
    target: '../',
    onBack: () => clearOfflineBoard(),
  });

  document.getElementById('restart-btn').addEventListener('click', () => restartOfflineGame());

  boardEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleOfflineMove(Number(cell.dataset.col));
  });

  window.addEventListener('resize', resizeConfetti);
  addTouchHover('.secondary-button');
});