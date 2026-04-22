export function fadeOut(element, duration = 300) {
  return new Promise(resolve => {
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

export function fadeIn(element, duration = 300) {
  return new Promise(resolve => {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease`;
    void element.offsetWidth;
    element.style.opacity = '1';
    setTimeout(() => {
      element.style.transition = '';
      element.style.opacity = '';
      resolve();
    }, duration);
  });
}

export function generateCode(length = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}