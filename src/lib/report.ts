import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DailyEntry, Profile, TaskEntry } from '@/lib/database.types';
import { nDayPresetSpan, type DateRange, type RangePreset } from '@/lib/dateRange';
import { ALL_TASK_KEYS, taskLabel, type TaskKey } from '@/lib/tasks';

export interface PersonPeriodReport {
  personId: string;
  name: string;
  leadsTotal: number;
  idleSeconds: number;
  closingSeconds: number;
  explicationParMsg: number;
  explicationParAppel: number;
  explicationCount: number;
  remark: string;
}

/** Vert dès l'objectif atteint, orange juste en dessous, rouge en dessous de ça. */
export function explicationTierForTarget(count: number, target: number): 'success' | 'warning' | 'danger' {
  return count >= target ? 'success' : count === target - 1 ? 'warning' : 'danger';
}

/** Objectif par défaut de 4 explications par période (utilisé par la page web et l'export Excel). */
export function explicationTier(count: number): 'success' | 'warning' | 'danger' {
  return explicationTierForTarget(count, 4);
}

/**
 * Objectif d'explications selon le filtre de période : 2/jour de plage couverte
 * (Aujourd'hui = 2, 2 Jours = 4, ..., 6 Jours = 12) ; 4 par défaut pour les
 * périodes où ce rythme quotidien n'a plus de sens direct (semaine/mois/hier/personnalisée).
 */
export function explicationTargetForPreset(preset: RangePreset): number {
  const span = nDayPresetSpan(preset);
  return span !== null ? span * 2 : 4;
}

/**
 * Classement : nbre d'explication d'abord, puis explication par appel, puis
 * leads traités, puis temps de closing (chaque critère départage l'égalité du précédent).
 */
export function sortByRanking(people: PersonPeriodReport[]): PersonPeriodReport[] {
  return [...people].sort(
    (a, b) =>
      b.explicationCount - a.explicationCount ||
      b.explicationParAppel - a.explicationParAppel ||
      b.leadsTotal - a.leadsTotal ||
      b.closingSeconds - a.closingSeconds
  );
}

/** Position (0 = premier) de chaque personne dans le classement, pour comparer deux périodes. */
export function rankIndexMap(people: PersonPeriodReport[]): Map<string, number> {
  return new Map(sortByRanking(people).map((p, i) => [p.personId, i]));
}

export type RankMovement = 'up' | 'down';

/**
 * Compare le classement actuel à celui de la période précédente : "up" si la
 * personne a gagné des places (index plus petit), "down" si elle en a perdu.
 * Absente si la personne n'apparaît pas dans les deux classements (rien à comparer).
 */
export function computeRankMovement(
  current: PersonPeriodReport[],
  previous: PersonPeriodReport[]
): Record<string, RankMovement> {
  const currentRank = rankIndexMap(current);
  const previousRank = rankIndexMap(previous);
  const movement: Record<string, RankMovement> = {};
  for (const [personId, rank] of currentRank) {
    const prevRank = previousRank.get(personId);
    if (prevRank === undefined || prevRank === rank) continue;
    movement[personId] = rank < prevRank ? 'up' : 'down';
  }
  return movement;
}

export interface PeriodReport {
  range: DateRange;
  people: PersonPeriodReport[];
}

/**
 * Agrège les lignes déjà enregistrées (accumulated/count) sur la période, sans
 * tenir compte d'un chrono en cours (running) : un rapport historique reflète
 * le temps déjà "posé", pas la seconde en cours d'une tâche active aujourd'hui.
 */
function buildPersonReport(profile: Profile, dailyEntries: DailyEntry[], taskEntries: TaskEntry[]): PersonPeriodReport {
  const leadsTotal = taskEntries.reduce((sum, t) => sum + (t.count ?? 0), 0);

  const explicationRows = taskEntries.filter((t) => t.task_key === 'explication');
  const explicationParMsg = explicationRows.reduce((sum, t) => sum + (t.explication_par_msg ?? 0), 0);
  const explicationParAppel = explicationRows.reduce((sum, t) => sum + (t.explication_par_appel ?? 0), 0);
  const explicationCount = explicationParMsg + explicationParAppel;

  return {
    personId: profile.id,
    name: profile.display_name,
    leadsTotal,
    idleSeconds: dailyEntries.reduce((sum, d) => sum + d.idle_accumulated, 0),
    closingSeconds: dailyEntries.reduce((sum, d) => sum + d.closing_accumulated, 0),
    explicationParMsg,
    explicationParAppel,
    explicationCount,
    remark: profile.remark,
  };
}

