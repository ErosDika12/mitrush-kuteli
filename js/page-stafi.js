/* Staff directory (stafi.html). Renders the categories from SITE_DATA.staffSections and
   filters them in place. Filter and URL behaviour follow src/pages/stafi.astro. */
(function () {
  'use strict';

  const Site = window.Site;
  if (!Site || !Site.data) { console.error('js/app.js did not load'); return; }

  const esc = Site.esc;
  const staff = Site.staff;
  const byId = Site.staffById;
  const sections = Site.data.staffSections || [];

  const num = (i) => String(i + 1).padStart(2, '0');
  const plural = (n) => `${n} ${n === 1 ? 'anëtar' : 'anëtarë'}`;
  const countOf = (s) => s.blocks.reduce((n, b) => n + (b.ids ? b.ids.length : 0), 0);

  const form = document.getElementById('staff-filters');
  const q = document.getElementById('f-q');
  const lenda = document.getElementById('f-lenda');
  const grupi = document.getElementById('f-grupi');
  const chips = document.getElementById('staff-chips');
  const host = document.getElementById('staff-sections');
  const count = document.getElementById('staff-count');
  const clearBtn = document.getElementById('staff-clear');
  const empty = document.getElementById('staff-empty');

  let people = [];
  let blocks = [];
  let sectionEls = [];
  let total = 0;

  /* Every person must appear in exactly one primary card. Problems are reported, not thrown. */
  function checkSections() {
    const placed = sections.flatMap((s) => s.blocks.flatMap((b) => (b.ids || []).filter((id) => !(b.secondary || []).includes(id))));
    const missing = staff.filter((m) => !placed.includes(m.id)).map((m) => m.id);
    const dupes = placed.filter((id, i) => placed.indexOf(id) !== i);
    const unknown = placed.filter((id) => !byId.has(id));
    if (missing.length || dupes.length || unknown.length) {
      console.warn(`staff-sections.json mismatch. missing: ${missing}; duplicates: ${dupes}; unknown: ${unknown}`);
    }
  }

  function personHTML(sec, block, id) {
    const m = byId.get(id);
    return Site.personCard(m, m.roles[0] || null, {
      section: sec.id,
      hideSubject: !!block.title,
      anchor: !(block.secondary || []).includes(id),
    });
  }

  function blockHTML(sec, block) {
    const title = block.title
      ? `<h3 class="subject-title"><span>${esc(block.title)}</span>${block.ids ? ` <small data-block-count>${block.ids.length}</small>` : ''}</h3>`
      : '';
    let body = '';
    if (block.see) {
      const target = byId.get(block.see);
      body = `<p class="see-also" data-see="${esc(block.see)}"><a href="#${esc(block.see)}">${esc(target ? target.displayName : block.see)}</a> · shih kartën te ${esc(block.seeLabel || '')}</p>`;
    } else {
      const ids = (block.ids || []).filter((id) => byId.has(id));
      const withPhoto = ids.filter((id) => byId.get(id).portrait?.approved);
      const withoutPhoto = ids.filter((id) => !byId.get(id).portrait?.approved);
      if (withPhoto.length) body += `<div class="staff-grid">${withPhoto.map((id) => personHTML(sec, block, id)).join('')}</div>`;
      if (withoutPhoto.length) body += `<div class="staff-list">${withoutPhoto.map((id) => personHTML(sec, block, id)).join('')}</div>`;
    }
    return `<div class="sd-block" data-block data-reveal>${title}${body}</div>`;
  }

  function sectionHTML(sec, i) {
    const id = esc(sec.id);
    const note = sec.note ? `<p class="sd-note muted" data-note>${esc(sec.note)}</p>` : '';
    return `
      <section class="sd-sec" id="${id}" data-group-section="${id}" aria-labelledby="${id}-h">
        <header class="staff-group-title sd-side">
          <span class="num" aria-hidden="true">${num(i)}</span>
          <h2 id="${id}-h">${esc(sec.title)}</h2>
          <small data-sec-count>${esc(plural(countOf(sec)))}</small>
        </header>
        <div class="sd-main">${note}${sec.blocks.map((b) => blockHTML(sec, b)).join('')}</div>
      </section>`;
  }

  function render() {
    const subjects = [...new Set(staff.flatMap((m) => m.subjects))].sort((a, b) => a.localeCompare(b, 'sq'));
    lenda.insertAdjacentHTML('beforeend', subjects.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join(''));
    grupi.insertAdjacentHTML('beforeend', sections.map((s, i) => `<option value="${esc(s.id)}">${num(i)} ${esc(s.title)}</option>`).join(''));
    chips.innerHTML = sections.map((s, i) => `<a class="chip-btn" href="#${esc(s.id)}"><b>${num(i)}</b> ${esc(s.title)}</a>`).join('');
    host.innerHTML = sections.map(sectionHTML).join('');
    Site.reveal(host);

    people = Array.from(host.querySelectorAll('[data-person]'));
    blocks = Array.from(host.querySelectorAll('[data-block]'));
    sectionEls = Array.from(host.querySelectorAll('[data-group-section]'));
    total = new Set(people.map((p) => p.dataset.id)).size;
  }

  /* Anchor targets (category headings, cross-reference links) stay clear of the sticky header
     and, on desktop, the filter bar. The CSS scroll-margin reads --sd-offset. */
  function offsets() {
    const header = document.querySelector('.site-header');
    const bar = document.getElementById('sd-bar');
    const stuck = window.matchMedia('(min-width: 900px)').matches;
    const headerH = header ? header.offsetHeight : 0;
    const barH = stuck && bar ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty('--sd-offset', `${headerH + barH + 16}px`);
  }

  function apply() {
    const terms = Site.normalize(q.value).split(/\s+/).filter(Boolean);
    const seen = new Set();
    for (const p of people) {
      const hay = p.dataset.search || '';
      const ok = terms.every((t) => hay.includes(t))
        && (!lenda.value || (p.dataset.subjects || '').split('|').includes(lenda.value))
        && (!grupi.value || p.dataset.group === grupi.value);
      p.hidden = !ok;
      if (ok) seen.add(p.dataset.id);
    }
    // A cross-reference shows only while the card it points to is shown and no category filter is set.
    for (const l of host.querySelectorAll('[data-see]')) {
      const target = document.getElementById(l.dataset.see);
      l.hidden = !target || target.hidden || !!grupi.value;
    }
    for (const b of blocks) {
      b.hidden = !b.querySelector('[data-person]:not([hidden]), [data-see]:not([hidden])');
      const c = b.querySelector('[data-block-count]');
      if (c) c.textContent = String(b.querySelectorAll('[data-person]:not([hidden])').length);
    }
    for (const s of sectionEls) {
      const note = s.querySelector('[data-note]');
      s.hidden = note
        ? !!(terms.length || lenda.value || (grupi.value && grupi.value !== s.dataset.groupSection))
        : !s.querySelector('[data-block]:not([hidden])');
      const c = s.querySelector('[data-sec-count]');
      if (c) c.textContent = plural(s.querySelectorAll('[data-person]:not([hidden])').length);
    }
    empty.hidden = seen.size > 0 || !sectionEls.every((s) => s.hidden);
    clearBtn.hidden = seen.size === 0 || !(q.value || lenda.value || grupi.value);
    count.textContent = seen.size
      ? `Po shfaqen ${seen.size} nga ${total} persona.`
      : `Asnjë rezultat nga ${total} persona.`;
  }

  function fromUrl() {
    const p = Site.readParams();
    q.value = p.get('q') ?? '';
    lenda.value = p.get('lenda') ?? '';
    grupi.value = p.get('grupi') ?? '';
    apply();
  }

  function toUrl(push) {
    Site.writeParams({ q: q.value.trim(), lenda: lenda.value, grupi: grupi.value }, push);
  }

  function reset() {
    q.value = '';
    lenda.value = '';
    grupi.value = '';
    apply();
    toUrl(true);
    q.focus();
  }

  function boot() {
    checkSections();
    render();
    offsets();
    window.addEventListener('resize', offsets);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(offsets);

    q.addEventListener('input', () => { apply(); toUrl(false); });
    lenda.addEventListener('change', () => { apply(); toUrl(true); });
    grupi.addEventListener('change', () => { apply(); toUrl(true); });
    form.addEventListener('submit', (e) => { e.preventDefault(); apply(); toUrl(true); });
    form.addEventListener('reset', (e) => { e.preventDefault(); reset(); });
    document.getElementById('staff-empty-reset').addEventListener('click', reset);
    clearBtn.addEventListener('click', reset);
    window.addEventListener('popstate', fromUrl);
    fromUrl();
  }

  boot();
})();
