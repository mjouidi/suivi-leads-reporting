'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  nDayPresetSpan,
  rangeForPreset,
  shiftRangeBackOneDay,
  todayISO,
  type DateRange,
  type RangePreset,
} from '@/lib/dateRange';
import {
  computeRankMovement,
  explicationTargetForPreset,
  fetchPeriodReport,
  type PeriodReport,
  type RankMovement,
} from '@/lib/report';
import type { Profile } from '@/lib/database.types';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { EmployeeFilter } from '@/components/EmployeeFilter';
import { PersonSummaryTable } from '@/components/PersonSummaryTable';
import { PasswordRecoveryModal } from '@/components/PasswordRecoveryModal';

async function downloadExport(path: string, range: DateRange, personIds: string[] | null, preset: RangePreset) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: range.from, to: range.to, personIds, preset }),
  });
  if (!res.ok) throw new Error("Échec de l'export.");
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? 'rapport';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportView({
  profiles,
  initialPreset,
  initialReport,
}: {
  profiles: Profile[];
  initialPreset: RangePreset;
  initialReport: PeriodReport;
}) {
  const [preset, setPreset] = useState<RangePreset>(initialPreset);
  const [customFrom, setCustomFrom] = useState(initialReport.range.from);
  const [customTo, setCustomTo] = useState(todayISO());
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [report, setReport] = useState<PeriodReport>(initialReport);
  const [movement, setMovement] = useState<Record<string, RankMovement>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const remarks = Object.fromEntries(profiles.map((p) => [p.id, p.remark]));

  function currentRange(): DateRange {
    if (preset === 'custom') return { from: customFrom, to: customTo };
    return rangeForPreset(preset);
  }

  async function refresh(nextPreset: RangePreset, nextIds: string[] | null, nextFrom = customFrom, nextTo = customTo) {
    const range = nextPreset === 'custom' ? { from: nextFrom, to: nextTo } : rangeForPreset(nextPreset);
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const next = await fetchPeriodReport(supabase, range, nextIds ?? undefined);
      setReport(next);

      // Flèches de progression : uniquement pour les filtres "N derniers jours"
      // (Aujourd'hui à 6 Jours), comparées à la même plage décalée d'un jour en arrière.
      if (nDayPresetSpan(nextPreset) !== null) {
        const comparisonRange = shiftRangeBackOneDay(range);
        const comparison = await fetchPeriodReport(supabase, comparisonRange, nextIds ?? undefined);
        setMovement(computeRankMovement(next.people, comparison.people));
      } else {
        setMovement({});
      }
    } catch {
      setError('Impossible de charger le rapport. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  function onPresetChange(next: RangePreset) {
    setPreset(next);
    if (next !== 'custom') refresh(next, selectedIds);
  }

  function onCustomChange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    refresh('custom', selectedIds, from, to);
  }

  function onEmployeesChange(ids: string[] | null) {
    setSelectedIds(ids);
    refresh(preset, ids);
  }

  async function onExport(kind: 'excel' | 'pdf') {
    setExporting(kind);
    setError(null);
    try {
      await downloadExport(`/api/export/${kind}`, currentRange(), selectedIds, preset);
    } catch {
      setError("Échec de l'export. Réessayez.");
    } finally {
      setExporting(null);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="wrap">
      <PasswordRecoveryModal />
      <div className="header-card">
        <div className="header-brand">
          <div className="header-logo">
            <img src="/brand/header-logo.png" alt="Dentakay" />
          </div>
          <div>
            <h1>Rapports — Performance par Sales</h1>
            <p className="sub-label">Suivi des leads</p>
          </div>
        </div>
        <button type="button" onClick={signOut} style={{ fontSize: 12, color: 'var(--text-muted)', border: 'none', background: 'none', padding: 0, textDecoration: 'underline' }}>
          Se déconnecter
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <div className="filters-row">
          <DateRangeFilter preset={preset} customFrom={customFrom} customTo={customTo} onPresetChange={onPresetChange} onCustomChange={onCustomChange} />
          <EmployeeFilter profiles={profiles} selectedIds={selectedIds} onChange={onEmployeesChange} />
          <div className="export-row">
            <button type="button" className="btn-export secondary" disabled={exporting !== null} onClick={() => onExport('excel')}>
              {exporting === 'excel' ? 'Export…' : 'Exporter en Excel'}
            </button>
            <button type="button" className="btn-export" disabled={exporting !== null} onClick={() => onExport('pdf')}>
              {exporting === 'pdf' ? 'Export…' : 'Exporter en PDF'}
            </button>
          </div>
        </div>
        {loading && <p className="loading-note">Chargement…</p>}
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <h3 className="step-title" style={{ marginTop: 0 }}>
          Détail par Sales — {report.range.from} → {report.range.to}
        </h3>
        <PersonSummaryTable
          people={report.people}
          remarks={remarks}
          movement={movement}
          explicationTarget={explicationTargetForPreset(preset)}
        />
      </div>
    </div>
  );
}
