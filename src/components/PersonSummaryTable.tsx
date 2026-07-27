'use client';

import { useRef, useState } from 'react';
import type { PersonPeriodReport } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';

async function saveRemark(personId: string, remark: string) {
  await fetch('/api/profiles/remark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, remark }),
  });
}

// `initialRemark` ne change plus une fois monté (les remarques ne sont pas
// re-fetchées quand la période change) : un simple état local suffit, keyé
// par personId côté appelant pour repartir d'une valeur fraîche par carte.
function RemarkField({ personId, initialRemark }: { personId: string; initialRemark: string }) {
  const [value, setValue] = useState(initialRemark);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => saveRemark(personId, next), 500);
  }

  return (
    <textarea
      className="remark-input"
      placeholder="Remarque…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
    />
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`person-summary-stat ${highlight ? 'is-highlight' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function PersonSummaryTable({
  people,
  remarks,
}: {
  people: PersonPeriodReport[];
  remarks: Record<string, string>;
}) {
  const sorted = [...people].sort((a, b) => b.leadsTotal - a.leadsTotal);
  const topId = sorted.find((p) => p.leadsTotal > 0)?.personId ?? null;

  const totals = people.reduce(
    (acc, p) => ({
      leadsTotal: acc.leadsTotal + p.leadsTotal,
      closingSeconds: acc.closingSeconds + p.closingSeconds,
      explicationParMsg: acc.explicationParMsg + p.explicationParMsg,
      explicationParAppel: acc.explicationParAppel + p.explicationParAppel,
    }),
    { leadsTotal: 0, closingSeconds: 0, explicationParMsg: 0, explicationParAppel: 0 }
  );

  if (people.length === 0) {
    return <p className="loading-note">Aucun employé pour cette sélection.</p>;
  }

  return (
    <div className="person-summary-grid">
      {sorted.map((p) => (
        <div key={p.personId} className={`person-summary-card ${p.personId === topId ? 'is-top' : ''}`}>
          <div className="person-summary-head">
            <span className="avatar">{p.name[0]}</span>
            <span className="person-summary-name">{p.name}</span>
            {p.personId === topId && <i className="ti ti-trophy rank-1" aria-hidden="true" title="Meilleur score de la période" />}
          </div>
          <div className="person-summary-stats">
            <StatRow label="Explication / Msg" value={p.explicationParMsg} />
            <StatRow label="Explication / Appel" value={p.explicationParAppel} />
            <StatRow label="Temps de closing" value={fmtHHMMSS(p.closingSeconds)} />
            <StatRow label="Leads traités" value={p.leadsTotal} highlight />
          </div>
          <div className="person-summary-remark">
            <label>Remarque</label>
            <RemarkField personId={p.personId} initialRemark={remarks[p.personId] ?? ''} />
          </div>
        </div>
      ))}

      <div className="person-summary-card is-totals">
        <div className="person-summary-head">
          <span className="person-summary-name">Total équipe</span>
        </div>
        <div className="person-summary-stats">
          <StatRow label="Explication / Msg" value={totals.explicationParMsg} />
          <StatRow label="Explication / Appel" value={totals.explicationParAppel} />
          <StatRow label="Temps de closing" value={fmtHHMMSS(totals.closingSeconds)} />
          <StatRow label="Leads traités" value={totals.leadsTotal} highlight />
        </div>
      </div>
    </div>
  );
}
