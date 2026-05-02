import { auth, checkModAccess } from '../core/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js';

let modEnabled = false;
let modMenuEl = null;
let modBtnEl = null;
let currentMode = null;
let eventsBound = false;

const state = {
  autoWin: false,
  skipBotTurn: false,
  multiPlace: false,
  multiPlaceCount: 3,
  freezeBot: false,
  autoWinOnline: false,
  skipOpponentTurn: false,
  multiPlaceOnline: false,
  multiPlaceOnlineCount: 3,
};

export function initMod({ modBtn, modMenu }) {
  modBtnEl = modBtn;
  modMenuEl = modMenu;

  const signinBtn = document.getElementById('mod-signin-btn');
  const signoutBtn = document.getElementById('mod-signout-btn');

  onAuthStateChanged(auth, async (user) => {
    console.log('[mod] auth state changed, user=', user?.uid, 'isAnonymous=', user?.isAnonymous);

    const isReal = user && !user.isAnonymous;
    if (signinBtn) signinBtn.style.display = isReal ? 'none' : 'inline-flex';
    if (signoutBtn) signoutBtn.style.display = isReal ? 'inline-flex' : 'none';

    if (!isReal) {
      hideMod();
      return;
    }
    const allowed = await checkModAccess(user.uid);
    if (allowed) {
      modEnabled = true;
      modBtnEl.style.display = 'flex';
      if (!eventsBound) {
        bindModEvents();
        eventsBound = true;
      }
    } else {
      hideMod();
    }
  });
}

export function setModMode(mode) {
  currentMode = mode;
  if (!modEnabled) return;
  syncTabVisibility();
}

function hideMod() {
  modEnabled = false;
  if (modBtnEl) modBtnEl.style.display = 'none';
  closeModMenu();
}

function syncTabVisibility() {
  if (!modMenuEl) return;
  const botTab = modMenuEl.querySelector('[data-tab="bot"]');
  const onlineTab = modMenuEl.querySelector('[data-tab="online"]');
  const botPanel = modMenuEl.querySelector('.mod-panel[data-panel="bot"]');
  const onlinePanel = modMenuEl.querySelector('.mod-panel[data-panel="online"]');

  if (currentMode === 'bot') {
    botTab.classList.add('active');
    onlineTab.classList.remove('active');
    botPanel.classList.add('active');
    onlinePanel.classList.remove('active');
  } else if (currentMode === 'online') {
    onlineTab.classList.add('active');
    botTab.classList.remove('active');
    onlinePanel.classList.add('active');
    botPanel.classList.remove('active');
  }
}

function openModMenu() {
  if (!modEnabled) return;
  syncTabVisibility();
  modMenuEl.classList.add('open');
}

function closeModMenu() {
  if (modMenuEl) modMenuEl.classList.remove('open');
}

function bindModEvents() {
  modBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    modMenuEl.classList.contains('open') ? closeModMenu() : openModMenu();
  });

  document.addEventListener('click', (e) => {
    if (modMenuEl && !modMenuEl.contains(e.target) && e.target !== modBtnEl) {
      closeModMenu();
    }
  });

  modMenuEl.querySelectorAll('.mod-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modMenuEl.querySelectorAll('.mod-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      modMenuEl.querySelectorAll('.mod-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === tab.dataset.tab);
      });
    });
  });

  bindToggle('mod-auto-win', (v) => { state.autoWin = v; });
  bindToggle('mod-skip-bot-turn', (v) => { state.skipBotTurn = v; });
  bindToggle('mod-multi-place', (v) => {
    state.multiPlace = v;
    modMenuEl.querySelector('.mod-multi-count-wrap').style.display = v ? 'flex' : 'none';
  });
  bindToggle('mod-freeze-bot', (v) => { state.freezeBot = v; });

  modMenuEl.querySelector('#mod-multi-count').addEventListener('input', function() {
    const v = Math.min(7, Math.max(2, parseInt(this.value) || 2));
    this.value = v;
    state.multiPlaceCount = v;
  });

  bindToggle('mod-auto-win-online', (v) => { state.autoWinOnline = v; });
  bindToggle('mod-skip-opponent', (v) => { state.skipOpponentTurn = v; });
  bindToggle('mod-multi-place-online', (v) => {
    state.multiPlaceOnline = v;
    modMenuEl.querySelector('.mod-multi-count-online-wrap').style.display = v ? 'flex' : 'none';
  });

  modMenuEl.querySelector('#mod-multi-count-online').addEventListener('input', function() {
    const v = Math.min(7, Math.max(2, parseInt(this.value) || 2));
    this.value = v;
    state.multiPlaceOnlineCount = v;
  });

  modMenuEl.querySelector('#mod-close').addEventListener('click', closeModMenu);
}

function bindToggle(id, cb) {
  const el = modMenuEl.querySelector(`#${id}`);
  if (!el) return;
  el.addEventListener('change', () => cb(el.checked));
}

export function getModState() {
  return state;
}
