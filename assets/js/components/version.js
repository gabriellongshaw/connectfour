const RELEASES = 'https://github.com/gabriellongshaw/connectfour/releases';

let pending = null;

function loadVersion() {
  if (!pending) {
    pending = fetch(new URL('../../../version.json', import.meta.url), { cache: 'no-cache' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => (data && /^\d+\.\d+\.\d+$/.test(data.version) ? data.version : null))
      .catch(() => null);
  }
  return pending;
}

export async function mountVersion(parent, { inline = false } = {}) {
  if (!parent) return;
  const version = await loadVersion();
  if (!version || parent.querySelector('.version-tag')) return;
  if (inline) {
    const el = document.createElement('a');
    el.className = 'credits-link version-tag';
    el.textContent = `v${version}`;
    el.href = `${RELEASES}/tag/v${version}`;
    el.target = '_blank';
    el.rel = 'noopener';
    const parts = parent.querySelectorAll('p');
    const last = parts[parts.length - 1] || parent;
    last.append(' · ', el);
    return;
  }
  const el = document.createElement('span');
  el.className = 'version-tag';
  el.textContent = `Connect Four v${version}`;
  parent.appendChild(el);
}
