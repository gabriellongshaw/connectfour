import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { difficultyIcons } from '../core/icons.js';

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

  const levels = ['easy', 'medium', 'hard', 'expert', 'impossible'];
  const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', impossible: 'Impossible' };

  levels.forEach(level => {
    const btn = document.getElementById(`bot-${level}`);
    btn.innerHTML = difficultyIcons[level] + ' ' + labels[level];
    btn.addEventListener('click', () => navigateTo(`game/?difficulty=${level}`));
  });

  document.getElementById('back-btn').addEventListener('click', () => navigateTo('../'));
  addTouchHover('.button, .tertiary-button');
});