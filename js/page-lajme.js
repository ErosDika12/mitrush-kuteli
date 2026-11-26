/* Lajme: arkivi (lista me filtra, faqe dhe URL) dhe pamja e një lajmi (lajme.html?slug=...). */
(function () {
  'use strict';

  const D = window.SITE_DATA;
  const Site = window.Site;
  if (!D || !Site) return;

  const { $, $$, esc } = Site;
  const PAGE_SIZE = 9;
  const NEWS = D.news;
  const BY_SLUG = new Map(NEWS.map((n) => [n.slug, n]));

  const metaDesc = document.querySelector('meta[name="description"]');
  const LIST_TITLE = document.title;
  const LIST_DESC = metaDesc ? metaDesc.getAttribute('content') : '';

  function setPageMeta(title, description) {
    document.title = title;
    if (metaDesc) metaDesc.setAttribute('content', description);
  }

  // Ikona e panelit kur lajmi nuk ka foto (dekor; kategoria mbetet tekst).
  const CATEGORY_ICON = { 'Mësimdhënie': 'bi-book', 'Muzikë': 'bi-music-note-beamed', 'Shkolla': 'bi-building' };

  /* ---------- kartela e lajmit (e njëjta për listën dhe "Lajme të tjera") ---------- */
  function newsCard(n, { featured = false } = {}) {
    const im = n.image ? Site.img(n.image) : null;
    const media = im
      ? `<div class="news-media"><img src="${esc(im.src800)}" srcset="${esc(im.src800)} 800w, ${esc(im.src)} 1600w" sizes="(min-width: 992px) 380px, (min-width: 768px) 50vw, 100vw" width="${im.width}" height="${im.height}" alt="" loading="lazy" decoding="async"></div>`
      : `<div class="news-media is-placeholder" aria-hidden="true"><i class="bi ${CATEGORY_ICON[n.category] || 'bi-newspaper'}"></i></div>`;
    const search = Site.normalize(`${n.title} ${n.summary} ${n.category}`);
    return `
      <article class="card-soft is-hoverable news-card${featured ? ' news-featured' : ''}" data-news data-category="${esc(n.category)}" data-search="${esc(search)}">
        ${media}
        <div class="card-body">
          <div class="meta-row">
            <span class="tag-soft">${esc(n.category)}</span>
            <time datetime="${esc(n.publishedAt)}">${esc(Site.formatDate(n.publishedAt))}</time>
          </div>
          <h3><a href="${esc(Site.link(`/lajme/${n.slug}`))}">${esc(n.title)}</a></h3>
          <p>${esc(n.summary)}</p>
          <div class="meta-row mt-auto"><i class="bi bi-journal-text" aria-hidden="true"></i><span>${esc(n.sourceKind)}</span></div>
        </div>
      </article>`;
  }

  /* ---------- lista: filtra, faqe, URL ---------- */
  function initList() {
    const q = $('#n-q');
    const cat = $('#n-cat');
    const form = $('#news-filters');
    const count = $('#news-count');
    const empty = $('#news-empty');
    const pager = $('#news-pager');
    const label = $('#news-page');
    const prev = $('#news-prev');
    const next = $('#news-next');
    const list = $('#news-list');

    list.innerHTML = NEWS.map((n) => newsCard(n)).join('');
    cat.insertAdjacentHTML('beforeend', D.newsCategories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(''));
    const cards = $$('[data-news]', list);
    let page = 1;

    function apply() {
      const terms = Site.normalize(q.value).split(/\s+/).filter(Boolean);
      const match = cards.filter((c) => terms.every((t) => c.dataset.search.includes(t)) && (!cat.value || c.dataset.category === cat.value));
      const pages = Math.max(1, Math.ceil(match.length / PAGE_SIZE));
      page = Math.min(Math.max(1, page), pages);
      const shown = match.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      cards.forEach((c) => { c.hidden = true; c.classList.remove('news-featured'); });
      shown.forEach((c) => { c.hidden = false; });
      // Lajmi i parë i faqes 1 (me foto) shfaqet më i madh.
      if (page === 1 && shown[0] && shown[0].querySelector('.news-media img')) shown[0].classList.add('news-featured');

      const filtered = terms.length > 0 || cat.value !== '';
      if (!filtered) count.textContent = `${cards.length} lajme në arkiv.`;
      else count.textContent = match.length ? `${match.length} nga ${cards.length} lajme.` : `Asnjë rezultat nga ${cards.length} lajme.`;

      empty.hidden = match.length > 0;
      pager.hidden = pages <= 1;
      label.textContent = `Faqja ${page} nga ${pages}`;
      prev.disabled = page <= 1;
      next.disabled = page >= pages;
    }

    const toUrl = (push) => Site.writeParams({ q: q.value.trim(), kategoria: cat.value, faqja: page > 1 ? String(page) : '' }, push);

    function fromUrl() {
      const p = Site.readParams();
      q.value = p.get('q') ?? '';
      cat.value = p.get('kategoria') ?? '';
      page = Number(p.get('faqja')) || 1;
      apply();
    }

    function reset() {
      q.value = '';
      cat.value = '';
      page = 1;
      apply();
      toUrl(true);
    }

    q.addEventListener('input', () => { page = 1; apply(); toUrl(false); });
    cat.addEventListener('change', () => { page = 1; apply(); toUrl(true); });
    form.addEventListener('submit', (e) => { e.preventDefault(); page = 1; apply(); toUrl(true); });
    form.addEventListener('reset', (e) => { e.preventDefault(); reset(); });
    $('#news-empty-reset').addEventListener('click', reset);
    prev.addEventListener('click', () => { page -= 1; apply(); toUrl(true); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    next.addEventListener('click', () => { page += 1; apply(); toUrl(true); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    window.addEventListener('popstate', fromUrl);

    setPageMeta(LIST_TITLE, LIST_DESC);
    fromUrl();
  }

  /* ---------- pamja e një lajmi ---------- */
  function initArticle(slug) {
    const item = BY_SLUG.get(slug);
    const hero = $('#news-hero');
    const listView = $('#news-list-view');
    const articleView = $('#news-article-view');
    const articleEl = $('#article');
    const missing = $('#article-missing');
    const related = $('#related');
    const bar = document.getElementById('reading-progress');

    hero.hidden = true;
    listView.hidden = true;
    articleView.hidden = false;
    const q = document.getElementById('n-q');
    if (q) q.removeAttribute('data-search-focus');

    if (!item) {
      articleEl.hidden = true;
      related.hidden = true;
      missing.hidden = false;
      if (bar) bar.hidden = true;
      setPageMeta(`Lajmi nuk u gjet | ${Site.school.name}`, LIST_DESC);
      return;
    }

    missing.hidden = true;
    articleEl.hidden = false;
    if (bar) bar.hidden = false;

    const hasEvent = Boolean(item.eventDates?.length || item.eventDate);
    const eventText = item.eventDates?.length
      ? Site.formatDateList(item.eventDates)
      : item.eventDate ? Site.formatDate(item.eventDate) : '';
    const sourcesHTML = item.sources.map((s) => `
            <li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>${s.note ? `<span class="muted"> · ${esc(s.note)}</span>` : ''} <span class="small muted">(hapet në skedë të re)</span></li>`).join('');

    articleEl.innerHTML = `
      <nav aria-label="Rruga e faqes" class="mb-4">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><a href="index.html">Ballina</a></li>
          <li class="breadcrumb-item"><a href="lajme.html">Lajme</a></li>
          <li class="breadcrumb-item active" aria-current="page">${esc(item.title)}</li>
        </ol>
      </nav>
      <div class="meta-row mb-3">
        <span class="tag-soft">${esc(item.category)}</span>
        <span>Botuar në burim: <time datetime="${esc(item.publishedAt)}">${esc(Site.formatDate(item.publishedAt))}</time></span>
        ${eventText ? `<span>Data e ngjarjes: ${esc(eventText)}</span>` : ''}
      </div>
      <h1>${esc(item.title)}</h1>
      <p class="lead">${esc(item.summary)}</p>
      <div class="article-body" id="article-body"></div>
      <aside class="source-box card-soft p-4 my-5" aria-labelledby="src-h">
        <h2 class="h5 mb-2" id="src-h">Burimi</h2>
        <p class="small-note mb-3">${esc(item.sourceKind)}. Shkolla ende nuk e ka miratuar formulimin; teksti është shkruar me fjalë tona.</p>
        <ul class="mb-0 ps-3">${sourcesHTML}
        </ul>
      </aside>
      <div class="article-actions">
        <button class="btn btn-outline-brand btn-sm" type="button" data-copy="${esc(window.location.href)}" data-copy-message="Lidhja u kopjua."><i class="bi bi-link-45deg me-1" aria-hidden="true"></i>Kopjo lidhjen</button>
        <button class="btn btn-outline-brand btn-sm" type="button" data-share data-title="${esc(item.title)}"><i class="bi bi-share me-1" aria-hidden="true"></i>Ndaj</button>
        ${hasEvent ? '<button class="btn btn-outline-brand btn-sm" type="button" id="ics-btn"><i class="bi bi-calendar-plus me-1" aria-hidden="true"></i>Shto në kalendar</button>' : ''}
        <a class="link-arrow back-link" href="lajme.html">Të gjitha lajmet</a>
      </div>`;

    // Trupi i lajmit është HTML i besuar, i eksportuar nga burimi ynë (scripts/export-web-data.mjs).
    $('#article-body').innerHTML = item.html;

    if (hasEvent) {
      $('#ics-btn').addEventListener('click', () => Site.downloadIcs({
        title: item.title,
        dates: item.eventDates?.length ? item.eventDates : [item.eventDate],
        description: item.summary,
        url: window.location.href,
        filename: item.slug,
      }));
    }

    // Lajme të tjera: fillimisht të së njëjtës kategori, pastaj të tjerat.
    const others = NEWS.filter((n) => n.slug !== item.slug);
    const picks = [
      ...others.filter((n) => n.category === item.category),
      ...others.filter((n) => n.category !== item.category),
    ].slice(0, 2);
    related.hidden = picks.length === 0;
    const relList = $('#related-list');
    relList.innerHTML = picks.map((n) => newsCard(n)).join('');

    setPageMeta(`${item.title} | ${Site.school.name}`, item.summary);
  }

  const slug = Site.readParams().get('slug');
  if (slug) initArticle(slug);
  else initList();
})();
