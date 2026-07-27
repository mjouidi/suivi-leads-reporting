import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, DailyEntry, Profile, TaskEntry } from '@/lib/database.types';
import type { DateRange } from '@/lib/dateRange';

export interface PersonPeriodReport {
  personId: string;
  name: string;
  leadsTotal: number;
  closingSeconds: number;
  explicationParMsg: number;
  explicationParAppel: number;
  remark: string;
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

  return {
    personId: profile.id,
    name: profile.display_name,
    leadsTotal,
    closingSeconds: dailyEntries.reduce((sum, d) => sum + d.closing_accumulated, 0),
    explicationParMsg,
    explicationParAppel,
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
