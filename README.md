# SHFMU “Mitrush Kuteli” — faqja e shkollës

Faqe statike në Albanian (`lang="sq"`), e ndërtuar me **Astro 5 + TypeScript**. Përmbajtja ruhet në skedarë të thjeshtë (JSON, Markdown, TXT), pa bazë të dhënash dhe pa panel admini.

## Komandat

```bash
npm install          # instalon varësitë
npm run dev          # server zhvillimi, http://localhost:4321
npm run build        # ndërton faqen në dist/
npm run preview      # shërben dist/ lokalisht
npm run check        # kontroll tipesh (astro check)
npm run validate     # kontroll i përmbajtjes (staf, orare, foto, dokumente)
npm test             # kontrolle në shfletues (Playwright); kërkon `npm run preview` në port 4331
npm run a11y         # skanim axe-core; po ashtu kërkon preview
```

Për testet: `npx astro preview --port 4331` në një terminal, pastaj `npm test` në tjetrin (`npx playwright install chromium` herën e parë).

> **Shënim për Windows me “Application Control”:** nëse `astro build` dështon me “Application Control policy has blocked this file … rollup.win32-x64-msvc.node”, projekti përdor tashmë `rollup` si `@rollup/wasm-node` (te `devDependencies`), që nuk kërkon skedar vendas. Astro 7 nuk përdoret sepse përpunuesi i tij Markdown është skedar vendas i bllokuar.

## Struktura

```
src/
  data/        school.json, staff.json, consultations.json, bells.json, timetable-matrix.txt,
               timetable-meta.json, documents.json, photos.json, activities.json, history.json, faq.json
  news/        një skedar .md për çdo lajm
  assets/photos/   fotot publike (optimizohen automatikisht në AVIF/WebP/JPEG)
  pages/       faqet (ruta = emri i skedarit)
  components/  Header, Footer, Photo, StaffEntry, ConsultationTable, ArticleCard, ...
  lib/         ngarkimi i të dhënave, orari, formatimi i datave, kërkimi pa diakritikë
  scripts/     helper i URL-së për filtrat
public/documents/   dokumentet e shkarkueshme (PNG origjinale)
sources/       materiale private: prototipet HTML, shënimet me dorë, portretet e pacaktuara
archive/       arkivat zip origjinale (jo në dalje publike)
scripts/       validate-content, e2e, a11y, shots
```

`sources/` dhe `archive/` **nuk** përfshihen kurrë në `dist/`; vetëm `public/` dhe ato që importohen nga `src/` dalin publikisht.

## Konfigurimi

Kopjoni `.env.example` në `.env`:

- `SITE_URL` — adresa publike e vërtetë (p.sh. `https://shembull.org`), pa `/` në fund. Pa të, nuk shfaqet canonical/og:url.
- `ALLOW_INDEXING=true` — vetëm kur faqja miratohet për publikim. Përndryshe çdo faqe ka `noindex` dhe `robots.txt` ndalon gjithçka.

Viti shkollor ndryshohet te `src/data/school.json` (`currentSchoolYear`) dhe te të dhënat e orareve (shih `CONTENT_GUIDE.md`).

## Publikimi

`npm run build` krijon dosjen `dist/`, e cila mund të ngarkohet në çdo host statik (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Vendosni `SITE_URL` dhe `ALLOW_INDEXING=true` në mjedisin e ndërtimit të produksionit. Ky repozitor nuk e publikon asgjë vetë.

## Dokumente të tjera

- `CONTENT_GUIDE.md` — si shtohen lajme, ndryshohen orare, dokumente, portrete.
- `CONTENT_REVIEW.md` — çfarë duhet konfirmuar nga shkolla.
- `SOURCES.md` — burimet dhe niveli i verifikimit.

## Navigimi dhe fotot (ridizajnim 5 faqesh)
- Pesë lidhje kryesore: Ballina, Shkolla, Stafi, Jeta shkollore, Për prindërit (`src/lib/site.ts`). Nënfaqet janë në `sections` (Lajme, Klubet, Galeria; Orari, Konsultimet, Dokumentet, Njoftimet, Kontakti).
- Portretet: `node scripts/prepare-photos.mjs` krijon `src/assets/staff/*.webp` nga paketa private (`package/`, jo në dalje). `node scripts/merge-staff.mjs` bashkon të dhënat e stafit pa fshirë ID-të.
- Për të lidhur një portret: vendosni `"portrait": {"file": "emri-i-skedarit", "mapping": "…", "approved": true}` te `src/data/staff.json` dhe skedarin te `src/assets/staff/`.
- Kontrolli i daljes: `node scripts/audit-dist.mjs`.
