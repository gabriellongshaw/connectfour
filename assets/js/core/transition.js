let navigating = false;

const TRANSITION = 'opacity 0.22s ease, background 0.2s, color 0.2s';

export function navigateTo(url) {
  if (navigating) return;
  navigating = true;
  document.body.classList.add('leaving');
  document.body.style.transition = TRANSITION;
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 230);
}

export function initPageFadeIn() {
  requestAnimationFrame(() => {
    document.body.style.transition = TRANSITION;
    document.body.style.opacity = '1';
  });

  window.addEventListener('pageshow', e => {
    if (e.persisted) {
      navigating = false;
      document.body.classList.remove('leaving');
      document.body.style.transition = TRANSITION;
      document.body.style.opacity = '1';
      document.getAnimations().forEach(a => {
        if (a.animationName) { a.cancel(); a.play(); }
      });
    }
  });
}