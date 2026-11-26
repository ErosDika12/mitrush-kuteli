/* Kontakti: contact actions, contact cards (with copy buttons) and directions.
   Port of src/pages/kontakti.astro. Values come from window.Site.school.
   Map links match src/lib/site.ts (mapsUrl, osmUrl). Loaded after js/data.js and js/app.js. */
(function () {
  'use strict';

  const Site = window.Site;
  const D = window.SITE_DATA;
  if (!Site || !D) return;

  const root = document.getElementById('contact-root');
  if (!root) return;

  const { esc } = Site;
  const S = Site.school;

  const SUBJECT = encodeURIComponent('Pyetje për shkollën');
  const mailHref = `mailto:${S.email}?subject=${SUBJECT}`;
  const telHref = `tel:${S.telephoneE164}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.street + ', ' + S.location)}`;
  const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(S.street + ' Prishtinë')}`;

  const card = (title, body, actions = '') => `
    <div class="card-soft is-hoverable" data-reveal>
      <div class="card-body d-flex flex-column gap-2">
        <h2 class="fs-5 mb-0">${title}</h2>
        <div>${body}</div>
        ${actions ? `<div class="d-flex flex-wrap gap-2 pt-2">${actions}</div>` : ''}
      </div>
    </div>`;

  const copyBtn = (value, message, label) =>
    `<button type="button" class="btn btn-ghost-soft btn-sm" data-copy="${esc(value)}" data-copy-message="${esc(message)}"><i class="bi bi-clipboard me-1" aria-hidden="true"></i>${esc(label)}</button>`;

  root.innerHTML = `
    <div class="contact-actions d-flex flex-wrap gap-3 mb-5">
      <a class="btn btn-brand btn-lg-pill" href="${esc(telHref)}"><i class="bi bi-telephone me-2" aria-hidden="true"></i>Telefono ${esc(S.telephoneDisplay)}</a>
      <a class="btn btn-outline-brand btn-lg-pill" href="${esc(mailHref)}"><i class="bi bi-envelope me-2" aria-hidden="true"></i>Dërgo email</a>
      <a class="btn btn-ghost-soft btn-lg-pill" href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-geo-alt me-2" aria-hidden="true"></i>Udhëzime në hartë</a>
    </div>
    <div class="row g-4 g-xl-5">
      <div class="col-lg-7">
        <div class="row g-4">
          <div class="col-md-6">${card('Email',
            `<a href="${esc(mailHref)}">${esc(S.email)}</a>`,
            copyBtn(S.email, 'Email-i u kopjua.', 'Kopjo email'))}</div>
          <div class="col-md-6">${card('Telefon',
            `<a href="${esc(telHref)}">${esc(S.telephoneDisplay)}</a>`,
            copyBtn(S.telephoneDisplay, 'Numri u kopjua.', 'Kopjo numrin'))}</div>
          <div class="col-md-6">${card('Adresa', `${esc(S.street)}<br>${esc(S.location)}`)}</div>
          <div class="col-md-6">${card('Facebook',
            `<a href="${esc(S.facebook)}" target="_blank" rel="noopener noreferrer">Faqja e shkollës në Facebook</a> <span class="small muted">(hapet në skedë të re)</span>`)}</div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="card-soft is-hoverable" data-reveal>
          <div class="card-body d-flex flex-column gap-3">
            <h2 class="fs-4 mb-0">Udhëzime për ardhje</h2>
            <p class="mb-0">Hapni adresën në hartë.</p>
            <div class="d-flex flex-wrap gap-2">
              <a class="btn btn-ghost-soft" href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer">Hap në Google Maps</a>
              <a class="btn btn-ghost-soft" href="${esc(osmUrl)}" target="_blank" rel="noopener noreferrer">Hap në OpenStreetMap</a>
            </div>
            <p class="small muted mb-0 mt-auto">Për takime me mësimdhënës shihni <a href="per-prinder.html#konsultimet">orarin e konsultimeve</a>.</p>
          </div>
        </div>
      </div>
    </div>`;

  Site.reveal(root);
})();
