import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';

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
  addTouchHover('.button');

  document.querySelectorAll('.button').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.getAttribute('href'));
    });
  });
});