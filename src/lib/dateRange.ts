export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'twoDays'
  | 'threeDays'
  | 'fourDays'
  | 'fiveDays'
  | 'sixDays'
  | 'week'
  | 'month'
  | 'custom';

export interface DateRange {
  from: string; // ISO date (incluse)
  to: string; // ISO date (incluse)
}

/** Nombre de jours couverts par chaque filtre "N derniers jours" (aujourd'hui inclus). */
const N_DAY_PRESET_SPAN: Partial<Record<RangePreset, number>> = {
  today: 1,
  twoDays: 2,
  threeDays: 3,
  fourDays: 4,
  fiveDays: 5,
  sixDays: 6,
};

/** Span en jours si `preset` est un filtre "N derniers jours" (Aujourd'hui à 6 Jours), sinon null. */
export function nDayPresetSpan(preset: RangePreset): number | null {
  return N_DAY_PRESET_SPAN[preset] ?? null;
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
  const span = nDayPresetSpan(preset);
  if (span !== null) {
    const from = new Date(now);
    from.setDate(now.getDate() - (span - 1));
    return { from: toISO(from), to };
  }
  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const iso = toISO(yesterday);
    return { from: iso, to: iso };
  }
  if (preset === 'week') return { from: toISO(startOfWeek(now)), to };
  return { from: toISO(startOfMonth(now)), to };
}

/**
 * Même plage décalée d'un jour en arrière : pour "Aujourd'hui" -> hier ;
 * pour "2 Jours" (hier+aujourd'hui) -> avant-hier+hier. Sert de comparaison
 * pour les flèches de progression du classement.
 */
function shiftISODateBackOneDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return toISO(date);
}

export function shiftRangeBackOneDay(range: DateRange): DateRange {
  return { from: shiftISODateBackOneDay(range.from), to: shiftISODateBackOneDay(range.to) };
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  twoDays: '2 Jours',
  threeDays: '3 Jours',
  fourDays: '4 Jours',
  fiveDays: '5 Jours',
  sixDays: '6 Jours',
  week: 'Cette semaine',
  month: 'Ce mois-ci',
  custom: 'Personnalisée',
};
