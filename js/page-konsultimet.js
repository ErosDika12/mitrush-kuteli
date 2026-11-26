/* Konsultimet me prindër (konsultimet.html). The explorer itself is shared code in app.js. */
(function () {
  'use strict';

  const Site = window.Site;
  if (!Site || !Site.data) { console.error('js/app.js did not load'); return; }

  const yearEl = Site.$('#c-year');
  if (yearEl && Site.school.currentSchoolYear) yearEl.textContent = Site.school.currentSchoolYear;

  Site.initConsultationExplorer(document.getElementById('consult-root'));

  const printBtn = Site.$('#c-print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  // The original timetable image, taken from the exported documents list.
  const docLink = Site.$('#c-doc');
  if (docLink) {
    const doc = Site.documents.find((d) => String(d.file || '').includes('orari-i-konsultimeve'));
    if (doc) {
      docLink.href = doc.file;
    } else {
      docLink.remove();
      console.warn('Consultation timetable document is not in the published documents list.');
    }
  }
})();
