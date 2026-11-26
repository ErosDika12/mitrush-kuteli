/* Ballina (home): hero photo, "Jeta shkollore" rotator, leadership preview,
   identity text, school facts and the three stages.
   Port of src/pages/index.astro and src/components/LifeRotator.astro.
   Loaded after js/data.js and js/app.js; uses window.Site helpers only. */
(function () {
  'use strict';

  const Site = window.Site;
  const D = window.SITE_DATA;
  if (!Site || !D) return;

  const { $, $$, esc, img, link } = Site;
  const S = D.school;

  /* ---------- hero photo (school building; plain navy block when not exported) ---------- */
  function renderHeroPhoto() {
    const hero = $('#hero');
    const b = img('school-building');
    if (!hero || !b) return;
    hero.insertAdjacentHTML('afterbegin',
      `<div class="hero-media"><img src="${esc(b.src800)}" srcset="${esc(b.src800)} 800w, ${esc(b.src)} ${esc(b.width)}w" sizes="100vw" width="${esc(b.width)}" height="${esc(b.height)}" alt="Objekti i SHFMU “Mitrush Kuteli”" fetchpriority="high"></div>`);
  }

  /* ---------- "Jeta shkollore" rotator ---------- */
  function photoHTML(slide, i, n) {
    const b = img(slide.photo);
    if (!b) return '';
    return `<img src="${esc(b.src800)}" srcset="${esc(b.src800)} 800w, ${esc(b.src)} ${esc(b.width)}w" sizes="(min-width: 960px) 1100px, 100vw" width="${esc(b.width)}" height="${esc(b.height)}" alt="" data-focus="${esc(slide.focus)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`;
  }

  function renderRotator() {
    const root = $('#life-rotator');
    if (!root) return;
    const slides = (D.home && D.home.slides) || [];
    if (!slides.length) { root.hidden = true; return; }
    const n = slides.length;
    const interval = Number(D.home.rotatorIntervalMs) || 6000;

    root.innerHTML = `
      <div class="rot-stage" id="rot-stage" tabindex="0" aria-live="off">
        ${slides.map((s, i) => `
        <article class="rot-slide${i === 0 ? ' active' : ''}" aria-roledescription="pamje" aria-label="${i + 1} nga ${n}" data-slide>
          <div class="rot-photo" aria-hidden="true">${photoHTML(s, i, n)}</div>
          <div class="rot-text">
            <span class="rot-field">${esc(s.field)}</span>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.text)}</p>
            <a class="link-arrow" href="${esc(link(s.href))}">Shih më shumë<span class="visually-hidden">: ${esc(s.title)}</span></a>
          </div>
        </article>`).join('')}
      </div>
      <div class="rot-controls">
        <button type="button" class="btn-icon rot-btn" id="rot-prev" aria-label="Pamja e mëparshme"><i class="bi bi-arrow-left" aria-hidden="true"></i></button>
        <div class="rot-dots" role="group" aria-label="Zgjidh pamjen">
          ${slides.map((s, i) => `<button type="button" class="rot-dot" data-dot="${i}" aria-label="Pamja ${i + 1}: ${esc(s.title)}"${i === 0 ? ' aria-current="true"' : ''}><span></span></button>`).join('')}
        </div>
        <button type="button" class="btn-icon rot-btn" id="rot-next" aria-label="Pamja tjetër"><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
        <button type="button" class="btn-icon rot-btn rot-pause" id="rot-pause" aria-label="Ndalo rrotullimin"><i class="bi bi-pause-fill" aria-hidden="true"></i></button>
      </div>
      <p class="visually-hidden" id="rot-live" aria-live="polite"></p>`;

    // Object position per photo (set through CSSOM, not in the markup).
    $$('[data-focus]', root).forEach((el) => { el.style.objectPosition = el.dataset.focus || ''; });

    const stage = $('#rot-stage', root);
    const slideEls = $$('[data-slide]', root);
    const dots = $$('[data-dot]', root);
    const pauseBtn = $('#rot-pause', root);
    const live = $('#rot-live', root);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cur = 0;
    let timer = null;
    let userPaused = reduced.matches;
    let hovering = false, focused = false, touching = false;

    function show(i, announce = false) {
      cur = (i + n) % n;
      slideEls.forEach((s, k) => { s.classList.toggle('active', k === cur); s.toggleAttribute('inert', k !== cur); });
      dots.forEach((d, k) => { if (k === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      if (announce) live.textContent = `Pamja ${cur + 1} nga ${n}: ${slideEls[cur].querySelector('h3').textContent}`;
    }
    const isPaused = () => userPaused || hovering || focused || touching || document.hidden;
    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (!isPaused()) timer = setTimeout(() => { show(cur + 1); schedule(); }, interval);
    }
    function syncButton() {
      // Icon button; the label changes with the state (no aria-pressed, the text says the action).
      const label = userPaused ? 'Vazhdo rrotullimin' : 'Ndalo rrotullimin';
      pauseBtn.innerHTML = `<i class="bi ${userPaused ? 'bi-play-fill' : 'bi-pause-fill'}" aria-hidden="true"></i>`;
      pauseBtn.setAttribute('aria-label', label);
      pauseBtn.title = label;
    }

    $('#rot-prev', root).addEventListener('click', () => { show(cur - 1, true); schedule(); });
    $('#rot-next', root).addEventListener('click', () => { show(cur + 1, true); schedule(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { show(k, true); schedule(); }));
    pauseBtn.addEventListener('click', () => { userPaused = !userPaused; syncButton(); schedule(); });
    root.addEventListener('mouseenter', () => { hovering = true; schedule(); });
    root.addEventListener('mouseleave', () => { hovering = false; schedule(); });
    root.addEventListener('focusin', () => { focused = true; schedule(); });
    root.addEventListener('focusout', () => { focused = false; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) { userPaused = true; syncButton(); } schedule(); });

    // Keyboard: arrows on the focused stage.
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(cur - 1, true); schedule(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { show(cur + 1, true); schedule(); e.preventDefault(); }
    });

    // Swipe on touch screens.
    let x0 = 0, y0 = 0;
    stage.addEventListener('touchstart', (e) => {
      touching = true;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      schedule();
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      touching = false;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(cur + (dx < 0 ? 1 : -1), true);
      schedule();
    });
    stage.addEventListener('touchcancel', () => { touching = false; schedule(); });

    show(0);
    syncButton();
    schedule();
  }

  /* ---------- "Udhëheqja" preview: three leadership cards ---------- */
  function renderLeadership() {
    const box = $('#staff-preview');
    if (!box) return;
    const cards = ['remzije-racaj', 'besnik-mehmeti', 'hasime-mehmeti']
      .map((id) => Site.staffById.get(id))
      .filter(Boolean)
      .map((m) => {
        const role = m.roles.find((r) => r.group === 'leadership') || m.roles[0];
        return Site.personCard(m, role, { section: 'leadership', anchor: false });
      });
    box.innerHTML = cards.join('');
    $$('.person-card', box).forEach((el) => el.setAttribute('data-reveal', ''));
    Site.reveal(box);
  }

  /* ---------- "Identiteti i shkollës": text, mission, confirmed facts ---------- */
  function renderIdentity() {
    const text = $('#identity-text');
    if (text) {
      const burimore = link('/lajme/dhoma-burimore-arsim-gjitheperfshires');
      text.innerHTML = `
        <p>${esc(S.expandedName)} ndodhet në ${esc(S.street)}, ${esc(S.location)}. Motoja jonë, <em>${esc(S.tagline)}</em>, përmbledh atë që synojmë çdo ditë: nxënës që nxënë me kënaqësi, krijojnë me guxim dhe e gjejnë vendin e vet.</p>
        <p class="identity-mission">Misioni ynë: <strong>${esc(S.mission.text)}</strong></p>
        <p>Shkolla ka edhe një <a href="${esc(burimore)}">dhomë burimore</a> për mbështetjen e arsimit gjithëpërfshirës.</p>`;
    }
    const facts = (S.facts || []).filter((f) => f.confirmed && f.value);
    const list = $('#facts-list');
    const card = $('#facts-card');
    if (list) list.innerHTML = facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');
    if (card && !facts.length) card.hidden = true;
  }

  /* ---------- "Shkallët e arsimit": three stage cards ---------- */
  function renderStages() {
    const box = $('#stage-list');
    if (!box) return;
    box.innerHTML = (S.stages || []).map((s) => `
      <article class="card-soft is-hoverable stage" id="${esc(s.id)}" data-reveal>
        <div class="card-body">
          <span class="tag-soft tag-gold stage-range">${esc(s.range)}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>
        </div>
      </article>`).join('');
    Site.reveal(box);
  }

  renderHeroPhoto();
  renderRotator();
  renderLeadership();
  renderIdentity();
  renderStages();
})();
