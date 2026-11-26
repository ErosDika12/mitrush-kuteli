/* =========================================================================
   Shared behaviour for every page. Loaded after js/data.js and Bootstrap.
   Exposes window.Site (helpers + shared components). Pages may read it.
   Do not add page-specific code here; use js/page-<name>.js instead.
   ========================================================================= */
(function () {
  'use strict';

  const D = window.SITE_DATA;
  if (!D) { console.error('js/data.js is missing'); return; }
  const S = D.school;

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const normalize = (s) => String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ë/g, 'e').replace(/ç/g, 'c');

  const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
  const WEEKDAYS = { 1: 'E hënë', 2: 'E martë', 3: 'E mërkurë', 4: 'E enjte', 5: 'E premte' };
  const DAY_NAMES = ['E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte'];
  const CONTEXT_LABELS = {
    teaching: 'Konsultim lëndor', support: 'Mbështetje', administration: 'Administratë', coordination: 'Koordinim', psychology: 'Psikologji',
  };
  const GROUP_LABELS = {
    leadership: 'Udhëheqja dhe administrata', teaching: 'Mësimdhënës', support: 'Shërbime mbështetëse', other: 'Pjesë tjetër e stafit',
  };

  /** "2026-06-12" -> "12 qershor 2026" */
  function formatDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }
  function formatDateList(isos) {
    if (isos.length === 2) {
      const [a, b] = isos.map((s) => s.split('-').map(Number));
      if (a[0] === b[0] && a[1] === b[1]) return `${a[2]}–${b[2]} ${MONTHS[a[1] - 1]} ${a[0]}`;
    }
    return isos.map(formatDate).join(', ');
  }
  const timeRange = (start, end) => `${start}–${end}`;
  function weekdayList(days) {
    if (days.length === 5 && days.every((d, i) => d === i + 1)) return 'Çdo ditë pune';
    const names = days.map((d) => WEEKDAYS[d]);
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' dhe ' + names[names.length - 1].replace(/^E /, 'e ');
  }
  function initials(name) {
    const parts = String(name).replace(/[“”"]/g, '').split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const gapMinutes = (endA, startB) => toMinutes(startB) - toMinutes(endA);
  const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX' };
  /** "7.2" -> "VII-2" */
  function classId(raw) { const [g, s] = raw.split('.'); return `${ROMAN[g] ?? g}-${s}`; }

  /** Image record exported from src/assets: { src, src800, width, height } or null. */
  const img = (id) => D.images[id] ?? null;

  /** Maps the Astro route used in the content (/stafi, /lajme/slug, /festat/28-nentori#x) to a page of this site. */
  function link(path) {
    if (!path) return '#';
    if (/^(https?:|mailto:|tel:)/.test(path)) return path;
    const [pathAndQuery, hash] = path.split('#');
    const [rawPath, query] = pathAndQuery.split('?');
    const p = rawPath.replace(/^\/+|\/+$/g, '');
    const h = hash ? '#' + hash : '';
    if (p.startsWith('lajme/')) return `lajme.html?slug=${encodeURIComponent(p.slice(6))}${h}`;
    if (p === '') return `index.html${h}`;
    const file = p.replace(/\//g, '-') + '.html';
    return file + (query ? '?' + query : '') + h;
  }

  /* ---------- URL state (filters keep their values in the address bar) ---------- */
  function readParams() { return new URLSearchParams(window.location.search); }
  function writeParams(values, push = false) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) if (v) p.set(k, v);
    const qs = p.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    if (url === window.location.pathname + window.location.search + window.location.hash) return;
    (push ? history.pushState : history.replaceState).call(history, null, '', url);
  }

  /* ---------- toasts ---------- */
  function toast(message) {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast align-items-center text-bg-dark show';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(message)}</div></div>`;
    host.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
  }

  async function copyText(text, okMessage = 'U kopjua.') {
    try { await navigator.clipboard.writeText(text); toast(okMessage); }
    catch { toast('Kopjimi nuk u lejua nga shfletuesi. Kopjojeni manualisht.'); }
  }

  async function shareOrCopy({ title, url }) {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    await copyText(url, 'Lidhja u kopjua.');
  }

  /* ---------- calendar file (.ics) for dated events ---------- */
  function downloadIcs({ title, dates, description = '', url = '', filename = 'ngjarja' }) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const events = dates.map((iso, i) => {
      const d = iso.replace(/-/g, '');
      const next = new Date(iso + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      const end = next.toISOString().slice(0, 10).replace(/-/g, '');
      return [
        'BEGIN:VEVENT',
        `UID:${filename}-${d}-${i}@mitrush-kuteli`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${icsEscape(title)}`,
        description ? `DESCRIPTION:${icsEscape(description)}` : '',
        url ? `URL:${icsEscape(url)}` : '',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');
    });
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SHFMU Mitrush Kuteli//Web//SQ', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- theme (light / dark, remembered per browser) ---------- */
  function currentTheme() { return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'; }
  function setTheme(t) {
    document.documentElement.setAttribute('data-bs-theme', t);
    try { localStorage.setItem('theme', t); } catch { /* private mode: keep it for this visit only */ }
    syncThemeButton();
  }
  function syncThemeButton() {
    const b = $('#theme-toggle');
    if (!b) return;
    const dark = currentTheme() === 'dark';
    b.setAttribute('aria-pressed', String(dark));
    b.setAttribute('aria-label', dark ? 'Kalo në temën e ndritshme' : 'Kalo në temën e errët');
    b.title = dark ? 'Tema e ndritshme' : 'Tema e errët';
    const i = b.querySelector('i');
    if (i) i.className = dark ? 'bi bi-sun' : 'bi bi-moon-stars';
  }

  /* ---------- seasonal banner (Kosovo wall time) ---------- */
  function seasonalBannerHTML() {
    const b = S.seasonalBanner;
    if (!b) return '';
    let today = '';
    try { today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date()); } catch { return ''; }
    if (today < b.from || today > b.to) return '';
    return `<div class="season-banner" id="season-banner"><a href="${esc(link(b.href))}"><span>${esc(b.text)}</span><span aria-hidden="true">→</span></a></div>`;
  }

  /* ---------- shell: header, footer, floating helpers ---------- */
  const NAV = [
    { key: 'ballina', label: 'Ballina', path: '/' },
    { key: 'stafi', label: 'Stafi', path: '/stafi' },
    { key: 'jeta', label: 'Jeta shkollore', path: '/aktivitete' },
    { key: 'galeria', label: 'Galeria', path: '/galeria' },
    { key: 'prindi', label: 'Për prindërit', path: '/per-prinder' },
  ];

  function headerHTML(active) {
    const links = NAV.map((n) => {
      const current = n.key === active ? ' aria-current="page"' : '';
      return `<li class="nav-item"><a class="nav-link-pill" href="${link(n.path)}"${current}>${esc(n.label)}</a></li>`;
    }).join('');
    const brandName = S.name.replace('Mitrush Kuteli', 'Mitrush&nbsp;Kuteli');
    return `
      ${seasonalBannerHTML()}
      <nav class="navbar navbar-expand-lg site-nav" aria-label="Navigimi kryesor">
        <div class="container d-flex align-items-center gap-3">
          <a class="brand" href="index.html" aria-label="${esc(S.name)} — Ballina">
            <img class="brand-logo" src="img/stema.webp" width="44" height="44" alt="">
            <span class="brand-text"><span class="brand-name">${brandName}</span><span class="brand-sub">Matiqan, Prishtinë</span></span>
          </a>
          <div class="offcanvas-lg offcanvas-end" tabindex="-1" id="mainMenu" aria-labelledby="mainMenuLabel">
            <div class="offcanvas-header d-lg-none">
              <h2 class="offcanvas-title h5 mb-0" id="mainMenuLabel">Menuja</h2>
              <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#mainMenu" aria-label="Mbyll menunë"></button>
            </div>
            <div class="offcanvas-body p-lg-0 d-flex flex-column flex-lg-row align-items-lg-center gap-3 ms-lg-auto">
              <ul class="navbar-nav flex-lg-row gap-lg-1 align-items-lg-center mb-0 list-unstyled">${links}</ul>
              <div class="mt-3 mt-lg-0 d-lg-none">
                <div class="quick-links mb-3">
                  <a href="${link('/per-prinder#orari')}">Orari</a>
                  <a href="${link('/konsultimet')}">Konsultimet</a>
                  <a href="${link('/kontakti')}">Kontakti</a>
                </div>
                <a class="btn btn-brand w-100 btn-lg-pill mb-2" href="tel:${esc(S.telephoneE164)}"><i class="bi bi-telephone me-2"></i>Telefono ${esc(S.telephoneDisplay)}</a>
                <a class="btn btn-outline-brand w-100" href="mailto:${esc(S.email)}"><i class="bi bi-envelope me-2"></i>Dërgo email</a>
                <form class="mt-4" action="kerko.html" method="get" role="search">
                  <label class="form-label" for="nav-q">Kërko në faqe</label>
                  <div class="input-group">
                    <input id="nav-q" class="form-control" type="search" name="q" placeholder="Staf, lajme, dokumente" autocomplete="off">
                    <button class="btn btn-brand" type="submit" aria-label="Kërko"><i class="bi bi-search"></i></button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2 ms-auto">
            <button id="theme-toggle" class="btn-icon theme-toggle" type="button" aria-pressed="false" aria-label="Kalo në temën e errët"><i class="bi bi-moon-stars"></i></button>
            <a class="btn-icon d-none d-lg-inline-grid" href="kerko.html" aria-label="Kërko në faqe" title="Kërko (tasti /)"><i class="bi bi-search"></i></a>
            <a class="btn btn-brand btn-sm d-none d-xl-inline-flex align-items-center gap-2" href="tel:${esc(S.telephoneE164)}"><i class="bi bi-telephone"></i>${esc(S.telephoneDisplay)}</a>
            <button class="navbar-toggler border-0 p-2 d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#mainMenu" aria-controls="mainMenu" aria-label="Hap menunë">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
        </div>
      </nav>`;
  }

  function footerHTML() {
    const year = S.currentSchoolYear.split('/')[0];
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.street + ', ' + S.location)}`;
    return `
      <footer class="site-footer">
        <div class="container py-5">
          <div class="row g-4 g-lg-5">
            <div class="col-12 col-lg-4">
              <div class="footer-brand"><img src="img/stema.webp" width="52" height="52" alt=""><span>${esc(S.expandedName)}</span></div>
              <p class="mb-2">${esc(S.tagline)}</p>
              <p class="small mb-0">${esc(S.street)}<br>${esc(S.location)}</p>
            </div>
            <nav class="col-6 col-lg-2" aria-label="Faqet kryesore">
              <h2>Faqet</h2>
              <ul>
                <li><a href="index.html">Ballina</a></li>
                <li><a href="index.html#shkolla">Shkolla</a></li>
                <li><a href="stafi.html">Stafi</a></li>
                <li><a href="aktivitete.html">Jeta shkollore</a></li>
                <li><a href="galeria.html">Galeria</a></li>
                <li><a href="per-prinder.html">Për prindërit</a></li>
              </ul>
            </nav>
            <nav class="col-6 col-lg-3" aria-label="Lidhje të shpejta">
              <h2>Të shpejta</h2>
              <ul>
                <li><a href="oraret.html">Orari i ziles</a></li>
                <li><a href="konsultimet.html">Konsultimet me prindër</a></li>
                <li><a href="dokumente.html">Dokumentet</a></li>
                <li><a href="lajme.html">Lajme</a></li>
                <li><a href="festat-28-nentori.html">28 Nëntori</a></li>
              </ul>
            </nav>
            <div class="col-12 col-lg-3">
              <h2>Kontakti</h2>
              <ul>
                <li><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>
                <li><a href="tel:${esc(S.telephoneE164)}">${esc(S.telephoneDisplay)}</a></li>
                <li><a href="${esc(S.facebook)}" target="_blank" rel="noopener noreferrer">Facebook <span class="small">(skedë e re)</span></a></li>
                <li><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Udhëzime për ardhje</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="container legal">
          <span>© ${esc(year)} ${esc(S.name)}</span>
          <span><a href="privatesia.html">Privatësia</a> · <a href="kerko.html">Kërko</a> · <a href="kontakti.html">Kontakti</a></span>
        </div>
      </footer>`;
  }

  function mountShell() {
    const active = document.body.dataset.active || '';
    const header = document.getElementById('site-header');
    if (header) header.outerHTML = `<header class="site-header" id="top">${headerHTML(active)}</header>`;
    const footer = document.getElementById('site-footer');
    if (footer) footer.outerHTML = footerHTML();
    if (!document.getElementById('toast-host')) {
      const host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      host.style.zIndex = '1090';
      document.body.appendChild(host);
    }
    if (!document.getElementById('to-top')) {
      const b = document.createElement('button');
      b.id = 'to-top';
      b.className = 'to-top';
      b.type = 'button';
      b.setAttribute('aria-label', 'Kthehu në krye të faqes');
      b.innerHTML = '<i class="bi bi-arrow-up" aria-hidden="true"></i>';
      b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      document.body.appendChild(b);
    }
    if (!document.getElementById('reading-progress') && document.querySelector('[data-reading-progress]')) {
      const bar = document.createElement('div');
      bar.id = 'reading-progress';
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    const sb = document.querySelector('.site-nav');
    if (sb) {
      const el = document.querySelector('.site-header');
      if (el) document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
    }
    syncThemeButton();
  }

  /* ---------- motion: reveal on scroll, header state, progress ---------- */
  function reveal(root = document) {
    const els = $$('[data-reveal]', root).filter((el) => !el.classList.contains('is-visible'));
    const counters = new Map();
    els.forEach((el) => {
      const parent = el.parentElement;
      const i = counters.get(parent) || 0;
      el.style.setProperty('--d', String(Math.min(i, 6)));
      counters.set(parent, i + 1);
    });
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    els.forEach((el) => io.observe(el));
  }

  function initMotion() {
    const nav = $('.site-nav');
    const header = $('.site-header');
    const toTop = document.getElementById('to-top');
    const bar = document.getElementById('reading-progress');
    const onScroll = () => {
      const y = window.scrollY;
      nav?.classList.toggle('is-scrolled', y > 8);
      toTop?.classList.toggle('is-visible', y > 600);
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = max > 0 ? Math.min(100, (y / max) * 100) + '%' : '0';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (header && 'ResizeObserver' in window) {
      new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px')).observe(header);
    }
    reveal();
  }

  /* ---------- global interactions ---------- */
  function initInteractions() {
    document.addEventListener('click', (e) => {
      const copy = e.target.closest('[data-copy]');
      if (copy) { e.preventDefault(); copyText(copy.dataset.copy, copy.dataset.copyMessage || 'U kopjua.'); return; }
      const share = e.target.closest('[data-share]');
      if (share) { e.preventDefault(); shareOrCopy({ title: share.dataset.title || document.title, url: window.location.href }); }
    });
    document.getElementById('theme-toggle')?.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
    // "/" focuses the page search field, or opens the search page.
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const field = document.querySelector('[data-search-focus]');
      if (field) { e.preventDefault(); field.focus(); }
      else { e.preventDefault(); window.location.href = 'kerko.html'; }
    });
    // Mobile menu closes after following a link.
    document.querySelectorAll('#mainMenu a[href]').forEach((a) => a.addEventListener('click', () => {
      const off = document.getElementById('mainMenu');
      if (off && window.bootstrap && window.innerWidth < 992) window.bootstrap.Offcanvas.getOrCreateInstance(off).hide();
    }));
    // Keep the back/forward cache from restoring a half-open menu.
    window.addEventListener('pageshow', () => {
      const off = document.getElementById('mainMenu');
      if (off && window.bootstrap) window.bootstrap.Offcanvas.getInstance(off)?.hide();
    });
  }

  /* ---------- shared component: person card (staff) ---------- */
  function consultLines(m) {
    const mine = D.consultations.filter((c) => c.staffId === m.id);
    return { mine, html: mine.map((c) => `<div>${esc(weekdayList(c.weekdays))}, ${esc(timeRange(c.start, c.end))}${(m.roles.length > 1 || mine.length > 1) ? ` <span class="muted">(${esc(CONTEXT_LABELS[c.context])})</span>` : ''}</div>`).join('') };
  }

  /**
   * Staff card. role = m.roles[0] (or the leadership role). Options:
   *  section  — group id used by the filter (data-group)
   *  hideSubject — don't repeat the subject line (when the block title already names it)
   *  compact  — row layout (used for people without a photo)
   *  anchor   — false for a second card of the same person (secondary placement)
   */
  function personCard(m, role, { section, hideSubject = false, compact = false, anchor = true } = {}) {
    const { mine, html: consultHTML } = consultLines(m);
    const roleLine = m.roles.map((r) => r.label).filter((l) => !/nuk është specifikuar/i.test(l)).join(' · ');
    const subject = hideSubject ? '' : m.subjects.filter((s) => !m.roles.some((r) => r.label === s)).join(', ');
    const grade = m.stage && /^(I|II|III|IV|V)$/.test(m.stage);
    const stageText = m.stage && m.stage !== 'parashkollor' ? (grade ? `Klasa ${m.stage}` : `klasat ${m.stage}`) : '';
    const search = normalize([m.displayName, ...m.aliases, ...m.roles.map((r) => r.label), ...m.subjects, m.stage ?? '', grade ? `klasa ${m.stage}` : ''].join(' '));
    const photo = m.portrait?.approved ? img('staff-' + m.portrait.file) : null;
    const tone = m.id.length % 2 === 0 ? 'a' : 'b';
    const isCompact = compact || !photo;
    const media = photo
      ? `<div class="person-portrait"><img src="${esc(photo.src800)}" srcset="${esc(photo.src800)} 800w, ${esc(photo.src)} 1600w" sizes="(min-width:1200px) 300px, 50vw" width="${photo.width}" height="${photo.height}" alt="Portret i ${esc(m.displayName)}" loading="lazy" decoding="async"></div>`
      : `<div class="person-portrait"><div class="person-initials ${tone}"><span aria-hidden="true">${esc(initials(m.displayName))}</span></div></div>`;
    const details = [roleLine, stageText, subject].filter(Boolean).join(' · ');
    return `
      <article class="person-card${isCompact ? ' is-compact' : ''}" ${anchor ? `id="${esc(m.id)}"` : ''} data-person data-id="${esc(m.id)}"
        data-group="${esc(section ?? role.group)}" data-subjects="${esc(m.subjects.join('|'))}" data-search="${esc(search)}"
        data-days="${esc(mine.flatMap((c) => c.weekdays).join(','))}">
        ${media}
        <div class="person-body">
          <h3>${esc(m.displayName)}</h3>
          ${details ? `<p class="person-role">${esc(details)}</p>` : ''}
          ${mine.length ? `<div class="person-consult"><strong>Takim me prindër</strong>${consultHTML}</div>` : ''}
        </div>
      </article>`;
  }

  /* ---------- shared component: consultation explorer ---------- */
  /**
   * Renders the searchable consultation list into `root` (used on /konsultimet and /per-prinder).
   * Filters: name or subject (text), weekday, type (teaching / admin). State is kept in the URL.
   */
  function initConsultationExplorer(root) {
    if (!root) return;
    const staffById = new Map(D.staff.map((s) => [s.id, s]));
    const teaching = D.consultations.filter((c) => c.context === 'teaching')
      .sort((a, b) => {
        const sa = staffById.get(a.staffId), sb = staffById.get(b.staffId);
        return (sa.subjects[0] ?? '').localeCompare(sb.subjects[0] ?? '', 'sq') || sa.displayName.localeCompare(sb.displayName, 'sq');
      });
    const adminOrder = ['administration', 'coordination', 'psychology', 'support'];
    const admin = D.consultations.filter((c) => c.context !== 'teaching')
      .sort((a, b) => adminOrder.indexOf(a.context) - adminOrder.indexOf(b.context));

    const card = (c, isTeaching) => {
      const s = staffById.get(c.staffId);
      const what = c.context === 'teaching' ? s.subjects.join(', ')
        : c.context === 'support' ? s.roles[0].label
        : (s.roles.find((r) => r.group !== 'teaching')?.label ?? CONTEXT_LABELS[c.context]);
      const search = normalize([s.displayName, ...s.aliases, what, ...s.subjects, ...s.roles.map((r) => r.label)].join(' '));
      return `
        <article class="consult-card" data-reveal data-consult data-role="${isTeaching ? 'teaching' : 'admin'}"
          data-days="${esc(c.weekdays.join(','))}" data-search="${esc(search)}">
          <h4>${esc(s.displayName)}</h4>
          <p class="what">${esc(what)}${c.context === 'coordination' ? ' (koordinim)' : ''}</p>
          <div class="when">
            <span class="day-pill">${esc(weekdayList(c.weekdays))}</span>
            <span class="time-pill"><i class="bi bi-clock" aria-hidden="true"></i>${esc(timeRange(c.start, c.end))}</span>
          </div>
        </article>`;
    };

    root.innerHTML = `
      <form class="card-soft p-3 p-md-4 mb-4" id="cx-filters" role="search" aria-label="Filtro i konsultimeve" onsubmit="return false">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-5">
            <label for="cx-q">Emri ose lënda</label>
            <div class="search-field"><i class="bi bi-search" aria-hidden="true"></i>
              <input id="cx-q" class="form-control" type="search" autocomplete="off" placeholder="p.sh. Akter, biologji, psikologe" data-search-focus>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label for="cx-day">Dita</label>
            <select id="cx-day" class="form-select"><option value="">Të gjitha ditët</option>${Object.entries(WEEKDAYS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          </div>
          <div class="col-6 col-md-3">
            <label for="cx-role">Lloji</label>
            <select id="cx-role" class="form-select"><option value="">Të gjitha</option><option value="teaching">Mësimdhënës</option><option value="admin">Administratë dhe shërbime</option></select>
          </div>
          <div class="col-12 col-md-1 d-grid">
            <button class="btn btn-ghost-soft" type="button" id="cx-reset">Pastro</button>
          </div>
        </div>
      </form>
      <p class="count-line" aria-live="polite"><span id="cx-count"></span><button class="clear-link" type="button" id="cx-clear" hidden>Pastro filtrat</button></p>
      <section class="consult-section" id="cx-admin" aria-labelledby="cx-h-admin">
        <h3 id="cx-h-admin">Administrata dhe shërbimet</h3>
        <div class="consult-grid">${admin.map((c) => card(c, false)).join('')}</div>
      </section>
      <section class="consult-section" id="cx-teaching" aria-labelledby="cx-h-teaching">
        <h3 id="cx-h-teaching">Mësimdhënësit</h3>
        <div class="consult-grid">${teaching.map((c) => card(c, true)).join('')}</div>
      </section>
      <div class="empty-state" id="cx-empty" hidden>
        <i class="bi bi-search" aria-hidden="true"></i>
        <h3>Asnjë konsultim nuk përputhet</h3>
        <p>Provoni një emër tjetër ose pastroni filtrat.</p>
      </div>`;

    const q = $('#cx-q', root), day = $('#cx-day', root), role = $('#cx-role', root);
    const count = $('#cx-count', root), clearBtn = $('#cx-clear', root), empty = $('#cx-empty', root);
    const rows = $$('[data-consult]', root);
    const sections = [$('#cx-admin', root), $('#cx-teaching', root)];

    function apply() {
      const terms = normalize(q.value).split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const r of rows) {
        const ok = terms.every((t) => r.dataset.search.includes(t))
          && (!day.value || r.dataset.days.split(',').includes(day.value))
          && (!role.value || r.dataset.role === role.value);
        r.hidden = !ok;
        if (ok) shown++;
      }
      sections.forEach((s) => { s.hidden = !s.querySelector('[data-consult]:not([hidden])'); });
      empty.hidden = shown > 0;
      clearBtn.hidden = shown === 0 || !(q.value || day.value || role.value);
      count.textContent = shown ? `${shown} nga ${rows.length} orare takimesh.` : `Asnjë rezultat nga ${rows.length} orare takimesh.`;
    }
    const toUrl = (push) => writeParams({ q: q.value.trim(), dita: day.value, lloji: role.value }, push);
    function fromUrl() {
      const p = readParams();
      q.value = p.get('q') ?? ''; day.value = p.get('dita') ?? ''; role.value = p.get('lloji') ?? '';
      apply();
    }
    const reset = () => { q.value = ''; day.value = ''; role.value = ''; apply(); toUrl(true); };
    q.addEventListener('input', () => { apply(); toUrl(false); });
    day.addEventListener('change', () => { apply(); toUrl(true); });
    role.addEventListener('change', () => { apply(); toUrl(true); });
    $('#cx-reset', root).addEventListener('click', reset);
    clearBtn.addEventListener('click', reset);
    window.addEventListener('popstate', fromUrl);
    fromUrl();
    reveal(root);
  }

  /* ---------- expose ---------- */
  window.Site = {
    data: D,
    school: S,
    staff: D.staff,
    staffById: new Map(D.staff.map((s) => [s.id, s])),
    consultations: D.consultations,
    news: D.news,
    documents: D.documents,
    $, $$, esc, normalize, img, link,
    formatDate, formatDateList, timeRange, weekdayList, initials, toMinutes, gapMinutes, classId,
    MONTHS, WEEKDAYS, DAY_NAMES, CONTEXT_LABELS, GROUP_LABELS,
    readParams, writeParams,
    toast, copyText, shareOrCopy, downloadIcs,
    setTheme, currentTheme,
    reveal,
    personCard,
    initConsultationExplorer,
  };

  /* ---------- boot ---------- */
  mountShell();
  initInteractions();
  initMotion();
})();
