/* Për prindërit: bell tables, consultation explorer, documents, notices, contact card.
   Port of src/pages/per-prinder.astro. Loaded after js/data.js and js/app.js. */
(function () {
  'use strict';

  const Site = window.Site;
  const D = window.SITE_DATA;
  if (!Site || !D) return;

  const { $, esc, timeRange, formatDate } = Site;
  const S = D.school;

  /* ---------- school year in the eyebrow ---------- */
  const year = $('#school-year');
  if (year) year.textContent = S.currentSchoolYear;

  /* ---------- Orari i ziles ---------- */
  function bellTable(title, headLabel, rowsHTML) {
    return `
      <div class="table-soft">
        <table class="table mb-0">
          <caption>${esc(title)}</caption>
          <thead><tr><th scope="col">${esc(headLabel)}</th><th scope="col">Koha</th></tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>`;
  }
  function renderBells() {
    const B = D.bells;
    const date = $('#bell-date');
    if (date) date.textContent = `Sipas dokumentit të nënshkruar më ${formatDate(B.documentDate)}.`;
    const grid = $('#bell-grid');
    if (!grid || !B) return;

    const shiftRows = (rows) => rows.map((r) =>
      `<tr><th scope="row">${esc(r.period)}</th><td class="num">${esc(timeRange(r.start, r.end))}</td></tr>`).join('');
    const groupRows = (B.preschoolGroups || []).map((g) =>
      `<tr><th scope="row">Grupi i ${g.group === 'I' ? 'parë' : 'dytë'}</th><td class="num">${esc(timeRange(g.start, g.end))}</td></tr>`).join('');

    grid.innerHTML = [
      `<div class="col-12 col-lg-4" data-reveal>${bellTable('Ndërrimi i parë', 'Ora', shiftRows(B.firstShift || []))}</div>`,
      `<div class="col-12 col-lg-4" data-reveal>${bellTable('Ndërrimi i dytë', 'Ora', shiftRows(B.secondShift || []))}</div>`,
      `<div class="col-12 col-lg-4" data-reveal>${bellTable('Parafilloret', 'Grupi', groupRows)}</div>`,
    ].join('');
    Site.reveal(grid);
  }

  /* ---------- Konsultimet (shared explorer, also used on konsultimet.html) ---------- */
  Site.initConsultationExplorer(document.getElementById('consult-root'));

  /* ---------- Dokumentet ---------- */
  function renderDocuments() {
    const list = $('#doc-list');
    if (!list) return;
    const docs = D.documents || [];
    list.innerHTML = docs.map((d) => {
      const icon = d.external ? 'bi-link-45deg' : (/pdf/i.test(d.format) ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image');
      const size = !d.external && d.sizeLabel ? `, ${d.sizeLabel}` : '';
      const openLabel = d.external ? 'Hap' : 'Shiko';
      const download = d.external ? '' : `
          <a class="btn btn-ghost-soft btn-sm" href="${esc(d.file)}" download>Shkarko ${esc(d.format)}<span class="visually-hidden"> ${esc(d.title)}</span></a>`;
      return `
      <li class="col" data-reveal>
        <article class="card-soft is-hoverable">
          <div class="card-body doc-card">
            <span class="doc-icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
            <div>
              <h3>${esc(d.title)}</h3>
              <p class="small muted mb-0">${esc(d.schoolYear)} · ${esc(d.format)}${esc(size)}</p>
            </div>
            <div class="doc-actions">
              <a class="btn btn-brand btn-sm" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer">${openLabel}<span class="visually-hidden"> ${esc(d.title)} (skedë e re)</span></a>${download}
            </div>
          </div>
        </article>
      </li>`;
    }).join('');
    Site.reveal(list);
  }

  /* ---------- Njoftimet (only when a news item has the category "Njoftim") ---------- */
  function renderNotices() {
    const section = $('#njoftimet');
    const list = $('#notice-list');
    if (!section || !list) return;
    const notices = (D.news || []).filter((n) => n.category === 'Njoftim');
    if (!notices.length) return;
    list.innerHTML = notices.map((n) =>
      `<li class="mb-2"><a class="link-arrow" href="${esc(Site.link('/lajme/' + n.slug))}">${esc(n.title)}</a></li>`).join('');
    section.hidden = false;
  }

  /* ---------- Kontakti (card) ---------- */
  function renderContactCard() {
    const card = $('#contact-card');
    if (!card) return;
    card.innerHTML = `
      <p class="mb-0"><strong>Telefon</strong><br><a href="tel:${esc(S.telephoneE164)}">${esc(S.telephoneDisplay)}</a></p>
      <p class="mb-0"><strong>Email</strong><br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>
      <p class="mb-0"><strong>Adresa</strong><br>${esc(S.street)}, ${esc(S.location)}</p>
      <a class="link-arrow" href="kontakti.html">Udhëzime për ardhje</a>`;
  }

  renderBells();
  renderDocuments();
  renderNotices();
  renderContactCard();
})();
