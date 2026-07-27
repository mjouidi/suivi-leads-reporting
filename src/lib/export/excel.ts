import ExcelJS from 'exceljs';
import type { PeriodReport } from '@/lib/report';
import { fmtHHMMSS } from '@/lib/format';

export async function buildExcelReport(report: PeriodReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Suivi Leads — Rapports';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Synthèse');
  summary.columns = [
    { header: 'Employé', key: 'name', width: 22 },
    { header: 'Explication / Msg', key: 'explicationMsg', width: 16 },
    { header: 'Explication / Appel', key: 'explicationAppel', width: 18 },
    { header: 'Temps de closing', key: 'closing', width: 16 },
    { header: 'Leads traités', key: 'leads', width: 14 },
    { header: 'Remarque', key: 'remark', width: 40 },
  ];
  summary.getRow(1).font = { bold: true };

  for (const p of [...report.people].sort((a, b) => b.leadsTotal - a.leadsTotal)) {
    summary.addRow({
      name: p.name,
      explicationMsg: p.explicationParMsg,
      explicationAppel: p.explicationParAppel,
      closing: fmtHHMMSS(p.closingSeconds),
      leads: p.leadsTotal,
      remark: p.remark,
    });
  }
  summary.getColumn('remark').alignment = { wrapText: true, vertical: 'top' };

  const totals = report.people.reduce(
    (acc, p) => ({
      explicationMsg: acc.explicationMsg + p.explicationParMsg,
      explicationAppel: acc.explicationAppel + p.explicationParAppel,
      closing: acc.closing + p.closingSeconds,
      leads: acc.leads + p.leadsTotal,
    }),
    { explicationMsg: 0, explicationAppel: 0, closing: 0, leads: 0 }
  );
  const totalsRow = summary.addRow({
    name: 'Total équipe',
    explicationMsg: totals.explicationMsg,
    explicationAppel: totals.explicationAppel,
    closing: fmtHHMMSS(totals.closing),
    leads: totals.leads,
    remark: '',
  });
  totalsRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
