'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { rangeForPreset } from '@/lib/dateRange';
import { fetchTaskBreakdown, type TaskBreakdownRow } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';
import type { Profile } from '@/lib/database.types';

type DetailPreset = 'today' | 'twoDays' | 'threeDays';

const DETAIL_PRESETS: { key: DetailPreset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'twoDays', label: '2 Jours' },
  { key: 'threeDays', label: '3 Jours' },
];

export function PersonTaskDetail({ profiles }: { profiles: Profile[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(profiles[0]?.id ?? null);
  const [preset, setPreset] = useState<DetailPreset>('today');
  const [rows, setRows] = useState<TaskBreakdownRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      try {
        const next = await fetchTaskBreakdown(supabase, rangeForPreset(preset), selectedId!);
        if (cancelled) return;
        setRows(next);
        setError(null);
      } catch {
        if (!cancelled) setError('Impossible de charger le détail. Réessayez.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId, preset]);

  if (profiles.length === 0) return null;

  // Tâches réellement traitées en tête, triées par temps écoulé décroissant.
  const sortedRows = [...rows].sort((a, b) => b.elapsedSeconds - a.elapsedSeconds);

  const totals = rows.reduce(
    (acc, r) => ({ leadsCount: acc.leadsCount + r.leadsCount, elapsedSeconds: acc.elapsedSeconds + r.elapsedSeconds }),
    { leadsCount: 0, elapsedSeconds: 0 }
  );

  return (
    <div className="panel">
      <h3 className="step-title" style={{ marginTop: 0 }}>
        Détail par tâche — par Sales
      </h3>

      <div className="filter-field" style={{ marginBottom: 14 }}>
        <label>Sales</label>
        <div className="preset-group">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`preset-btn ${selectedId === p.id ? 'active' : ''}`}
              onClick={() => setSelectedId(p.id)}
            >
              {p.display_name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-field" style={{ marginBottom: 14 }}>
        <label>Période</label>
        <div className="preset-group">
          {DETAIL_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`preset-btn ${preset === p.key ? 'active' : ''}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-note">Chargement…</p>}

      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Tâche</th>
              <th className="num">Leads traités</th>
              <th className="num">Temps écoulé</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, i) => {
              const treated = r.elapsedSeconds > 0 || r.leadsCount > 0;
              return (
                <tr key={r.taskKey} className={i % 2 === 1 ? 'is-stripe' : ''}>
                  <td className="detail-task-cell">
                    {treated && (
                      <span className="detail-task-star" aria-hidden>
                        ★
                      </span>
                    )}
                    {r.label}
                  </td>
                  <td className="num">{r.leadsCount}</td>
                  <td className="num">{fmtHHMMSS(r.elapsedSeconds)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="detail-totals-row">
              <td>Total</td>
              <td className="num">{totals.leadsCount}</td>
              <td className="num">{fmtHHMMSS(totals.elapsedSeconds)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
