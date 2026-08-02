import ExcelJS from 'exceljs';
import { explicationTier, sortByRanking, type PeriodReport } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';

/**
 * Rouge foncé/vif pour bien signaler le retard sur l'objectif ; orange et vert
 * restent des teintes très claires (pas d'alarme quand tout va bien).
 */
const TIER_FILL: Record<ReturnType<typeof explicationTier>, string> = {
  success: 'FFEAF3DE',
  warning: 'FFFAEEDA',
  danger: 'FFC0392B',
};
const TIER_FONT: Record<ReturnType<typeof explicationTier>, string> = {
  success: 'FF3B6D11',
  warning: 'FF854F0B',
  danger: 'FFFFFFFF',
};

export async function buildExcelReport(report: PeriodReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Suivi Leads — Rapports';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Synthèse');
  summary.columns = [
    { header: 'Sales', key: 'name', width: 22 },
    { header: 'Leads traités', key: 'leads', width: 14 },
    { header: 'Temps perdu', key: 'idle', width: 14 },
    { header: 'Explication / Msg', key: 'explicationMsg', width: 16 },
    { header: 'Explication / Appel', key: 'explicationAppel', width: 18 },
    { header: "Nbre d'explication", key: 'explicationCount', width: 18 },
    { header: 'Temps de closing', key: 'closing', width: 16 },
    { header: 'Remarque', key: 'remark', width: 40 },
  ];
  summary.getRow(1).font = { bold: true };

  for (const p of sortByRanking(report.people)) {
    const row = summary.addRow({
      name: p.name,
      leads: p.leadsTotal,
      idle: fmtHHMMSS(p.idleSeconds),
      explicationMsg: p.explicationParMsg,
      explicationAppel: p.explicationParAppel,
      explicationCount: `${p.explicationCount} / 4`,
      closing: fmtHHMMSS(p.closingSeconds),
      remark: p.remark,
    });
    const tier = explicationTier(p.explicationCount);
    for (const key of ['explicationMsg', 'explicationAppel', 'explicationCount'] as const) {
      const cell = row.getCell(key);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TIER_FILL[tier] } };
      cell.font = { bold: true, color: { argb: TIER_FONT[tier] } };
      cell.alignment = { horizontal: 'center' };
    }
  }
  summary.getColumn('remark').alignment = { wrapText: true, vertical: 'top' };

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
  const totalsRow = summary.addRow({
    name: 'Total équipe',
    leads: totals.leads,
    idle: fmtHHMMSS(totals.idle),
    explicationMsg: totals.explicationMsg,
    explicationAppel: totals.explicationAppel,
    explicationCount: `${totals.explicationCount} / ${report.people.length * 4}`,
    closing: fmtHHMMSS(totals.closing),
    remark: '',
  });
  totalsRow.font = { bold: true };
  totalsRow.getCell('explicationCount').alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
