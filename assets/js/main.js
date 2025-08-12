const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const multiplayerScreen = document.getElementById('multiplayer-screen');
const playOfflineBtn = document.getElementById('play-offline');
const playOnlineBtn = document.getElementById('play-online');

window.fadeOut = (element, duration = 400) => {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 0;
  return new Promise(resolve => setTimeout(() => {
    element.style.display = 'none';
    resolve();
  }, duration));
};

window.fadeIn = (element, displayType = 'flex', duration = 400) => {
  element.style.opacity = 0;
  element.style.display = displayType;
  element.style.transition = `opacity ${duration}ms`;
  void element.offsetWidth;
  element.style.opacity = 1;
  return new Promise(resolve => setTimeout(resolve, duration));
};

playOfflineBtn.addEventListener('click', async () => {
  await startGame('offline');
});

playOnlineBtn.addEventListener('click', async () => {
  await showScreen(multiplayerScreen, 'online');
});

async function showScreen(screen, mode) {
  await window.fadeOut(startScreen);
  await window.fadeIn(screen, 'flex');
  loadGameScript(mode);
}

async function startGame(mode) {
  await window.fadeOut(startScreen);
  await window.fadeIn(gameContainer, 'block');
  loadGameScript(mode);
}

function loadGameScript(mode) {
  const existingScript = document.body.querySelector(`script[src*="${mode}.js"]`);
  if (existingScript) {
    return;
  }
  const script = document.createElement('script');
  script.type = 'module';
  script.src = mode === 'offline' 
    ? 'assets/js/offline.js' 
    : 'assets/js/online.js';
  document.body.appendChild(script);
}