export type RangePreset = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  from: string; // ISO date (incluse)
  to: string; // ISO date (incluse)
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISO(new Date());
}

/** Semaine ISO (lundi -> aujourd'hui). */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  return start;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function rangeForPreset(preset: Exclude<RangePreset, 'custom'>, now: Date = new Date()): DateRange {
  const to = toISO(now);
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') return { from: toISO(startOfWeek(now)), to };
  return { from: toISO(startOfMonth(now)), to };
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois-ci',
  custom: 'Personnalisée',
};
