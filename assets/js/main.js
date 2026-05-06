import { applySystemTheme } from './core/theme.js';
import { waitForAuth } from './core/firebase.js';
import { initConfetti, resizeConfetti } from './components/confetti.js';
import { initModal } from './components/modal.js';
import { goTo } from './navigation.js';
import { initOfflineGame, initOnlineGame } from './pages/gameEvents.js';
import { initBotGame } from './pages/botGame.js';
import { initCreateGame } from './pages/createGame.js';
import { initJoinGame } from './pages/joinGame.js';

const $ = id => document.getElementById(id);

let authReady = false;
let modalShown = false;

function addTouchHover(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('touchstart', () => el.classList.add('hover'), { passive: true });
    const rem = () => el.classList.remove('hover');
    el.addEventListener('touchend', rem, { passive: true });
    el.addEventListener('touchcancel', rem, { passive: true });
    el.addEventListener('touchmove', rem, { passive: true });
  });
}

function init() {
  applySystemTheme();
  initConfetti();

  const { boardOnline } = initOnlineGame({ creatingStatus: $('creating-status') });
  initOfflineGame();
  initBotGame({ addTouchHover });
  initCreateGame({ boardOnline, addTouchHover });
  initJoinGame({ boardOnline, getAuthReady: () => authReady });

  const { isInAppBrowser, showModal } = initModal();

  $('play-online').addEventListener('click', async () => {
    if (!authReady) return;
    await goTo('online');
    if (!modalShown && isInAppBrowser()) {
      modalShown = true;
      showModal();
    }
  });

  $('back-from-online').addEventListener('click', async () => { await goTo('home'); });

  window.addEventListener('resize', resizeConfetti);
  addTouchHover('.button, .secondary-button, .tertiary-button, .btn-leave');

  const joinParam = new URLSearchParams(location.search).get('join');
  if (joinParam) {
    history.replaceState({}, document.title, location.pathname);
    waitForAuth().then(() => {
      authReady = true;
      $('join-code-input').value = joinParam.trim().toUpperCase();
      goTo('join');
    }).catch(err => console.error('Auth failed:', err));
  } else {
    waitForAuth()
      .then(() => { authReady = true; })
      .catch(err => console.error('Auth failed:', err));
  }
}

document.addEventListener('DOMContentLoaded', init);