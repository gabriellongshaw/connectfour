const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const multiplayerScreen = document.getElementById('multiplayer-screen');
const playOfflineBtn = document.getElementById('play-offline');
const playOnlineBtn = document.getElementById('play-online');

window.fadeOut = (element, duration = 400) => {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 0;
  return new Promise(resolve => setTimeout(resolve, duration));
};

window.fadeIn = (element, duration = 400) => {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 1;
  return new Promise(resolve => setTimeout(resolve, duration));
};

playOfflineBtn.addEventListener('click', () => {
  startGame('offline');
});

playOnlineBtn.addEventListener('click', () => {
  showScreen(multiplayerScreen, 'online');
});

async function showScreen(screen, mode) {
  await window.fadeOut(startScreen);
  startScreen.style.display = 'none';
  
  screen.style.opacity = 0;
  screen.style.display = 'flex';
  await window.fadeIn(screen);

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

async function startGame(mode) {
  await window.fadeOut(startScreen);
  startScreen.style.display = 'none';
  
  gameContainer.style.opacity = 0;
  gameContainer.style.display = 'block';
  await window.fadeIn(gameContainer);
  
  loadGameScript(mode);
}
