let navigating = false;

const TRANSITION = 'opacity 0.25s ease, background 0.2s, color 0.2s';

export function navigateTo(url) {
  if (navigating) return;
  navigating = true;
  document.body.style.transition = TRANSITION;
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 260);
}

export function initPageFadeIn() {
  requestAnimationFrame(() => {
    document.body.style.transition = TRANSITION;
    document.body.style.opacity = '1';
  });

  window.addEventListener('pageshow', e => {
    if (e.persisted) {
      navigating = false;
      document.body.style.transition = TRANSITION;
      document.body.style.opacity = '1';
    }
  });
}