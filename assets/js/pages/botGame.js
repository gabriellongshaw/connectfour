import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn } from '../core/transition.js';
import { initBackButton } from '../components/backButton.js';
import { initConfetti, resizeConfetti } from '../components/confetti.js';
import { stopConfetti } from '../components/confetti.js';
import {
  initBotRefs, setBotDifficulty, startBotGame, handleBotMove,
  restartBotGame, resetBotLeaderboard, clearBotBoard
} from '../modes/bot.js';

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

  const params = new URLSearchParams(location.search);
  const difficulty = params.get('difficulty') || 'medium';

  const boardEl = document.getElementById('board');

  initBotRefs({
    boardEl,
    infoEl: document.getElementById('info'),
    subInfoEl: document.getElementById('sub-info'),
    restartBtn: document.getElementById('restart-btn'),
    leaderboardEl: document.getElementById('leaderboard'),
  });

  setBotDifficulty(difficulty);
  resetBotLeaderboard();
  boardEl.style.display = 'grid';
  startBotGame();

  initBackButton({
    target: '../../',
    onBack: () => {
      stopConfetti();
      clearBotBoard();
    },
  });

  document.getElementById('restart-btn').addEventListener('click', () => restartBotGame());

  boardEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleBotMove(Number(cell.dataset.col));
  });

  window.addEventListener('resize', resizeConfetti);
  addTouchHover('.secondary-button');
});