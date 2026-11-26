/* Dokumentet: lista me filtra (fjalë kyçe, kategoria, viti) dhe URL. */
(function () {
  'use strict';

  const D = window.SITE_DATA;
  const Site = window.Site;
  if (!D || !Site) return;

  const { $, $$, esc } = Site;
  const docs = D.documents;
  const categories = [...new Set(docs.map((d) => d.category))];
  const years = [...new Set(docs.map((d) => d.schoolYear))];

  // Ikona sipas llojit: lidhje e jashtme, PDF, figurë, ose tekst.
  function iconFor(d) {
    if (d.external) return 'bi-link-45deg';
    const f = String(d.format || '').toUpperCase();
    if (f === 'PDF') return 'bi-file-earmark-pdf';
    if (/PNG|JPE?G|WEBP|GIF/.test(f)) return 'bi-file-earmark-image';
    return 'bi-file-earmark-text';
  }

  function docCard(d) {
    const size = !d.external && d.sizeLabel ? d.sizeLabel : '';
    const search = Site.normalize(`${d.title} ${d.originalTitle} ${d.description} ${d.category}`);
    const meta = [
      `<span class="tag-soft">${esc(d.category)}</span>`,
      `<span>Viti: ${esc(d.schoolYear)}</span>`,
      d.date ? `<span>Data: ${esc(Site.formatDate(d.date))}</span>` : '',
      `<span>${esc(d.format)}${size ? `, ${esc(size)}` : ''}</span>`,
    ].filter(Boolean).join('');
    const original = d.originalTitle && d.originalTitle !== d.title
      ? `<p class="small-note mt-2 mb-0">Titulli origjinal: ${esc(d.originalTitle)}</p>`
      : '';
    const actions = [
      `<a class="btn btn-brand btn-sm" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer">${d.external ? 'Hap burimin' : 'Shiko'}<span class="visually-hidden"> ${esc(d.title)} (skedë e re)</span></a>`,
      !d.external
        ? `<a class="btn btn-ghost-soft btn-sm" href="${esc(d.file)}" download>Shkarko${size ? ` (${esc(size)})` : ''}<span class="visually-hidden"> ${esc(d.title)}</span></a>`
        : '',
      d.transcription
        ? `<a class="btn btn-ghost-soft btn-sm" href="${esc(Site.link(d.transcription))}">Version i lexueshëm</a>`
        : '',
    ].filter(Boolean).join('');

    return `
      <article class="card-soft is-hoverable doc-card p-4" data-doc data-cat="${esc(d.category)}" data-year="${esc(d.schoolYear)}" data-search="${esc(search)}">
        <div class="doc-icon"><i class="bi ${iconFor(d)}" aria-hidden="true"></i></div>
        <div>
          <h3>${esc(d.title)}</h3>
          <p class="muted mb-2">${esc(d.description)}</p>
          <div class="meta-row">${meta}</div>
          ${original}
        </div>
        <div class="doc-actions">${actions}</div>
      </article>`;
  }

  const list = $('#doc-list');
  list.innerHTML = docs.map(docCard).join('');

  const q = $('#d-q');
  const cat = $('#d-cat');
  const year = $('#d-year');
  const count = $('#d-count');
  const empty = $('#d-empty');
  const cards = $$('[data-doc]', list);

  cat.insertAdjacentHTML('beforeend', categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(''));
  year.insertAdjacentHTML('beforeend', years.map((y) => `<option value="${esc(y)}">${esc(y)}</option>`).join(''));

  function apply() {
    const terms = Site.normalize(q.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const ok = terms.every((t) => card.dataset.search.includes(t))
        && (!cat.value || card.dataset.cat === cat.value)
        && (!year.value || card.dataset.year === year.value);
      card.hidden = !ok;
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
    count.textContent = `${shown} nga ${cards.length} dokumente.`;
  }

  const toUrl = (push) => Site.writeParams({ q: q.value.trim(), kategoria: cat.value, viti: year.value }, push);

  function fromUrl() {
    const p = Site.readParams();
    q.value = p.get('q') ?? '';
    cat.value = p.get('kategoria') ?? '';
    year.value = p.get('viti') ?? '';
    apply();
  }

  q.addEventListener('input', () => { apply(); toUrl(false); });
  cat.addEventListener('change', () => { apply(); toUrl(true); });
  year.addEventListener('change', () => { apply(); toUrl(true); });
  $('#d-reset').addEventListener('click', () => {
    q.value = '';
    cat.value = '';
    year.value = '';
    apply();
    toUrl(true);
  });
  $('#d-filters').addEventListener('submit', (e) => e.preventDefault());
  window.addEventListener('popstate', fromUrl);

  fromUrl();
})();
