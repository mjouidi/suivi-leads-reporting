'use client';

import { useRef, useState } from 'react';
import { explicationTierForTarget, sortByRanking, type PersonPeriodReport, type RankMovement } from '@/lib/report';
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
// par personId côté appelant pour repartir d'une valeur fraîche par ligne.
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
      rows={1}
    />
  );
}

type Tone = 'success' | 'danger' | 'teal';

function Pill({ value, tone, hero }: { value: string | number; tone: Tone; hero?: boolean }) {
  return <span className={`rt-pill tone-${tone} ${hero ? 'is-hero' : ''}`}>{value}</span>;
}

// Flèche dessinée en CSS (bordures) : fiable partout, contrairement à la police d'icônes
// externe (jamais chargée en pratique — cdnjs bloqué/indisponible selon le réseau).
function MovementArrow({ movement }: { movement: RankMovement }) {
  return (
    <span
      className={`rank-movement-arrow rank-movement-${movement}`}
      title={movement === 'up' ? 'Progresse au classement par rapport à hier' : 'Recule au classement par rapport à hier'}
    >
      <span className={`rank-movement-arrow-shape rank-movement-arrow-${movement}`} />
    </span>
  );
}

const TIER_TONE = { success: 'success', warning: 'amber', danger: 'danger' } as const;

// "medal" = pastille ronde numérotée (1/2/3) ; "alert" = pastille "!" — formes CSS pures,
// pas d'icône de police externe.
const RANK_BADGES = [
  { rowClass: 'is-rank-1', accentClass: 'rank-1', medal: '1', label: 'Meilleur score' },
  { rowClass: 'is-rank-2', accentClass: 'rank-2', medal: '2', label: '2e meilleur score' },
  { rowClass: 'is-rank-3', accentClass: 'rank-3', medal: '3', label: '3e meilleur score' },
] as const;

/** Depuis la fin du classement (0 = dernier). N'est affiché que si la personne n'a pas déjà un badge de tête. */
const BOTTOM_BADGES = [
  { rowClass: 'is-bottom-1', accentClass: 'bottom-1', medal: '!', label: "Dernier de l'équipe" },
  { rowClass: 'is-bottom-2', accentClass: 'bottom-2', medal: '!', label: "Avant-dernier de l'équipe" },
  { rowClass: 'is-bottom-3', accentClass: 'bottom-3', medal: '!', label: "Parmi les 3 derniers de l'équipe" },
] as const;

export function PersonSummaryTable({
  people,
  remarks,
  movement,
  explicationTarget = 4,
}: {
  people: PersonPeriodReport[];
  remarks: Record<string, string>;
  movement: Record<string, RankMovement>;
  explicationTarget?: number;
}) {
  const sorted = sortByRanking(people);

  const totals = people.reduce(
    (acc, p) => ({
      leadsTotal: acc.leadsTotal + p.leadsTotal,
      idleSeconds: acc.idleSeconds + p.idleSeconds,
      closingSeconds: acc.closingSeconds + p.closingSeconds,
      explicationParMsg: acc.explicationParMsg + p.explicationParMsg,
      explicationParAppel: acc.explicationParAppel + p.explicationParAppel,
      explicationCount: acc.explicationCount + p.explicationCount,
    }),
    { leadsTotal: 0, idleSeconds: 0, closingSeconds: 0, explicationParMsg: 0, explicationParAppel: 0, explicationCount: 0 }
  );

  if (people.length === 0) {
    return <p className="loading-note">Aucun Sales pour cette sélection.</p>;
  }

  return (
    <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>Sales</th>
            <th className="num">Leads traités</th>
            <th className="num">Temps perdu</th>
            <th className="num">Expl. / Msg</th>
            <th className="num">Expl. / Appel</th>
            <th className="num">Nbre d&apos;expl.</th>
            <th className="num">Closing</th>
            <th>Remarque</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const tier = explicationTierForTarget(p.explicationCount, explicationTarget);
            const explicationTone = TIER_TONE[tier];
            const topBadge = RANK_BADGES[i];
            const fromEnd = sorted.length - 1 - i;
            const badge = topBadge ?? BOTTOM_BADGES[fromEnd];
            const moved = movement[p.personId];
            return (
                <tr key={p.personId} className={`ranking-row ${i % 2 === 1 ? 'is-stripe' : ''} ${badge ? badge.rowClass : ''}`}>
                  <td className="ranking-name-cell">
                    <div className="ranking-name-row">
                      <span className="ranking-name">{p.name}</span>
                      {moved && <MovementArrow movement={moved} />}
                      {badge && (
                        <span className={`ranking-medal ${badge.accentClass}`} title={badge.label}>
                          {badge.medal}
                        </span>
                      )}
                    </div>
                    {badge && <span className={`ranking-rank-label ${badge.accentClass}`}>{badge.label}</span>}
                  </td>
                  <td className="num">
                    <Pill value={p.leadsTotal} tone="success" hero />
                  </td>
                  <td className="num">
                    <Pill value={fmtHHMMSS(p.idleSeconds)} tone="danger" />
                  </td>
                  <td className={`num tier-cell tone-${explicationTone}`}>{p.explicationParMsg}</td>
                  <td className={`num tier-cell tone-${explicationTone}`}>{p.explicationParAppel}</td>
                  <td className={`num tier-cell tone-${explicationTone}`}>
                    {p.explicationCount} / {explicationTarget}
                  </td>
                  <td className="num">
                    <Pill value={fmtHHMMSS(p.closingSeconds)} tone="teal" />
                  </td>
                  <td className="ranking-remark-cell">
                    <RemarkField personId={p.personId} initialRemark={remarks[p.personId] ?? ''} />
                  </td>
                </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="ranking-totals-row">
            <td>Total équipe</td>
            <td className="num">{totals.leadsTotal}</td>
            <td className="num">{fmtHHMMSS(totals.idleSeconds)}</td>
            <td className="num">{totals.explicationParMsg}</td>
            <td className="num">{totals.explicationParAppel}</td>
            <td className="num">
              {totals.explicationCount} / {people.length * explicationTarget}
            </td>
            <td className="num">{fmtHHMMSS(totals.closingSeconds)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
