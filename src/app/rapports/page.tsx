import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { rangeForPreset } from '@/lib/dateRange';
import { fetchPeriodReport } from '@/lib/report';
import { ReportView } from '@/components/ReportView';

export default async function RapportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (myProfile?.role !== 'admin') redirect('/login');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'employee')
    .order('display_name');

  const initialRange = rangeForPreset('month');
  const initialReport = await fetchPeriodReport(supabase, initialRange);

  return <ReportView profiles={profiles ?? []} initialPreset="month" initialReport={initialReport} />;
}
