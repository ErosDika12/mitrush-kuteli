# Udhëzues për përmbajtjen

Pas çdo ndryshimi ekzekutoni `npm run validate` dhe `npm run build`.

## Shtimi i një lajmi
Krijoni `src/news/emri-i-lajmit.md` (emri i skedarit bëhet adresa `/lajme/emri-i-lajmit`):

```md
---
title: "Titulli"
summary: "Një a dy fjali përmbledhje."
category: "Muzikë"
publishedAt: "2026-12-01"        # data e botimit
eventDate: "2026-11-30"          # opsionale, vetëm kur dihet me siguri (ose eventDates: [d1, d2])
status: "published"              # "draft" = nuk del askund (faqe, kërkim, sitemap)
sourceKind: "Njoftim i shkollës" # ose "Përmbledhje e raportimit"
sources:
  - name: "Emri i burimit"
    url: "https://..."
---
Teksti në Markdown, me fjalët tuaja. Mos kopjoni artikuj të plotë.
```
Mos lidhni foto që nuk e tregojnë vërtet ngjarjen.

## Ndryshimi i vitit shkollor
`src/data/school.json` → `currentSchoolYear`. Pastaj përditësoni `consultations.json` (`schoolYear`), `bells.json`, `timetable-meta.json` dhe `documents.json`. Nëse një orar vjetër nuk vlen më, mos e lini të duket si aktual.

## Orari i konsultimeve
`src/data/consultations.json`. Çdo rresht: `staffId`, `context` (`teaching`, `administration`, `coordination`, `psychology`, `support`), `weekdays` (1=e hënë … 5=e premte), `start`, `end`. Personat shtohen te `staff.json` (një ID, disa role).

## Orari i ziles
`src/data/bells.json` (ndërrimi i parë/dytë dhe parafilloret). Pushimet llogariten automatikisht nga hendeku mes orëve (shfaqen kur ≥ 10 min).

## Zëvendësimi i orarit mësimor
1. Vendosni fotografinë e re në `public/documents/` dhe ndryshoni `file` te `timetable-meta.json` dhe `documents.json`.
2. Ridrejtoni `src/data/timetable-matrix.txt`: një rresht për mësimdhënës: `rreshti|staffId|dita1|dita2|dita3|dita4|dita5`, çdo ditë me 6 qeliza të ndara me hapësirë. Klasa shkruhet `7.2`; `_` = bosh; `?` = e palexueshme (mos e plotësoni me hamendje).
3. `npm run validate` raporton gabimet e formës dhe dyfishimet. Dyfishimet dhe orët pa mësimdhënës shfaqen vetë te “Çfarë është e pasigurt…”.
4. Kur shkolla e konfirmon, ndryshoni `status` te `timetable-meta.json` dhe tekstin e paralajmërimit.

## Shtimi i një dokumenti
Vendoseni skedarin te `public/documents/` dhe shtoni një objekt te `src/data/documents.json` (titull, titull origjinal, kategori, vit, format të vërtetë: PNG nuk shënohet PDF). Për burim të jashtëm vendosni `"external": true`. `"status": "draft"` e fsheh.

## Fotot dhe galeria
Vendosni JPG te `src/assets/photos/emri.jpg`, shtoni hyrje te `src/data/photos.json` (`id` = emri pa `.jpg`, `alt` përshkrues, `caption`, `album`). Optimizimi (AVIF/WebP, madhësi të shumëfishta, heqja e EXIF) bëhet gjatë ndërtimit. Mos vendosni emra nxënësish në titra.

## Korrigjimi i portretit të stafit
Portretet janë **të çaktivizuara** si parazgjedhje. Për të aktivizuar një portret: kopjojeni foton te `src/assets/photos/`, vendosni `approved: true` te `portrait` në `staff.json` dhe shtoni shfaqjen e foto-s te `StaffEntry.astro` (aktualisht shfaq inicialet). Bëjeni vetëm pasi personi/shkolla ta miratojë. Sebahat Gashi nuk ka portret të dhënë dhe shfaq inicialet.

## Aktivitetet dhe klubet
`src/data/activities.json`. Shtoni klub vetëm kur është konfirmuar se funksionon.

## Banderola sezonale
`school.json` → `seasonalBanner` (`from`, `to`). Shfaqet vetëm brenda kësaj periudhe, sipas orës së Kosovës.
