/* Kerko: search over pages, staff, news and documents. The index is built synchronously from js/data.js. */
(function () {
  'use strict';
  const Site = window.Site;
  if (!Site) return;
  const D = Site.data;
  const esc = Site.esc;
  const normalize = Site.normalize;

  /* Static pages: [title, Astro route, search words]. Same list as src/lib/data.ts buildSearchIndex. */
  const PAGES = [
    ['Ballina', '/', 'Shkolla Fillore dhe e Mesme e Ulët Mitrush Kuteli Prishtinë'],
    ['Rreth shkollës', '/#shkolla', 'histori identitet vlera shkallët e arsimit Mitrush Kuteli shkrimtari'],
    ['Stafi', '/stafi', 'mësimdhënës drejtoria administrata psikologe sekretar koordinatore'],
    ['Lajme', '/lajme', 'lajme njoftime arkiv'],
    ['Jeta shkollore', '/aktivitete', 'muzikë kor sport futboll aktivitete në natyrë'],
    ['Galeria', '/galeria', 'fotografi albume'],
    ['Orari & konsultimet', '/oraret', 'orari i ziles ndërrimi i parë i dytë parafillor orari mësimor klasat'],
    ['Për prindërit', '/per-prinder', 'prindër informacion pyetje të shpeshta'],
    ['Konsultimet me prindër', '/konsultimet', 'takime individuale mësimdhënës ditët orët'],
    ['Dokumentet', '/dokumente', 'dokumente orare shkarkim'],
    ['Kontakti', '/kontakti', 'email telefon adresa facebook'],
    ['Privatësia', '/privatesia', 'privatësia të dhëna cookies'],
    ['28 Nëntori', '/festat/28-nentori', 'dita e flamurit pavarësia kuiz'],
  ];

  const index = [];
  for (const [title, route, text] of PAGES) {
    index.push({ type: 'Faqe', title, text, url: Site.link(route), keys: normalize(`${title} ${text}`) });
  }
  for (const s of D.staff) {
    const text = `${s.roles.map((r) => r.label).join(', ')}${s.subjects.length ? ' · ' + s.subjects.join(', ') : ''}`;
    index.push({
      type: 'Staf',
      title: s.displayName,
      text,
      url: `stafi.html?q=${encodeURIComponent(s.displayName)}`,
      keys: normalize(`${s.displayName} ${s.aliases.join(' ')} ${text}`),
    });
  }
  for (const n of D.news) {
    index.push({
      type: 'Lajm',
      title: n.title,
      text: `${Site.formatDate(n.publishedAt)} · ${n.summary}`,
      url: Site.link(`/lajme/${n.slug}`),
      keys: normalize(`${n.title} ${n.summary} ${n.category}`),
    });
  }
  for (const d of D.documents) {
    index.push({
      type: 'Dokument',
      title: d.title,
      text: `${d.category} · ${d.schoolYear}`,
      url: 'dokumente.html',
      keys: normalize(`${d.title} ${d.originalTitle} ${d.description} ${d.category}`),
    });
  }

  /* Lidhje të shpejta, të dukshme kur fusha e kërkimit është bosh. */
  const BROWSE = [
    ['Stafi', 'stafi.html', 'bi-people'],
    ['Lajme', 'lajme.html', 'bi-newspaper'],
    ['Dokumentet', 'dokumente.html', 'bi-folder2-open'],
    ['Galeria', 'galeria.html', 'bi-images'],
    ['Jeta shkollore', 'aktivitete.html', 'bi-trophy'],
    ['Klubet', 'klubet.html', 'bi-people-fill'],
    ['Orari i ziles', 'oraret.html', 'bi-clock'],
    ['Konsultimet', 'konsultimet.html', 'bi-chat-dots'],
    ['Kontakti', 'kontakti.html', 'bi-envelope'],
  ];

  const form = document.getElementById('s-form');
  const input = document.getElementById('s-q');
  const out = document.getElementById('s-results');
  const count = document.getElementById('s-count');
  const empty = document.getElementById('s-empty');
  const browse = document.getElementById('s-browse');
  const browseList = document.getElementById('s-browse-list');
  if (!form || !input || !out || !count) return;

  if (browseList) {
    browseList.innerHTML = BROWSE.map(([label, href, icon]) => `
      <li><a class="browse-link" href="${esc(href)}"><i class="bi ${icon}" aria-hidden="true"></i><span>${esc(label)}</span></a></li>`).join('');
  }

  function render() {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      out.innerHTML = '';
      count.textContent = 'Shkruani një fjalë për të kërkuar.';
      if (empty) empty.hidden = true;
      if (browse) browse.hidden = false;
      return;
    }
    if (browse) browse.hidden = true;
    const hits = index.filter((e) => terms.every((t) => e.keys.includes(t)));
    count.textContent = hits.length ? `${hits.length} rezultate.` : 'Asnjë rezultat.';
    if (empty) empty.hidden = hits.length > 0;
    out.innerHTML = hits.map((h) => `
      <li>
        <article class="card-soft is-hoverable result-card">
          <div class="card-body">
            <span class="tag-soft">${esc(h.type)}</span>
            <h2 class="result-title"><a href="${esc(h.url)}">${esc(h.title)}</a></h2>
            <p class="muted small mb-0">${esc(h.text)}</p>
          </div>
        </article>
      </li>`).join('');
  }

  function fromUrl() {
    input.value = Site.readParams().get('q') ?? '';
    render();
  }

  input.addEventListener('input', () => {
    render();
    Site.writeParams({ q: input.value.trim() });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    render();
    Site.writeParams({ q: input.value.trim() }, true);
  });
  window.addEventListener('popstate', fromUrl);
  fromUrl();
})();
