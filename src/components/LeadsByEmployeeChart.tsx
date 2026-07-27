'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PersonPeriodReport } from '@/lib/report';

const BAR_COLOR = '#8B6F4E'; // --gold-700, cohérent avec l'accent existant de l'app

export function LeadsByEmployeeChart({ people }: { people: PersonPeriodReport[] }) {
  const data = [...people]
    .sort((a, b) => a.leadsTotal - b.leadsTotal)
    .map((p) => ({ name: p.name, leads: p.leadsTotal }));

  if (data.length === 0) return null;

  return (
    <div className="panel chart-panel">
      <h3 className="step-title" style={{ marginTop: 0 }}>
        Leads traités par employé
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12.5, fill: 'var(--text-primary)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            width={90}
          />
          <Tooltip
            cursor={{ fill: 'var(--gold-50)' }}
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12.5,
            }}
            formatter={(value) => [`${value}`, 'Leads traités']}
          />
          <Bar dataKey="leads" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList dataKey="leads" position="right" style={{ fontSize: 12, fill: 'var(--text-primary)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
