'use client';

import { PRESET_LABELS, type RangePreset } from '@/lib/dateRange';

export function DateRangeFilter({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomChange,
}: {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  return (
    <div className="filter-field">
      <label>Période</label>
      <div className="preset-group">
        {(['today', 'week', 'month', 'custom'] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`preset-btn ${preset === p ? 'active' : ''}`}
            onClick={() => onPresetChange(p)}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="date" value={customFrom} max={customTo} onChange={(e) => onCustomChange(e.target.value, customTo)} />
          <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={customTo} min={customFrom} onChange={(e) => onCustomChange(customFrom, e.target.value)} />
        </div>
      )}
    </div>
  );
}
