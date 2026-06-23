// Shared helpers used across pages.
import { t, getLang, setLang, applyI18n } from '/js/i18n.js';

export { t, getLang, setLang, applyI18n };

export const api = {
  async req(method, url, body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  get(u) { return this.req('GET', u); },
  post(u, b) { return this.req('POST', u, b); },
  del(u) { return this.req('DELETE', u); },
};

export const METHOD_ICONS = {
  mlc_bank: '🏦', mlc_card: '💳', usd_cash: '💵', cup_cash: '🪙', cubacel: '📱',
};

export function money(n, cur = 'USD') {
  const v = Number(n || 0);
  if (cur === 'USD') return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + cur;
}

export function statusLabel(s) { return t('st.' + s) || s; }

let _me; // cache
export async function getMe() {
  if (_me !== undefined) return _me;
  try { _me = (await api.get('/api/auth/me')).user; }
  catch { _me = null; }
  return _me;
}

export async function renderHeader() {
  const me = await getMe();
  const el = document.getElementById('header');
  if (!el) return;
  const lang = getLang();
  const authArea = me
    ? `${me.role === 'admin' ? `<a class="link" href="/admin.html">${t('nav.admin')}</a>` : ''}
       <a class="link" href="/dashboard.html">${t('nav.transfers')}</a>
       <a class="btn btn-ghost btn-sm" href="#" id="logoutBtn">${t('nav.logout')}</a>`
    : `<a class="btn btn-ghost btn-sm" href="/login.html">${t('nav.login')}</a>`;
  el.innerHTML = `
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="/">
        <span class="logo">CR</span> CubaRemesa
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Menu" aria-expanded="false">☰</button>
      <div class="nav-menu" id="navMenu">
        <nav class="nav-links">
          <a class="link" href="/#methods">${t('nav.ways')}</a>
          <a class="link" href="/#how">${t('nav.how')}</a>
          <a class="link" href="/#fees">${t('nav.fees')}</a>
          <a class="link" href="/#faq">${t('nav.help')}</a>
        </nav>
        <div class="nav-actions">
          <div class="lang-switch" id="langSwitch">
            <button data-lang="es" class="${lang==='es'?'sel':''}">ES</button>
            <button data-lang="en" class="${lang==='en'?'sel':''}">EN</button>
          </div>
          ${authArea}
          <a class="btn btn-primary btn-sm" href="/send.html">${t('nav.send')}</a>
        </div>
      </div>
    </div>
  </header>`;

  const toggle = document.getElementById('navToggle');
  toggle?.addEventListener('click', () => {
    const menu = document.getElementById('navMenu');
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await api.post('/api/auth/logout', {});
    location.href = '/';
  });
  document.querySelectorAll('#langSwitch button').forEach((b) =>
    b.addEventListener('click', () => switchLang(b.dataset.lang)));
}

function switchLang(l) {
  if (l === getLang()) return;
  setLang(l);
  renderHeader();
  renderFooter();
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
}

export function footerHTML() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand" style="margin-bottom:10px"><span class="logo">CR</span> CubaRemesa</div>
          <p style="max-width:30ch">${t('footer.tagline')}</p>
        </div>
        <div>
          <h4>${t('footer.send')}</h4>
          <a href="/send.html">${t('nav.send')}</a>
          <a href="/#methods">${t('nav.ways')}</a>
          <a href="/#fees">${t('fees.eyebrow')}</a>
        </div>
        <div>
          <h4>${t('footer.company')}</h4>
          <a href="/#how">${t('nav.how')}</a>
          <a href="/#faq">${t('nav.help')}</a>
          <a href="/login.html">${t('nav.login')}</a>
        </div>
        <div>
          <h4>${t('footer.legal')}</h4>
          <a href="#">${t('footer.terms')}</a>
          <a href="#">${t('footer.privacy')}</a>
          <a href="#">${t('footer.aml')}</a>
        </div>
      </div>
      <div class="legal">© ${new Date().getFullYear()} CubaRemesa. ${t('footer.disclaimer')}</div>
    </div>
  </footer>`;
}

export function renderFooter() {
  const el = document.getElementById('footer');
  if (el) el.innerHTML = footerHTML();
}
