import { goTo } from '../navigation.js';
import { difficultyIcons } from '../core/icons.js';
import { stopConfetti } from '../components/confetti.js';
import {
  initBotRefs, setBotDifficulty, startBotGame, handleBotMove,
  restartBotGame, resetBotLeaderboard, clearBotBoard
} from '../modes/bot.js';

const $ = id => document.getElementById(id);

export function initBotGame({ addTouchHover }) {
  const playBotBtn = $('play-bot');
  const botEasyBtn = $('bot-easy');
  const botMediumBtn = $('bot-medium');
  const botHardBtn = $('bot-hard');
  const botExpertBtn = $('bot-expert');
  const botImpossibleBtn = $('bot-impossible');
  const backFromBotDifficultyBtn = $('back-from-bot-difficulty');
  const leaveBtnBot = $('leave-btn-bot');
  const restartBtnBot = $('restart-btn-bot');
  const boardBot = $('board-bot');
  const infoBot = $('info-bot');
  const subInfoBot = $('sub-info-bot');
  const leaderboardBot = $('leaderboard-bot');

  botEasyBtn.innerHTML = difficultyIcons.easy + ' Easy';
  botMediumBtn.innerHTML = difficultyIcons.medium + ' Medium';
  botHardBtn.innerHTML = difficultyIcons.hard + ' Hard';
  botExpertBtn.innerHTML = difficultyIcons.expert + ' Expert';
  botImpossibleBtn.innerHTML = difficultyIcons.impossible + ' Impossible';

  initBotRefs({ boardEl: boardBot, infoEl: infoBot, subInfoEl: subInfoBot, restartBtn: restartBtnBot, leaderboardEl: leaderboardBot });

  playBotBtn.addEventListener('click', async () => { await goTo('botDifficulty'); });

  async function startWithDifficulty(level) {
    setBotDifficulty(level);
    resetBotLeaderboard();
    await goTo('bot');
    boardBot.style.display = 'grid';
    startBotGame();
  }

  botEasyBtn.addEventListener('click', () => startWithDifficulty('easy'));
  botMediumBtn.addEventListener('click', () => startWithDifficulty('medium'));
  botHardBtn.addEventListener('click', () => startWithDifficulty('hard'));
  botExpertBtn.addEventListener('click', () => startWithDifficulty('expert'));
  botImpossibleBtn.addEventListener('click', () => startWithDifficulty('impossible'));

  backFromBotDifficultyBtn.addEventListener('click', async () => { await goTo('home'); });

  leaveBtnBot.addEventListener('click', async () => {
    stopConfetti();
    clearBotBoard();
    await goTo('home');
  });

  restartBtnBot.addEventListener('click', () => restartBotGame());

  boardBot.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleBotMove(Number(cell.dataset.col));
  });

  addTouchHover('#page-bot-difficulty .button, #page-bot .secondary-button, #leave-btn-bot');
}