'use client';

import type { Profile } from '@/lib/database.types';

export function EmployeeFilter({
  profiles,
  selectedIds,
  onChange,
}: {
  profiles: Profile[];
  selectedIds: string[] | null; // null = tous
  onChange: (ids: string[] | null) => void;
}) {
  const allSelected = selectedIds === null;

  function toggle(id: string) {
    const current = selectedIds ?? profiles.map((p) => p.id);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === profiles.length ? null : next);
  }

  return (
    <div className="filter-field">
      <label>Sales</label>
      <div className="preset-group">
        <button type="button" className={`preset-btn ${allSelected ? 'active' : ''}`} onClick={() => onChange(null)}>
          Tous
        </button>
        {profiles.map((p) => {
          const active = allSelected || (selectedIds?.includes(p.id) ?? false);
          return (
            <button key={p.id} type="button" className={`preset-btn ${active && !allSelected ? 'active' : ''}`} onClick={() => toggle(p.id)}>
              {p.display_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
