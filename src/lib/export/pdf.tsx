import fs from 'fs';
import path from 'path';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import {
  explicationTierForTarget,
  sortByRanking,
  type PersonPeriodReport,
  type PeriodReport,
  type RankMovement,
} from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';

const INK = '#2A2420';
const MUTED = '#6B6157';
const BORDER = '#E7E0D3';
const FOREST = '#153933';
const FOREST_DARK = '#0F2822';
const GOLD_500 = '#B0977C';
const GOLD_300 = '#D9C4A0';
const STRIPE = '#FBF6EC';

const TONES = {
  success: { bg: '#EAF3DE', text: '#3B6D11' },
  danger: { bg: '#FCEBEB', text: '#A32D2D' },
  teal: { bg: '#E3F3F0', text: '#146B5C' },
} as const;

/**
 * Rouge foncé/vif pour bien signaler le retard sur l'objectif ; orange et vert
 * restent des teintes très claires (pas d'alarme quand tout va bien).
 */
const TIER_FILL = {
  success: '#EAF3DE',
  warning: '#FAEEDA',
  danger: '#C0392B',
} as const;
const TIER_TEXT = {
  success: '#3B6D11',
  warning: '#854F0B',
  danger: '#FFFFFF',
} as const;

const RANK_BADGES = [
  { border: '#E6B51A', text: '#A5790A', label: 'Meilleur score' },
  { border: '#9AA3AE', text: '#6E7680', label: '2e meilleur score' },
  { border: '#B8733A', text: '#954E1C', label: '3e meilleur score' },
] as const;

/** Depuis la fin du classement (0 = dernier). N'est affiché que si la personne n'a pas déjà un badge de tête. */
const BOTTOM_BADGES = [
  { border: '#A32D2D', text: '#A32D2D', label: "Dernier de l'équipe" },
  { border: '#C0392B', text: '#C0392B', label: 'Avant-dernier de l\'équipe' },
  { border: '#E08E28', text: '#B8701A', label: 'Parmi les 3 derniers de l\'équipe' },
] as const;

/** Anneau à deux tons (bord foncé + centre plus clair) pour un badge un peu plus riche qu'un aplat uni. */
const MOVEMENT_COLOR: Record<RankMovement, { outer: string; inner: string }> = {
  up: { outer: '#2F5A0E', inner: '#5FA82A' },
  down: { outer: '#7A241C', inner: '#C0392B' },
};