export function buildPeriodReport(
  range: DateRange,
  profiles: Profile[],
  dailyEntries: DailyEntry[],
  taskEntries: TaskEntry[]
): PeriodReport {
  const people = profiles.map((p) =>
    buildPersonReport(
      p,
      dailyEntries.filter((d) => d.person_id === p.id),
      taskEntries.filter((t) => t.person_id === p.id)
    )
  );
  return { range, people };
}

export interface TaskBreakdownRow {
  taskKey: TaskKey;
  label: string;
  leadsCount: number;
  elapsedSeconds: number;
}

/** Détail par tâche (New, NRs, ...) pour un seul Sales sur une période, tâches sans activité incluses à 0. */
export function buildTaskBreakdown(taskEntries: TaskEntry[]): TaskBreakdownRow[] {
  const byKey = new Map<TaskKey, { count: number; accumulated: number }>();
  for (const t of taskEntries) {
    const cur = byKey.get(t.task_key) ?? { count: 0, accumulated: 0 };
    // La tâche "explication" ne remplit pas la colonne générique `count` : ses leads
    // traités sont répartis dans explication_par_msg / explication_par_appel (voir
    // buildPersonReport plus haut, même logique).
    cur.count += t.task_key === 'explication' ? (t.explication_par_msg ?? 0) + (t.explication_par_appel ?? 0) : (t.count ?? 0);
    cur.accumulated += t.accumulated ?? 0;
    byKey.set(t.task_key, cur);
  }
  return ALL_TASK_KEYS.map((key) => ({
    taskKey: key,
    label: taskLabel(key),
    leadsCount: byKey.get(key)?.count ?? 0,
    elapsedSeconds: byKey.get(key)?.accumulated ?? 0,
  }));
}

export async function fetchTaskBreakdown(
  supabase: SupabaseClient<Database>,
  range: DateRange,
  personId: string
): Promise<TaskBreakdownRow[]> {
  const { data, error } = await supabase
    .from('task_entries')
    .select('*')
    .eq('person_id', personId)
    .gte('date', range.from)
    .lte('date', range.to);
  if (error) throw error;
  return buildTaskBreakdown(data ?? []);
}

export interface PersonTimeTotals {
  idleSeconds: number;
  closingSeconds: number;
}

export async function fetchPersonTimeTotals(
  supabase: SupabaseClient<Database>,
  range: DateRange,
  personId: string
): Promise<PersonTimeTotals> {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('person_id', personId)
    .gte('date', range.from)
    .lte('date', range.to);
  if (error) throw error;
  const rows = data ?? [];
  return {
    idleSeconds: rows.reduce((sum, d) => sum + d.idle_accumulated, 0),
    closingSeconds: rows.reduce((sum, d) => sum + d.closing_accumulated, 0),
  };
}

export async function fetchPeriodReport(
  supabase: SupabaseClient<Database>,
  range: DateRange,
  personIds?: string[]
): Promise<PeriodReport> {
  let profilesQuery = supabase.from('profiles').select('*').eq('role', 'employee').order('display_name');
  if (personIds?.length) profilesQuery = profilesQuery.in('id', personIds);

  let dailyQuery = supabase.from('daily_entries').select('*').gte('date', range.from).lte('date', range.to);
  let taskQuery = supabase.from('task_entries').select('*').gte('date', range.from).lte('date', range.to);
  if (personIds?.length) {
    dailyQuery = dailyQuery.in('person_id', personIds);
    taskQuery = taskQuery.in('person_id', personIds);
  }

  const [{ data: profiles, error: profilesError }, { data: dailyEntries, error: dailyError }, { data: taskEntries, error: taskError }] =
    await Promise.all([profilesQuery, dailyQuery, taskQuery]);

  if (profilesError) throw profilesError;
  if (dailyError) throw dailyError;
  if (taskError) throw taskError;

  return buildPeriodReport(range, profiles ?? [], dailyEntries ?? [], taskEntries ?? []);
}
