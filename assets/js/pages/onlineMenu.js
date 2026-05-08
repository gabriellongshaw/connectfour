import { applySystemTheme } from '../core/theme.js';
import { initPageFadeIn, navigateTo } from '../core/transition.js';
import { initModal } from '../components/modal.js';
import { waitForAuth } from '../core/firebase.js';

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

  const { isInAppBrowser, showModal } = initModal();
  let modalShown = false;

  waitForAuth().catch(err => console.error('Auth failed:', err));

  function handleOnlineNav(e, url) {
    e.preventDefault();
    if (!modalShown && isInAppBrowser()) {
      modalShown = true;
      showModal();
    }
    navigateTo(url);
  }

  document.getElementById('create-btn').addEventListener('click', e => handleOnlineNav(e, 'create-game/'));
  document.getElementById('join-btn').addEventListener('click', e => handleOnlineNav(e, 'join-game/'));
  document.getElementById('back-btn').addEventListener('click', () => navigateTo('../'));

  addTouchHover('.button, .tertiary-button');
});