/* Klubet: sporti (kartë me foto, ose me ikonë kur nuk ka foto) dhe klubet e tjera (listë kompakte), nga js/data.js. */
(function () {
  'use strict';
  const Site = window.Site;
  if (!Site) return;
  const D = Site.data;
  const esc = Site.esc;
  const photoInfo = new Map(D.photos.items.map((p) => [p.id, p]));

  // Ikona e klubit pa foto (dekor), sipas kategorisë.
  const ICON = {
    'Sport': 'bi-trophy',
    'Sport mendor': 'bi-puzzle',
    'Muzikë': 'bi-music-note-beamed',
    'Histori': 'bi-hourglass-split',
    'Gjeografi': 'bi-globe-europe-africa',
    'Gjuhë': 'bi-chat-quote',
    'Matematikë': 'bi-calculator',
    'Fizikë': 'bi-lightning-charge',
    'Teknologji': 'bi-cpu',
    'Mjedis': 'bi-tree',
    'Ndërmjetësim': 'bi-people',
  };
  const iconFor = (c) => ICON[c.category] || 'bi-people';

  /* <img> for an exported image (Site.img). Returns '' when the image was not exported. */
  function picture(id, { alt = '', sizes, cls = '', focus = '' } = {}) {
    const im = Site.img(id);
    if (!im) return '';
    const srcset = im.width > 800
      ? `${esc(im.src800)} 800w, ${esc(im.src)} ${im.width}w`
      : `${esc(im.src)} ${im.width}w`;
    const classAttr = cls ? ` class="${esc(cls)}"` : '';
    const style = focus ? ` style="object-position: ${esc(focus)}"` : '';
    return `<img src="${esc(im.src800)}" srcset="${srcset}" sizes="${esc(sizes)}" width="${im.width}" height="${im.height}" alt="${esc(alt)}"${classAttr}${style} loading="lazy" decoding="async">`;
  }

  /* Sfond i turbullt i së njëjtës foto për fotot "contain" (pa shirita bosh). */
  function fillBg(id) {
    const im = Site.img(id);
    return im ? `<img class="fill-bg" src="${esc(im.src800)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
  }

  /* Sporti: kartë me foto (raport 4:3) ose me ikonë; të gjitha kartat kanë të njëjtën lartësi në rresht. */
  function sportCard(c) {
    const im = c.photo ? Site.img(c.photo) : null;
    const info = c.photo ? photoInfo.get(c.photo) : null;
    const contain = info?.fit === 'contain';
    const media = im
      ? `<div class="club-media">${contain ? fillBg(c.photo) : ''}${picture(c.photo, {
        alt: info?.alt || c.title,
        sizes: '(min-width: 992px) 33vw, 50vw',
        cls: contain ? 'is-contain' : '',
        focus: info?.focus,
      })}</div>`
      : `<div class="club-media is-placeholder" aria-hidden="true"><i class="bi ${iconFor(c)}"></i></div>`;
    const line = im ? '' : `<p class="club-cat">${esc(c.group ? `Grupi i ${c.group}` : c.category)}</p>`;
    return `
      <article class="card-soft is-hoverable club-card" id="${esc(c.id)}" data-reveal>
        ${media}
        <div class="card-body"><h3>${esc(c.title)}</h3>${line}</div>
      </article>`;
  }

  /* Klubet e tjera: një rresht kompakt me miniaturë (foto ose ikonë) dhe emrin. */
  function clubRow(c) {
    const im = c.photo ? Site.img(c.photo) : null;
    const info = c.photo ? photoInfo.get(c.photo) : null;
    const thumb = im
      ? `<div class="club-thumb">${picture(c.photo, { alt: '', sizes: '72px', focus: info?.focus })}</div>`
      : `<div class="club-thumb" aria-hidden="true"><i class="bi ${iconFor(c)}"></i></div>`;
    const line = c.group ? `Grupi i ${c.group}` : c.category;
    return `
      <li data-reveal>
        <article class="card-soft is-hoverable club-row" id="${esc(c.id)}">
          ${thumb}
          <div class="club-row-body"><h3>${esc(c.title)}</h3><p class="club-cat">${esc(line)}</p></div>
        </article>
      </li>`;
  }

  const sport = D.clubs.filter((c) => c.category === 'Sport');
  const others = D.clubs.filter((c) => c.category !== 'Sport');

  const sportRoot = document.getElementById('club-sport');
  if (sportRoot) {
    sportRoot.innerHTML = sport.map(sportCard).join('');
    Site.reveal(sportRoot);
  }

  const otherRoot = document.getElementById('club-other');
  if (otherRoot) {
    otherRoot.innerHTML = others.map(clubRow).join('');
    Site.reveal(otherRoot);
  }
})();
