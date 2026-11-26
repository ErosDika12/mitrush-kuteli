/* Galeria: ambientet e shkollës (me filtër sipas hapësirës) dhe jeta shkollore në foto.
   Lightbox = Bootstrap Modal (.lightbox), që mban edhe kyçjen e scroll-it të trupit. */
(function () {
  'use strict';

  const D = window.SITE_DATA;
  const Site = window.Site;
  if (!D || !Site) return;

  const { $, $$, esc } = Site;
  const Modal = window.bootstrap && window.bootstrap.Modal;

  const spaces = D.spaces.categories;
  const albums = D.photos.albums;
  const albumIds = new Set(albums.map((a) => a.id));
  // Seksionet e hapësirave kanë prefiks: disa emra janë të njëjtë me albumet (p.sh. "muzike"), dhe
  // lidhjet /galeria#muzike duhet të shkojnë te albumi.
  const SPACE_PREFIX = 'space-';
  const SIZES = '(min-width: 1200px) 380px, 46vw';

  /* ---------- pllaka e galerisë (buton që hap lightbox-in) ---------- */
  // Foto "contain" (e tërë në kornizë) mbulohet me një sfond të turbullt të së njëjtës foto, pa shirita bosh.
  function tile({ id, alt, caption, group, focus = '', contain = false, wide = false }) {
    const im = Site.img(id);
    if (!im) return '';
    const classes = ['gallery-tile', wide ? 'is-wide' : ''].filter(Boolean).join(' ');
    const imgClass = contain ? ' class="is-contain"' : '';
    const style = focus ? ` style="object-position: ${esc(focus)}"` : '';
    const fill = contain
      ? `<img class="fill-bg" src="${esc(im.src800)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`
      : '';
    return `
        <button class="${classes}" type="button" data-lb data-group="${group}" data-full="${esc(im.src)}" data-alt="${esc(alt)}" data-caption="${esc(caption)}" aria-label="Hap foton: ${esc(caption)}">
          ${fill}<img src="${esc(im.src800)}" srcset="${esc(im.src800)} 800w, ${esc(im.src)} 1600w" sizes="${SIZES}" width="${im.width}" height="${im.height}" alt="${esc(alt)}" loading="lazy" decoding="async"${imgClass}${style}>
          <span class="cap">${esc(caption)}</span>
          <span class="zoom" aria-hidden="true"><i class="bi bi-zoom-in"></i></span>
        </button>`;
  }

  /* ---------- ambientet ---------- */
  const total = spaces.reduce((n, c) => n + c.photos.length, 0);
  const select = $('#gal-cat');
  select.innerHTML = `<option value="all">Të gjitha (${total})</option>`
    + spaces.map((c) => `<option value="${esc(c.id)}">${esc(c.title)} (${c.photos.length})</option>`).join('');

  $('#spaces-root').innerHTML = spaces.map((c) => `
    <div class="gal-cat" id="${SPACE_PREFIX}${esc(c.id)}" data-cat="${esc(c.id)}">
      <h3>${esc(c.title)}</h3>
      <div class="gallery-grid">${c.photos.map((p) => tile({ id: p.id, alt: p.alt, caption: p.caption, group: 'space' })).join('')}</div>
    </div>`).join('');

  /* ---------- jeta shkollore në foto (albumet) ---------- */
  $('#albums-root').innerHTML = albums.map((al) => {
    const tiles = D.photos.items.filter((p) => p.album === al.id).map((p) => {
      const im = Site.img(p.id);
      const wide = Boolean(im) && im.width / im.height > 1.7;
      return tile({ id: p.id, alt: p.alt, caption: p.caption, group: 'album', focus: p.focus, contain: p.fit === 'contain', wide });
    }).join('');
    return `
      <div class="album-block" id="${esc(al.id)}">
        <h3>${esc(al.title)}</h3>
        <p class="muted">${esc(al.text)}</p>
        <div class="gallery-grid">${tiles}</div>
      </div>`;
  }).join('');

  /* ---------- filtri i hapësirave ---------- */
  const sections = $$('.gal-cat', $('#spaces-root'));

  function applyFilter() {
    const v = select.value;
    sections.forEach((s) => { s.hidden = v !== 'all' && s.dataset.cat !== v; });
  }

  select.addEventListener('change', () => {
    applyFilter();
    const hash = select.value === 'all' ? '' : '#' + SPACE_PREFIX + select.value;
    history.replaceState(null, '', location.pathname + location.search + hash);
  });

  function selectFromHash() {
    let h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!h) return;
    const cat = spaces.find((c) => SPACE_PREFIX + c.id === h)
      || spaces.find((c) => c.id === h && !albumIds.has(h));
    if (!cat) return;
    select.value = cat.id;
    applyFilter();
    document.getElementById(SPACE_PREFIX + cat.id)?.scrollIntoView();
  }

  /* ---------- lightbox ---------- */
  const lb = $('#lb');
  const lbImg = $('#lb-img');
  const lbCap = $('#lb-cap');
  const lbCount = $('#lb-count');
  const stage = $('#lb-stage');
  const modal = Modal ? Modal.getOrCreateInstance(lb) : null;
  let items = [];   // fotot e të njëjtit grup (hapësira ose album) që janë të dukshme
  let cur = 0;
  let trigger = null;
  let x0 = null;

  const groupItems = (group) => $$(`[data-lb][data-group="${group}"]`).filter((b) => !b.closest('[hidden]'));

  function show(i) {
    const n = items.length;
    if (!n) return;
    cur = (i + n) % n;
    const t = items[cur];
    lbImg.src = t.dataset.full;
    lbImg.alt = t.dataset.alt;
    lbCap.textContent = t.dataset.caption;
    lbCount.textContent = `${cur + 1} / ${n}`;
    const pre = new Image();
    pre.src = items[(cur + 1) % n].dataset.full;   // foto pasuese paraprihet
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-lb]');
    if (!t || !modal) return;
    e.preventDefault();
    trigger = t;
    items = groupItems(t.dataset.group);
    show(items.indexOf(t));
    modal.show();
  });

  $('#lb-prev').addEventListener('click', () => show(cur - 1));
  $('#lb-next').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('shown.bs.modal', () => $('#lb-close').focus());
  lb.addEventListener('hidden.bs.modal', () => {
    lbImg.removeAttribute('src');
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
    items = [];
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });
  // Gisht në telefon: zhvendosje mbi 50px e majtas/djathtas.
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  stage.addEventListener('pointercancel', () => { x0 = null; });
  stage.addEventListener('pointerup', (e) => {
    const start = x0;
    x0 = null;
    if (start === null || e.pointerType !== 'touch') return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });

  $('#gal-title').textContent = D.spaces.title;
  selectFromHash();
})();
