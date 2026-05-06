import { fadeIn, fadeOut } from './core/utils.js';

const $ = id => document.getElementById(id);

const pages = {
  home: $('page-home'),
  offline: $('page-offline'),
  botDifficulty: $('page-bot-difficulty'),
  bot: $('page-bot'),
  online: $('page-online'),
  create: $('page-create'),
  join: $('page-join'),
  game: $('page-game'),
};

let currentPage = 'home';

export async function goTo(name) {
  if (name === currentPage) return;
  const from = pages[currentPage];
  const to = pages[name];
  currentPage = name;
  await fadeOut(from, 300);
  from.classList.add('page-hidden');
  to.classList.remove('page-hidden');
  await fadeIn(to, 300);
}
