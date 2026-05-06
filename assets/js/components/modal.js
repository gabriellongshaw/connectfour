const $ = id => document.getElementById(id);

export function initModal() {
  const modal = $('browser-modal');
  const closeModalBtn = $('close-modal');
  const backdrop = $('backdrop');

  function isInAppBrowser() {
    const ua = navigator.userAgent;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (isStandalone) return false;
    return /FB_IAB|FBAN|FBAV|Instagram|Twitter|LinkedInApp|Snapchat|TikTok|BytedanceWebview|GSA|musical_ly/.test(ua)
      || /wv/.test(ua)
      || (/Android/.test(ua) && !/Chrome\/[.0-9]* Mobile/.test(ua) && /Version\//.test(ua))
      || (window.ReactNativeWebView !== undefined)
      || (typeof Android !== 'undefined');
  }

  function showModal() {
    if (!modal) return;
    modal.showModal();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add('open');
        backdrop.classList.add('visible');
      });
    });
  }

  function closeModal() {
    modal.classList.add('closing');
    modal.classList.remove('open');
    backdrop.classList.remove('visible');
    modal.addEventListener('transitionend', () => {
      modal.close();
      modal.classList.remove('closing');
    }, { once: true });
  }

  closeModalBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  return { isInAppBrowser, showModal };
}