/* Privatesia: fills the school e-mail and telephone links from js/data.js (the text itself is static). */
(function () {
  'use strict';
  const Site = window.Site;
  if (!Site) return;
  const S = Site.school;
  document.querySelectorAll('[data-school-email]').forEach((a) => {
    a.href = 'mailto:' + S.email;
    a.textContent = S.email;
  });
  document.querySelectorAll('[data-school-tel]').forEach((a) => {
    a.href = 'tel:' + S.telephoneE164;
    a.textContent = S.telephoneDisplay;
  });
})();
