import raw from '../data/timetable-matrix.txt?raw';
import meta from '../data/timetable-meta.json';
import { classId } from './format';
import { staffById } from './data';

export type CellState = 'assigned' | 'empty' | 'unreadable';
export interface Cell {
  state: CellState;
  raw: string;
  classId: string | null;
  conflict: boolean;
  review: string | null;
}
export interface TeacherRow {
  row: number;
  staffId: string;
  name: string;
  subject: string;
  days: Cell[][]; // [day 0..4][period 0..5]
}
export interface ClassEntry { staffId: string; name: string; subject: string; review: string | null }
export interface ClassSlot { entries: ClassEntry[]; conflict: boolean }

export const DAYS = ['E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte'];
export const PERIODS = meta.periodsPerDay;

const rows = raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

export const teachers: TeacherRow[] = rows.map((line) => {
  const [n, staffId, ...days] = line.split('|');
  if (days.length !== 5) throw new Error(`timetable row ${n}: expected 5 days, got ${days.length}`);
  const s = staffById.get(staffId);
  if (!s) throw new Error(`timetable row ${n}: unknown staff id ${staffId}`);
  return {
    row: Number(n),
    staffId,
    name: s.displayName,
    subject: s.subjects[0] ?? '',
    days: days.map((d, di) => {
      const cols = d.trim().split(/\s+/);
      if (cols.length !== PERIODS) throw new Error(`timetable row ${n} day ${di + 1}: expected ${PERIODS} cells, got ${cols.length}`);
      return cols.map((c, pi): Cell => {
        const flag = meta.flaggedCells.find((f) => f.staffId === staffId && f.day === di + 1 && f.period === pi + 1);
        if (c === '_') return { state: 'empty', raw: '', classId: null, conflict: false, review: null };
        if (c === '?') return { state: 'unreadable', raw: '?', classId: null, conflict: false, review: flag?.reason ?? null };
        return { state: 'assigned', raw: c, classId: classId(c), conflict: false, review: flag?.reason ?? null };
      });
    }),
  };
});

/** Class → day → period → slot */
export const classGrids = new Map<string, ClassSlot[][]>();
for (const t of teachers) {
  t.days.forEach((periods, di) =>
    periods.forEach((cell, pi) => {
      if (cell.state !== 'assigned' || !cell.classId) return;
      let grid = classGrids.get(cell.classId);
      if (!grid) {
        grid = Array.from({ length: 5 }, () => Array.from({ length: PERIODS }, () => ({ entries: [], conflict: false })));
        classGrids.set(cell.classId, grid);
      }
      grid[di][pi].entries.push({ staffId: t.staffId, name: t.name, subject: t.subject, review: cell.review });
    }),
  );
}

export interface Conflict { classId: string; day: number; period: number; teachers: string[] }
export const conflicts: Conflict[] = [];
for (const [cid, grid] of classGrids) {
  grid.forEach((day, di) =>
    day.forEach((slot, pi) => {
      if (slot.entries.length > 1) {
        slot.conflict = true;
        conflicts.push({ classId: cid, day: di, period: pi, teachers: slot.entries.map((e) => e.name) });
        for (const t of teachers.filter((t) => slot.entries.some((e) => e.staffId === t.staffId))) t.days[di][pi].conflict = true;
      }
    }),
  );
}

/** Class slots with no teacher entry at all. */
export interface Gap { classId: string; day: number; period: number }
export const gaps: Gap[] = [];
for (const [cid, grid] of classGrids) {
  grid.forEach((day, di) => day.forEach((slot, pi) => { if (slot.entries.length === 0) gaps.push({ classId: cid, day: di, period: pi }); }));
}

const order = (id: string) => {
  const [r, s] = id.split('-');
  const rank = ['VI', 'VII', 'VIII', 'IX'].indexOf(r);
  return rank * 10 + Number(s);
};
export const classIds = [...classGrids.keys()].sort((a, b) => order(a) - order(b));
export const timetableMeta = meta;
