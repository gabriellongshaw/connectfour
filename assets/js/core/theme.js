export function applySystemTheme() {
  const body = document.body;
  body.classList.remove('dark', 'amoled-dark');
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    body.classList.add('dark');
  }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);
