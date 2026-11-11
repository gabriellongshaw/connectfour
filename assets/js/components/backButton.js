import { navigateTo } from '../core/transition.js';

const CHEVRON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';

export function initBackButton({ target = '../', label = 'Back', onBack } = {}) {
  const page = document.querySelector('.page');
  if (!page || document.getElementById('back-btn')) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'back-btn';
  btn.className = 'leave-button';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `${CHEVRON}<span class="leave-label">${label}</span>`;

  const removeHover = () => btn.classList.remove('hover');
  btn.addEventListener('touchstart', () => btn.classList.add('hover'), { passive: true });
  btn.addEventListener('touchend', removeHover, { passive: true });
  btn.addEventListener('touchcancel', removeHover, { passive: true });
  btn.addEventListener('touchmove', removeHover, { passive: true });

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    if (onBack) {
      try {
        await onBack();
      } catch (err) {
        console.error('Back error:', err);
      }
    }
    navigateTo(target);
  });

  page.appendChild(btn);
  return btn;
}