function logoDataUri(): string | null {
  try {
    const file = fs.readFileSync(path.join(process.cwd(), 'public/brand/header-logo.png'));
    return `data:image/png;base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: { padding: 22, fontSize: 9, fontFamily: 'Helvetica', color: INK, backgroundColor: '#FFFFFF' },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: FOREST, borderRadius: 9, padding: '7 14', marginBottom: 8,
  },
  logo: { width: 28, height: 28, borderRadius: 14 },
  bannerTextWrap: { flexDirection: 'column', gap: 1, flex: 1 },
  bannerTitle: { fontSize: 14, fontFamily: 'Times-Bold', color: '#FFFFFF', letterSpacing: 0.3 },
  bannerSubtitle: { fontSize: 7.5, color: GOLD_300 },
  bannerBadge: {
    fontSize: 7, color: FOREST, backgroundColor: GOLD_300, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3,
  },

  legendRow: { flexDirection: 'row', gap: 11, marginBottom: 6, paddingHorizontal: 2, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 6.5, color: MUTED },

  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 8 },
  headerRow: { flexDirection: 'row', backgroundColor: FOREST, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  rowStripe: { backgroundColor: STRIPE },
  rowRanked: { borderLeftWidth: 3 },
  totalsRow: {
    flexDirection: 'row', backgroundColor: FOREST_DARK, borderTopWidth: 1.5, borderTopColor: GOLD_500,
    borderBottomLeftRadius: 7, borderBottomRightRadius: 7,
  },

  cellName: { flex: 1.3, padding: '5 8', justifyContent: 'center' },
  cell: { flex: 0.8, padding: '4 3', alignItems: 'center', justifyContent: 'center' },
  cellRemark: { flex: 1.9, padding: '5 8', justifyContent: 'center' },

  headerText: { fontSize: 6.5, textTransform: 'uppercase', color: GOLD_300, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3, textAlign: 'center' },
  headerTextName: { fontSize: 6.5, textTransform: 'uppercase', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nameText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK },
  rankLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginTop: 1 },
  remarkText: { fontSize: 7.5, color: MUTED, lineHeight: 1.3 },
  movementBadge: {
    width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
  },
  movementBadgeInner: {
    width: 11, height: 11, borderRadius: 5.5, alignItems: 'center', justifyContent: 'center',
  },
  triangleUp: {
    width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFFFFF',
  },
  triangleDown: {
    width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF',
  },

  pillRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 6, gap: 3 },
  pillRowHero: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, gap: 3 },
  pillText: { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  pillTextHero: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  tierCellText: { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },

  totalsLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GOLD_300, textTransform: 'uppercase', letterSpacing: 0.3 },
  totalsValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },

  footer: {
    position: 'absolute', bottom: 12, left: 22, right: 22,
    flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: MUTED,
    borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 4,
  },
});

function Pill({ value, tone, hero }: { value: string | number; tone: keyof typeof TONES; hero?: boolean }) {
  const t = TONES[tone];
  return (
    <View style={[hero ? styles.pillRowHero : styles.pillRow, { backgroundColor: t.bg }]}>
      <Text style={[hero ? styles.pillTextHero : styles.pillText, { color: t.text }]}>{value}</Text>
    </View>
  );
}

type Badge = { border: string; text: string; label: string };

function MovementArrow({ movement }: { movement: RankMovement }) {
  const { outer, inner } = MOVEMENT_COLOR[movement];
  return (
    <View style={[styles.movementBadge, { backgroundColor: outer }]}>
      <View style={[styles.movementBadgeInner, { backgroundColor: inner }]}>
        <View style={movement === 'up' ? styles.triangleUp : styles.triangleDown} />
      </View>
    </View>
  );
}

function DataRow({
  person,
  stripe,
  badge,
  explicationTarget,
  movement,
}: {
  person: PersonPeriodReport;
  stripe: boolean;
  badge: Badge | undefined;
  explicationTarget: number;
  movement: RankMovement | undefined;
}) {
  const tier = explicationTierForTarget(person.explicationCount, explicationTarget);
  const fill = TIER_FILL[tier];
  const textColor = TIER_TEXT[tier];
  return (
    <View
      style={[
        styles.row,
        ...(stripe ? [styles.rowStripe] : []),
        ...(badge ? [styles.rowRanked, { borderLeftColor: badge.border }] : []),
      ]}
      wrap={false}
    >
      <View style={styles.cellName}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{person.name}</Text>
          {movement && <MovementArrow movement={movement} />}
        </View>
        {badge && <Text style={[styles.rankLabel, { color: badge.text }]}>{badge.label}</Text>}
      </View>
      <View style={styles.cell}>
        <Pill value={person.leadsTotal} tone="success" hero />
      </View>
      <View style={styles.cell}>
        <Pill value={fmtHHMMSS(person.idleSeconds)} tone="danger" />
      </View>
      <View style={[styles.cell, { backgroundColor: fill }]}>
        <Text style={[styles.tierCellText, { color: textColor }]}>{person.explicationParMsg}</Text>
      </View>
      <View style={[styles.cell, { backgroundColor: fill }]}>
        <Text style={[styles.tierCellText, { color: textColor }]}>{person.explicationParAppel}</Text>
      </View>
      <View style={[styles.cell, { backgroundColor: fill }]}>
        <Text style={[styles.tierCellText, { color: textColor }]}>
          {person.explicationCount} / {explicationTarget}
        </Text>
      </View>
      <View style={styles.cell}>
        <Pill value={fmtHHMMSS(person.closingSeconds)} tone="teal" />
      </View>
      <View style={styles.cellRemark}>
        <Text style={styles.remarkText}>{person.remark || '—'}</Text>
      </View>
    </View>
  );
}

export function buildPdfDocument(
  report: PeriodReport,
  explicationTarget = 4,
  movement: Record<string, RankMovement> = {}
) {
  const sorted = sortByRanking(report.people);
  const hasMovement = Object.keys(movement).length > 0;
  const dangerLabel = explicationTarget - 2 > 0 ? `0-${explicationTarget - 2}` : '0';
  const totals = report.people.reduce(
    (acc, p) => ({
      leads: acc.leads + p.leadsTotal,
      idle: acc.idle + p.idleSeconds,
      explicationMsg: acc.explicationMsg + p.explicationParMsg,
      explicationAppel: acc.explicationAppel + p.explicationParAppel,
      explicationCount: acc.explicationCount + p.explicationCount,
      closing: acc.closing + p.closingSeconds,
    }),
    { leads: 0, idle: 0, explicationMsg: 0, explicationAppel: 0, explicationCount: 0, closing: 0 }
  );
  const logo = logoDataUri();

  return (
    <Document title="Rapport de performance — Sales" author="Suivi Leads — Rapports">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.banner}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is a PDF node, not an HTML <img>; it has no alt prop. */}
          {logo && <Image src={logo} style={styles.logo} />}
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Rapport de performance — Sales</Text>
            <Text style={styles.bannerSubtitle}>
              Période du {report.range.from} au {report.range.to}
            </Text>
          </View>
          <Text style={styles.bannerBadge}>{sorted.length} sales</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TONES.success.text }]} />
            <Text style={styles.legendLabel}>Leads traités</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TONES.danger.text }]} />
            <Text style={styles.legendLabel}>Temps perdu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TONES.teal.text }]} />
            <Text style={styles.legendLabel}>Temps de closing</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TIER_FILL.danger }]} />
            <View style={[styles.legendDot, { backgroundColor: TIER_TEXT.warning }]} />
            <View style={[styles.legendDot, { backgroundColor: TIER_TEXT.success }]} />
            <Text style={styles.legendLabel}>
              Explication (Msg / Appel / Nbre) — objectif {explicationTarget} : rouge {dangerLabel}, orange {explicationTarget - 1}, vert {explicationTarget}+
            </Text>
          </View>
          {hasMovement && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MOVEMENT_COLOR.up.inner }]} />
              <Text style={styles.legendLabel}>Progresse au classement (vs veille)</Text>
              <View style={[styles.legendDot, { backgroundColor: MOVEMENT_COLOR.down.inner, marginLeft: 6 }]} />
              <Text style={styles.legendLabel}>Recule au classement</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={styles.cellName}>
              <Text style={styles.headerTextName}>Sales</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Leads traités</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Temps perdu</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Expl. / Msg</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Expl. / Appel</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Nbre d&apos;expl.</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.headerText}>Closing</Text>
            </View>
            <View style={styles.cellRemark}>
              <Text style={styles.headerText}>Remarque</Text>
            </View>
          </View>

          {sorted.map((p, i) => {
            const topBadge = RANK_BADGES[i];
            const fromEnd = sorted.length - 1 - i;
            const badge = topBadge ?? BOTTOM_BADGES[fromEnd];
            return (
              <DataRow
                key={p.personId}
                person={p}
                stripe={i % 2 === 1}
                badge={badge}
                explicationTarget={explicationTarget}
                movement={movement[p.personId]}
              />
            );
          })}

          <View style={styles.totalsRow}>
            <View style={styles.cellName}>
              <Text style={styles.totalsLabel}>Total équipe</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>{totals.leads}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>{fmtHHMMSS(totals.idle)}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>{totals.explicationMsg}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>{totals.explicationAppel}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>
                {totals.explicationCount} / {sorted.length * explicationTarget}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.totalsValue}>{fmtHHMMSS(totals.closing)}</Text>
            </View>
            <View style={styles.cellRemark} />
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Suivi des leads — Dentakay · Généré le {new Date().toLocaleDateString('fr-FR')}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdfReport(
  report: PeriodReport,
  explicationTarget = 4,
  movement: Record<string, RankMovement> = {}
): Promise<Buffer> {
  return renderToBuffer(buildPdfDocument(report, explicationTarget, movement));
}
