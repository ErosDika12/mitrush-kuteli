/* Jeta shkollore: renders the activity rows and the clubs photo band from js/data.js. */
(function () {
  'use strict';
  const Site = window.Site;
  if (!Site) return;
  const D = Site.data;
  const esc = Site.esc;
  const photoInfo = new Map(D.photos.items.map((p) => [p.id, p]));

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

  /* One activity: photos on one side, kind / title / text / album link on the other. Odd rows flip. */
  function activityRow(a, i) {
    const figures = a.photos.map((pid) => {
      const im = Site.img(pid);
      if (!im) return '';
      const info = photoInfo.get(pid);
      const caption = info?.caption ?? '';
      const wide = im.width / im.height > 1.7;
      const img = picture(pid, {
        alt: info?.alt || caption || a.title,
        sizes: '(min-width: 992px) 540px, 100vw',
        focus: info?.focus,
      });
      return `<figure${wide ? ' class="wide"' : ''}>${img}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
    }).join('');
    return `
      <article class="activity-row${i % 2 === 1 ? ' is-flip' : ''}" id="${esc(a.id)}" data-reveal>
        <div class="activity-media">${figures}</div>
        <div class="activity-text">
          <span class="eyebrow">${esc(a.kind)}</span>
          <h2>${esc(a.title)}</h2>
          <p class="lead">${esc(a.text)}</p>
          <a class="link-arrow" href="${esc(Site.link('/galeria#' + a.id))}">Shih albumin</a>
        </div>
      </article>`;
  }

  /* One tile of the clubs photo band: a link to the sport section of klubet.html. */
  function bandTile(id) {
    const info = photoInfo.get(id);
    const contain = info?.fit === 'contain';
    const im = Site.img(id);
    const img = picture(id, {
      alt: '',
      sizes: '(min-width: 992px) 270px, 50vw',
      cls: contain ? 'is-contain' : '',
    });
    if (!img) return '';
    // Foto "contain": sfond i turbullt i së njëjtës foto në vend të shiritave bosh.
    const fill = contain && im ? `<img class="fill-bg" src="${esc(im.src800)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
    return `<a class="gallery-tile" href="klubet.html#sport">${fill}${img}<span class="cap">${esc(info?.caption ?? '')}</span></a>`;
  }

  const rows = document.getElementById('activities');
  if (rows) {
    rows.innerHTML = D.activities.map((a, i) => activityRow(a, i)).join('');
    Site.reveal(rows);
  }

  const band = document.getElementById('club-band');
  if (band) band.innerHTML = ['basketboll-djemte', 'futboll-djemte'].map(bandTile).join('');
})();
