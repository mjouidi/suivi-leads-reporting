import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeRankMovement, explicationTargetForPreset, fetchPeriodReport } from '@/lib/report';
import { buildPdfReport } from '@/lib/export/pdf';
import { nDayPresetSpan, shiftRangeBackOneDay, type RangePreset } from '@/lib/dateRange';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { from, to, personIds, preset } = (await request.json()) as {
    from: string;
    to: string;
    personIds: string[] | null;
    preset?: RangePreset;
  };
  if (!from || !to) return NextResponse.json({ error: 'invalid range' }, { status: 400 });

  // Objectif selon le filtre de période (voir ReportView côté web pour la même règle).
  const explicationTarget = explicationTargetForPreset(preset ?? 'month');

  const report = await fetchPeriodReport(supabase, { from, to }, personIds ?? undefined);

  // Flèches de progression : uniquement pour les filtres "N derniers jours"
  // (Aujourd'hui à 6 Jours), comparées à la même plage décalée d'un jour en arrière
  // (voir ReportView côté web).
  let movement: ReturnType<typeof computeRankMovement> = {};
  if (preset && nDayPresetSpan(preset) !== null) {
    const comparisonRange = shiftRangeBackOneDay({ from, to });
    const comparison = await fetchPeriodReport(supabase, comparisonRange, personIds ?? undefined);
    movement = computeRankMovement(report.people, comparison.people);
  }

  const buffer = await buildPdfReport(report, explicationTarget, movement);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-performance_${from}_${to}.pdf"`,
    },
  });
}
