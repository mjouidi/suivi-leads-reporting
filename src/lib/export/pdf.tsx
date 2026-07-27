import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { PeriodReport } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#6B6157', marginBottom: 16 },
  table: { display: 'flex', flexDirection: 'column', borderWidth: 1, borderColor: '#E7E0D3' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E7E0D3' },
  headerRow: { flexDirection: 'row', backgroundColor: '#F1EFE8', borderBottomWidth: 1, borderBottomColor: '#E7E0D3' },
  totalsRow: { flexDirection: 'row', backgroundColor: '#FBF6EC', fontWeight: 700 },
  cellName: { flex: 1.4, padding: 6 },
  cell: { flex: 1, padding: 6, textAlign: 'right' },
  cellRemark: { flex: 2.4, padding: 6, textAlign: 'left' },
  headerText: { fontSize: 8.5, textTransform: 'uppercase', color: '#6B6157', fontWeight: 700 },
});

export function buildPdfDocument(report: PeriodReport) {
  const sorted = [...report.people].sort((a, b) => b.leadsTotal - a.leadsTotal);
  const totals = report.people.reduce(
    (acc, p) => ({
      explicationMsg: acc.explicationMsg + p.explicationParMsg,
      explicationAppel: acc.explicationAppel + p.explicationParAppel,
      closing: acc.closing + p.closingSeconds,
      leads: acc.leads + p.leadsTotal,
    }),
    { explicationMsg: 0, explicationAppel: 0, closing: 0, leads: 0 }
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Rapport de performance par employé</Text>
        <Text style={styles.subtitle}>
          Période : {report.range.from} → {report.range.to} — généré le {new Date().toLocaleDateString('fr-FR')}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cellName, styles.headerText]}>Employé</Text>
            <Text style={[styles.cell, styles.headerText]}>Explication / Msg</Text>
            <Text style={[styles.cell, styles.headerText]}>Explication / Appel</Text>
            <Text style={[styles.cell, styles.headerText]}>Temps de closing</Text>
            <Text style={[styles.cell, styles.headerText]}>Leads traités</Text>
            <Text style={[styles.cellRemark, styles.headerText]}>Remarque</Text>
          </View>
          {sorted.map((p) => (
            <View style={styles.row} key={p.personId}>
              <Text style={styles.cellName}>{p.name}</Text>
              <Text style={styles.cell}>{p.explicationParMsg}</Text>
              <Text style={styles.cell}>{p.explicationParAppel}</Text>
              <Text style={styles.cell}>{fmtHHMMSS(p.closingSeconds)}</Text>
              <Text style={styles.cell}>{p.leadsTotal}</Text>
              <Text style={styles.cellRemark}>{p.remark}</Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={styles.cellName}>Total équipe</Text>
            <Text style={styles.cell}>{totals.explicationMsg}</Text>
            <Text style={styles.cell}>{totals.explicationAppel}</Text>
            <Text style={styles.cell}>{fmtHHMMSS(totals.closing)}</Text>
            <Text style={styles.cell}>{totals.leads}</Text>
            <Text style={styles.cellRemark}>{''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdfReport(report: PeriodReport): Promise<Buffer> {
  return renderToBuffer(buildPdfDocument(report));
}
