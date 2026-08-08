'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { nDayPresetSpan, rangeForPreset, PRESET_LABELS } from '@/lib/dateRange';
import { fetchTaskBreakdown, type TaskBreakdownRow } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';
import type { Profile } from '@/lib/database.types';

const DETAIL_PRESET_KEYS = ['today', 'twoDays', 'threeDays', 'fourDays', 'fiveDays', 'sixDays'] as const;
type DetailPreset = (typeof DETAIL_PRESET_KEYS)[number];

// Objectifs de référence pour le résumé. "Modules traités" est fixe ;
// "Leads traités" et "Temps écoulé" grimpent par jour couvert par la période choisie
// (leads : 100/jour ; temps : 6h30/jour, soit 13h00 pour 2 Jours, 19h30 pour 3 Jours, etc.).
const MODULE_TARGET = 10;
const LEADS_TARGET_PER_DAY = 100;
const TIME_TARGET_SECONDS_PER_DAY = 6 * 3600 + 30 * 60; // 6h30

function tierForRatio(value: number, target: number): 'success' | 'amber' | 'danger' {
  const ratio = value / target;
  if (ratio >= 1) return 'success';
  if (ratio >= 0.8) return 'amber';
  return 'danger';
}

function pct(value: number, target: number): number {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

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
  const modulesTraites = rows.filter((r) => r.elapsedSeconds > 0 || r.leadsCount > 0).length;
  const span = nDayPresetSpan(preset) ?? 1;
  const leadsTarget = span * LEADS_TARGET_PER_DAY;
  const timeTargetSeconds = span * TIME_TARGET_SECONDS_PER_DAY;

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
          {DETAIL_PRESET_KEYS.map((p) => (
            <button
              key={p}
              type="button"
              className={`preset-btn ${preset === p ? 'active' : ''}`}
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-note">Chargement…</p>}

      <div className="detail-body">
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

        <div className="detail-summary-card">
          <h4 className="detail-summary-title">Résumé</h4>
          <div className={`detail-summary-row tone-${tierForRatio(modulesTraites, MODULE_TARGET)}`}>
            <div className="detail-summary-row-top">
              <span className="detail-summary-label">Modules traités</span>
              <span className="detail-summary-value">
                {modulesTraites} / {MODULE_TARGET}
              </span>
            </div>
            <span className="detail-summary-percent">{pct(modulesTraites, MODULE_TARGET)}%</span>
          </div>
          <div className={`detail-summary-row tone-${tierForRatio(totals.leadsCount, leadsTarget)}`}>
            <div className="detail-summary-row-top">
              <span className="detail-summary-label">Leads traités</span>
              <span className="detail-summary-value">
                {totals.leadsCount} / {leadsTarget}
              </span>
            </div>
            <span className="detail-summary-percent">{pct(totals.leadsCount, leadsTarget)}%</span>
          </div>
          <div className={`detail-summary-row tone-${tierForRatio(totals.elapsedSeconds, timeTargetSeconds)}`}>
            <div className="detail-summary-row-top">
              <span className="detail-summary-label">Temps écoulé</span>
              <span className="detail-summary-value">
                {fmtHHMMSS(totals.elapsedSeconds)} / {fmtHHMMSS(timeTargetSeconds)}
              </span>
            </div>
            <span className="detail-summary-percent">{pct(totals.elapsedSeconds, timeTargetSeconds)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
