/* 28 Nentori: checks the four-question quiz. Options and answers are in the markup (data-answer = index of the right option). */
(function () {
  'use strict';
  const form = document.getElementById('quiz');
  const score = document.getElementById('quiz-score');
  if (!form || !score) return;
  const sets = Array.from(form.querySelectorAll('.quiz-q'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = 0;
    let answered = 0;
    for (const fs of sets) {
      const picked = fs.querySelector('input:checked');
      const fb = fs.querySelector('.quiz-fb');
      const answerIndex = Number(fs.dataset.answer);
      fb.hidden = false;
      if (!picked) {
        fb.textContent = 'Nuk keni zgjedhur përgjigje.';
        fb.className = 'quiz-fb no';
        continue;
      }
      answered++;
      const right = Number(picked.value) === answerIndex;
      if (right) ok++;
      const correct = fs.querySelectorAll('.quiz-option span')[answerIndex].textContent.trim();
      fb.textContent = right ? 'Saktë.' : `Jo e saktë. Përgjigjja e duhur: ${correct}.`;
      fb.className = 'quiz-fb ' + (right ? 'ok' : 'no');
    }
    score.textContent = `Keni ${ok} përgjigje të sakta nga ${sets.length}${answered < sets.length ? ` (${sets.length - answered} pa përgjigje)` : ''}.`;
  });

  form.addEventListener('reset', () => {
    score.textContent = '';
    sets.forEach((fs) => {
      const fb = fs.querySelector('.quiz-fb');
      fb.hidden = true;
      fb.textContent = '';
      fb.className = 'quiz-fb';
    });
  });
})();
