/* =========================================================================
   Timetable model for oraret.html. Port of src/lib/timetable.ts (no DOM here).
   Reads D.timetable.matrix (text) and D.timetable.meta, and uses window.Site
   for classId(). window.Timetable.load() returns the parsed model (cached)
   or throws on malformed input; js/page-oraret.js catches that and shows a
   fallback message instead of the tables.
   ========================================================================= */
(function () {
  'use strict';

  const D = window.SITE_DATA;
  const DAYS = ['E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte'];
  const GRADE_ORDER = ['VI', 'VII', 'VIII', 'IX'];
  let cache = null;

  /** "VII-2" -> sort key: grade order first, then the section number. */
  function sortKey(id) {
    const [grade, section] = String(id).split('-');
    const rank = GRADE_ORDER.indexOf(grade);
    return (rank < 0 ? 100 : rank * 10) + Number(section);
  }

  function build() {
    if (!D || !D.timetable) throw new Error('timetable: SITE_DATA.timetable is missing');
    const Site = window.Site;
    if (!Site || typeof Site.classId !== 'function') throw new Error('timetable: window.Site is missing');

    const meta = D.timetable.meta;
    const PERIODS = Number(meta.periodsPerDay);
    if (!(PERIODS > 0)) throw new Error('timetable: meta.periodsPerDay is not a positive number');
    const flagged = meta.flaggedCells || [];
    const staffById = new Map(D.staff.map((s) => [s.id, s]));

    const lines = String(D.timetable.matrix)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    /* Rows: row | staffId | day 1..5. Each day has PERIODS cells: "_" empty, "?" unreadable, else "7.2". */
    const teachers = lines.map((line) => {
      const [n, staffId, ...days] = line.split('|');
      if (days.length !== DAYS.length) throw new Error(`timetable row ${n}: expected 5 days, got ${days.length}`);
      const s = staffById.get(staffId);
      if (!s) throw new Error(`timetable row ${n}: unknown staff id ${staffId}`);
      return {
        row: Number(n),
        staffId,
        name: s.displayName,
        subject: s.subjects[0] ?? '',
        days: days.map((d, di) => {
          const cols = d.trim().split(/\s+/);
          if (cols.length !== PERIODS) {
            throw new Error(`timetable row ${n} day ${di + 1}: expected ${PERIODS} cells, got ${cols.length}`);
          }
          return cols.map((c, pi) => {
            // meta uses 1-based day and period
            const flag = flagged.find((f) => f.staffId === staffId && f.day === di + 1 && f.period === pi + 1);
            const review = flag ? flag.reason : null;
            if (c === '_') return { state: 'empty', raw: '', classId: null, conflict: false, review: null };
            if (c === '?') return { state: 'unreadable', raw: '?', classId: null, conflict: false, review };
            if (!/^\d\.\d+$/.test(c)) {
              throw new Error(`timetable row ${n} day ${di + 1} period ${pi + 1}: unexpected cell "${c}"`);
            }
            return { state: 'assigned', raw: c, classId: Site.classId(c), conflict: false, review };
          });
        }),
      };
    });

    /* Class -> day -> period -> slot (teacher entries that name this class). */
    const classGrids = new Map();
    for (const t of teachers) {
      t.days.forEach((periods, di) => {
        periods.forEach((cell, pi) => {
          if (cell.state !== 'assigned' || !cell.classId) return;
          let grid = classGrids.get(cell.classId);
          if (!grid) {
            grid = Array.from({ length: DAYS.length }, () =>
              Array.from({ length: PERIODS }, () => ({ entries: [], conflict: false })));
            classGrids.set(cell.classId, grid);
          }
          grid[di][pi].entries.push({ staffId: t.staffId, name: t.name, subject: t.subject, review: cell.review });
        });
      });
    }
    const classIds = [...classGrids.keys()].sort((a, b) => sortKey(a) - sortKey(b));

    /* Conflicts (two teachers in one class slot) and gaps (no teacher in a class slot). */
    const teacherById = new Map(teachers.map((t) => [t.staffId, t]));
    const conflicts = [];
    const gaps = [];
    for (const cid of classIds) {
      classGrids.get(cid).forEach((day, di) => {
        day.forEach((slot, pi) => {
          if (slot.entries.length > 1) {
            slot.conflict = true;
            conflicts.push({ classId: cid, day: di, period: pi, teachers: slot.entries.map((e) => e.name) });
            for (const e of slot.entries) {
              const t = teacherById.get(e.staffId);
              if (t) t.days[di][pi].conflict = true;
            }
          } else if (slot.entries.length === 0) {
            gaps.push({ classId: cid, day: di, period: pi });
          }
        });
      });
    }

    return { DAYS, PERIODS, meta, teachers, classGrids, classIds, conflicts, gaps };
  }

  window.Timetable = {
    DAYS,
    load() {
      if (!cache) cache = build();
      return cache;
    },
  };
})();
