let navigating = false;

export function navigateTo(url) {
  if (navigating) return;
  navigating = true;
  document.body.style.transition = 'opacity 0.25s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 260);
}

export function initPageFadeIn() {
  document.body.style.opacity = '0';
  document.body.style.transition = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '1';
    });
  });
}
