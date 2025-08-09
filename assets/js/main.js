const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');

document.getElementById('play-offline').addEventListener('click', () => {
  startGame('offline');
});

document.getElementById('play-online').addEventListener('click', () => {
  startGame('online');
});

function fadeOut(element, duration = 400) {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 0;
  return new Promise(resolve => setTimeout(resolve, duration));
}

function fadeIn(element, duration = 400) {
  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = 1;
  return new Promise(resolve => setTimeout(resolve, duration));
}

async function startGame(mode) {
  await fadeOut(startScreen);
  startScreen.style.display = 'none';
  
  gameContainer.style.opacity = 0;
  gameContainer.style.display = 'block';
  await fadeIn(gameContainer);
  

  const script = document.createElement('script');
  script.type = 'module';
  script.src = mode === 'offline' 
    ? 'assets/js/offline.js' 
    : 'assets/js/online.js';
  document.body.appendChild(script);
}
