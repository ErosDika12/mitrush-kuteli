/* =========================================================================
   oraret.html: page logic. Port of src/pages/oraret.astro.
   Needs js/app.js (window.Site) and js/timetable.js (window.Timetable).
   Each part renders on its own, so a failure in one never stops the others.
   ========================================================================= */
(function () {
  'use strict';

  const Site = window.Site;
  const D = window.SITE_DATA;
  if (!Site || !D) {
    console.error('oraret: js/app.js or js/data.js did not load');
    return;
  }
  const esc = Site.esc;
  const $ = Site.$;
  const $$ = Site.$$;

  function safely(name, fn) {
    try { fn(); } catch (err) { console.error(`oraret: ${name} could not be rendered`, err); }
  }

  /* ---------- hero: school year from the data ---------- */
  safely('hero', () => {
    const y = $('[data-bind="school-year"]');
    if (y && D.school && D.school.currentSchoolYear) y.textContent = D.school.currentSchoolYear;
  });

  /* ---------- tabs: one panel at a time, chosen by the hash (default #zilja) ---------- */
  const panels = $$('[data-panel]');
  const tabs = $$('[data-tab]');
  const tabNav = $('#oraret-tabs');

  function showPanel() {
    const id = (window.location.hash || '#zilja').slice(1);
    const target = panels.find((p) => p.id === id) || panels[0];
    panels.forEach((p) => { p.hidden = p !== target; });
    tabs.forEach((t) => {
      if (t.dataset.tab === target.id) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
  }

  window.addEventListener('hashchange', () => {
    showPanel();
    // If the tabs scrolled out of view, bring the new panel's start back into view.
    if (tabNav && tabNav.getBoundingClientRect().top < 0) tabNav.scrollIntoView();
  });
  safely('tabs', showPanel);

  /* ---------- Orari i ziles ---------- */
  // Adds a "Pushim" row between two periods when the break is at least 10 minutes.
  function withGaps(list) {
    const out = [];
    list.forEach((p, i) => {
      out.push({ kind: 'period', period: p.period, start: p.start, end: p.end });
      const next = list[i + 1];
      if (next && Site.gapMinutes(p.end, next.start) >= 10) {
        out.push({ kind: 'gap', minutes: Site.gapMinutes(p.end, next.start), start: p.end, end: next.start });
      }
    });
    return out;
  }

  function bellsTable(title, rows) {
    const body = rows.map((r) => (r.kind === 'period'
      ? `<tr><th scope="row">${esc(r.period)}</th><td class="num">${esc(Site.timeRange(r.start, r.end))}</td></tr>`
      : `<tr class="gap-row"><td colspan="2">Pushim ${esc(r.start)}–${esc(r.end)} (${esc(r.minutes)} min, i llogaritur nga orari)</td></tr>`)).join('');
    return `
      <div class="table-soft oraret-scroll" role="region" aria-label="${esc(title)}" tabindex="0">
        <table class="table mb-0">
          <caption>${esc(title)}</caption>
          <thead><tr><th scope="col">Ora</th><th scope="col">Koha</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  function preschoolTable(groups) {
    const body = groups.map((g) => `<tr><th scope="row">Grupi i ${g.group === 'I' ? 'parë' : 'dytë'}</th><td class="num">${esc(Site.timeRange(g.start, g.end))}</td></tr>`).join('');
    return `
      <div class="table-soft oraret-scroll" role="region" aria-label="Parafilloret" tabindex="0">
        <table class="table mb-0">
          <caption>Parafilloret</caption>
          <thead><tr><th scope="col">Grupi</th><th scope="col">Koha</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  safely('orari i ziles', () => {
    const b = D.bells;
    $('#bells-intro').innerHTML = `Sipas dokumentit të nënshkruar më <strong>${esc(Site.formatDate(b.documentDate))}</strong> nga drejtoresha. Referenca në dokument lexohet “${esc(b.reference)}”. Viti në referencë është shkruar siç duket në origjinal dhe pret kontroll nga shkolla.`;
    $('#bells-shifts').innerHTML = [
      ['Ndërrimi i parë', b.firstShift],
      ['Ndërrimi i dytë', b.secondShift],
    ].map(([title, list]) => `<div class="col-12 col-md-6">${bellsTable(title, withGaps(list))}</div>`).join('');
    $('#bells-preschool').innerHTML = preschoolTable(b.preschoolGroups);

    const doc = Site.documents.find((d) => d.file && String(d.file).includes('orari-i-ziles'));
    const dl = $('#bells-download');
    if (doc && dl) {
      dl.href = doc.file;
      dl.hidden = false;
    }

    const pb = $('#print-bells');
    if (pb) {
      pb.hidden = false;
      pb.addEventListener('click', () => {
        document.documentElement.dataset.print = 'zilja';
        window.print();
      });
    }
  });
  window.addEventListener('afterprint', () => { delete document.documentElement.dataset.print; });

  /* ---------- Dokumenti origjinal ---------- */
  safely('dokumenti origjinal', () => {
    const file = D.timetable.meta.file;
    $('#orig-img').src = file;
    $('#orig-link').href = file;
    $('#orig-open').href = file;
    $('#orig-download').href = file;
  });

  /* ---------- Orari sipas klasave ---------- */
  function teacherName(T, staffId) {
    const t = T.teachers.find((x) => x.staffId === staffId);
    if (t) return t.name;
    const s = Site.staffById.get(staffId);
    return s ? s.displayName : staffId;
  }

  function issuesHTML(T) {
    const meta = D.timetable.meta;
    const items = [
      ...T.conflicts.map((c) => `<li>Klasa <strong>${esc(c.classId)}</strong>, ${esc(T.DAYS[c.day])}, ora ${c.period + 1}: shënohet te dy mësimdhënës (${c.teachers.map((n) => esc(n)).join(' dhe ')}).</li>`),
      ...T.gaps.map((g) => `<li>Klasa <strong>${esc(g.classId)}</strong>, ${esc(T.DAYS[g.day])}, ora ${g.period + 1}: asnjë mësimdhënës i shënuar.</li>`),
      ...(meta.flaggedCells || []).map((f) => `<li>${esc(teacherName(T, f.staffId))}, ${esc(T.DAYS[f.day - 1])}, ora ${f.period}: ${esc(f.reason)}</li>`),
      '<li>Shënimet e klasës drejtuese në kolonën e majtë të tabelës nuk lexohen me siguri dhe nuk publikohen.</li>',
    ];
    return items.join('');
  }

  function classView(T, cid) {
    const grid = T.classGrids.get(cid);
    const head = T.DAYS.map((d, di) => `<th scope="col" data-day="${di}">${esc(d)}</th>`).join('');
    let body = '';
    for (let p = 0; p < T.PERIODS; p++) {
      let cells = '';
      T.DAYS.forEach((_, di) => {
        const slot = grid[di][p];
        const free = slot.entries.length === 0;
        const cls = [free && 'free', slot.conflict && 'conflict'].filter(Boolean).join(' ');
        const inner = free
          ? '<span title="Asnjë mësimdhënës i shënuar në dokument">—<span class="visually-hidden"> asnjë shënim</span></span>'
          : slot.entries.map((e) => `<span>${esc(e.name)}${e.subject ? `<small>${esc(e.subject)}</small>` : ''}</span>`).join('');
        const conflict = slot.conflict ? '<span class="cell-conflict">⚠ Dyfishim në dokument</span>' : '';
        const reviews = slot.entries
          .filter((e) => e.review)
          .map((e) => `<span class="cell-conflict is-review">⚠ ${esc(e.review)}</span>`)
          .join('');
        cells += `<td data-day="${di}" class="${cls}">${inner}${conflict}${reviews}</td>`;
      });
      body += `<tr><th scope="row">${p + 1}</th>${cells}</tr>`;
    }
    return `
      <div class="table-soft oraret-scroll tt-view mb-4" data-class="${esc(cid)}" role="region" aria-label="${esc(`Orari i klasës ${cid}`)}" tabindex="0">
        <table class="table tt mb-0">
          <caption>Klasa ${esc(cid)}, ${esc(D.timetable.meta.schoolYear)} (transkriptim provizor)</caption>
          <thead><tr><th scope="col">Ora</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  function teacherView(T, t) {
    const head = Array.from({ length: T.PERIODS }, (_, p) => `<th scope="col">Ora ${p + 1}</th>`).join('');
    const rows = T.DAYS.map((d, di) => {
      const cells = t.days[di].map((cell) => {
        const free = cell.state !== 'assigned';
        const cls = [free && 'free', cell.conflict && 'conflict'].filter(Boolean).join(' ');
        const inner = free
          ? '<span>—<span class="visually-hidden"> bosh</span></span>'
          : `<span class="tt-class-id">${esc(cell.classId)}</span>`;
        const warn = cell.conflict ? '<span class="cell-conflict" title="Dyfishim në dokument">⚠<span class="visually-hidden"> Dyfishim në dokument</span></span>' : '';
        return `<td class="${cls}">${inner}${warn}</td>`;
      }).join('');
      return `<tr data-day="${di}"><th scope="row">${esc(d)}</th>${cells}</tr>`;
    }).join('');
    return `
      <div class="table-soft oraret-scroll tt-view mb-4" data-teacher="${esc(t.staffId)}" role="region" aria-label="${esc(`Orari i mësimdhënësit ${t.name}`)}" tabindex="0">
        <table class="table tt tt-teacher mb-0">
          <caption>${esc(t.name)}, ${esc(t.subject)}</caption>
          <thead><tr><th scope="col">Dita</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function timetableHTML(T) {
    const meta = D.timetable.meta;
    const classOptions = T.classIds.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const teacherOptions = '<option value="">— zgjidhni (opsionale) —</option>'
      + T.teachers.map((t) => `<option value="${esc(t.staffId)}">${esc(t.name)} (${esc(t.subject)})</option>`).join('');
    const dayOptions = '<option value="">Të gjitha ditët</option>'
      + T.DAYS.map((d, i) => `<option value="${i}">${esc(d)}</option>`).join('');

    return `
      <div class="callout oraret-callout mb-4">
        <p class="mb-2"><strong>Kujdes.</strong> ${esc(meta.statusText)} Fotografia e orarit është e ulët në cilësi dhe e anuar, ndaj çdo qelizë është lexuar dhe kontrolluar ndaj klasave dhe orëve të tjera, por jo e verifikuar nga shkolla.</p>
        <details>
          <summary>Çfarë është e pasigurt ose e papërputhshme në dokument?</summary>
          <ul class="mt-2 mb-2">${issuesHTML(T)}</ul>
          <p class="small mb-0">Qelizat bosh janë lënë bosh. Asnjë qelizë nuk është plotësuar me supozim.</p>
        </details>
      </div>

      <p class="small muted mb-4">Ora 1–6 janë orët mësimore të ditës, jo kohë në orë. Kohët e ziles ndodhen te <a href="#zilja">Orari i ziles</a>; ndarja e klasave sipas ndërrimeve nuk është konfirmuar.</p>

      <form class="card-soft oraret-filters mb-4" id="tt-filters" aria-label="Zgjidh orarin">
        <div class="row g-3">
          <div class="col-12 col-sm-6 col-lg-4">
            <label class="form-label" for="tt-class">Klasa</label>
            <select class="form-select" id="tt-class">${classOptions}</select>
          </div>
          <div class="col-12 col-sm-6 col-lg-4">
            <label class="form-label" for="tt-teacher">Mësimdhënësi</label>
            <select class="form-select" id="tt-teacher">${teacherOptions}</select>
          </div>
          <div class="col-12 col-sm-6 col-lg-4">
            <label class="form-label" for="tt-day">Dita</label>
            <select class="form-select" id="tt-day">${dayOptions}</select>
          </div>
        </div>
      </form>

      <div id="tt-class-views">${T.classIds.map((cid) => classView(T, cid)).join('')}</div>
      <div id="tt-teacher-views" hidden>${T.teachers.map((t) => teacherView(T, t)).join('')}</div>`;
  }

  // Class view unless a teacher is chosen; the day filter keeps only the chosen day.
  function wireTimetable(root, T) {
    const sc = $('#tt-class', root);
    const st = $('#tt-teacher', root);
    const sd = $('#tt-day', root);
    const classViews = $('#tt-class-views', root);
    const teacherViews = $('#tt-teacher-views', root);
    const form = $('#tt-filters', root);

    const params = Site.readParams();
    const klasa = params.get('klasa');
    const mesimdhenes = params.get('mesimdhenes');
    const dita = params.get('dita');
    if (klasa && T.classIds.includes(klasa)) sc.value = klasa;
    if (mesimdhenes && T.teachers.some((t) => t.staffId === mesimdhenes)) st.value = mesimdhenes;
    if (dita && /^[0-4]$/.test(dita)) sd.value = dita;

    function apply(writeUrl) {
      const byTeacher = Boolean(st.value);
      classViews.hidden = byTeacher;
      teacherViews.hidden = !byTeacher;
      classViews.querySelectorAll('.tt-view').forEach((v) => { v.hidden = v.dataset.class !== sc.value; });
      teacherViews.querySelectorAll('.tt-view').forEach((v) => { v.hidden = v.dataset.teacher !== st.value; });
      root.querySelectorAll('[data-day]').forEach((el) => { el.hidden = Boolean(sd.value) && el.dataset.day !== sd.value; });
      if (writeUrl) {
        Site.writeParams(byTeacher
          ? { mesimdhenes: st.value, dita: sd.value }
          : { klasa: sc.value, dita: sd.value });
      }
    }

    sc.addEventListener('change', () => { st.value = ''; apply(true); });
    st.addEventListener('change', () => apply(true));
    sd.addEventListener('change', () => apply(true));
    form.addEventListener('submit', (e) => e.preventDefault());
    apply(false);
  }

  function renderTimetable() {
    const root = $('#tt-root');
    try {
      const T = window.Timetable.load();
      root.innerHTML = timetableHTML(T);
      wireTimetable(root, T);
    } catch (err) {
      console.error('oraret: the class timetable could not be read', err);
      root.innerHTML = '<div class="callout"><p class="mb-0">Orari sipas klasave nuk mund të shfaqet tani. Shihni dokumentin origjinal te “Dokumenti origjinal”.</p></div>';
    }
  }
  safely('orari sipas klasave', renderTimetable);
})();
