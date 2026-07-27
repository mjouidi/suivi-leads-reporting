import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchPeriodReport } from '@/lib/report';
import { buildExcelReport } from '@/lib/export/excel';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { from, to, personIds } = (await request.json()) as { from: string; to: string; personIds: string[] | null };
  if (!from || !to) return NextResponse.json({ error: 'invalid range' }, { status: 400 });

  const report = await fetchPeriodReport(supabase, { from, to }, personIds ?? undefined);
  const buffer = await buildExcelReport(report);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-performance_${from}_${to}.xlsx"`,
    },
  });
}
