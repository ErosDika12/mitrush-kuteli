# Dizajni 3 — Shkollor (Bootstrap 5 + HTML + CSS + JS)

Ky është versioni i ri i faqes, me të njëjtat funksionalitete si versioni Astro në `src/`.
Nuk ka build dhe nuk ka server: skedarët hapen drejtpërdrejt ose shërbehen si statikë.

## Si e ndryshoni përmbajtjen

Përmbajtja vjen nga `src/` (të njëjtat skedarë JSON dhe Markdown si versioni Astro).
Pas çdo ndryshimi në `src/`, ri-gjeneroni të dhënat nga projekti kryesor (në folderin ku ndodhet ky README):

```bash
cd ../mitrush-kuteli
node scripts/export-web-data.mjs ../mitrush-kuteli-html
```

Kjo shkruan `js/data.js` dhe i kopjon fotot dhe dokumentet te `img/` dhe `documents/`.
Mos e redaktoni `js/data.js` me dorë.

## Strukturën

- `index.html`, `stafi.html`, `oraret.html`, `konsultimet.html`, `per-prinder.html`, `dokumente.html`,
  `kontakti.html`, `lajme.html`, `galeria.html`, `aktivitete.html`, `klubet.html`, `kerko.html`,
  `privatesia.html`, `festat-28-nentori.html`, `404.html`
- `css/styles.css` — dizajni i përbashkët (ngjyrat, butonat, kartat, animacionet, tema e errët)
- `css/page-*.css` — rregulla vetëm për një faqe
- `js/app.js` — header, footer, tema, animacionet, kopjimi, kalendari (.ics), komponentët e stafit dhe të konsultimeve
- `js/page-*.js`, `js/timetable.js` — logjika e secilës faqe
- Bootstrap 5.3.3, Bootstrap Icons dhe Google Fonts ngarkohen nga CDN.

## Para publikimit

- Faqet janë `noindex` (robots). Vendosni këtë vetëm kur shkolla e miraton indeksimin.
- Teksti i “Privatësisë” dhe i “28 Nëntorit” ka shënime drafti që shkolla duhet t'i konfirmojë.
- Orari mësimor dhe orari i ziles janë transkriptime; shih `src/data/timetable-meta.json` dhe `bells.json`.

## Testimi lokal

```bash
npx --yes serve .          # ose çdo server statik që shërben këtë folder
```
