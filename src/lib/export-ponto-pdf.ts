import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DaySummary {
  date: Date;
  hoursWorked: number;
  breakMinutes: number;
  clockIn: string | null;
  clockOut: string | null;
  records: any[];
  isAbsent: boolean;
  isWeekend: boolean;
}

interface EmployeeSummary {
  employee: { id: string; name: string; department: string | null };
  days: DaySummary[];
  totalHours: number;
  totalBreakMinutes: number;
  daysWorked: number;
  absences: number;
}

function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function exportEmployeePontoPDF(summary: EmployeeSummary, monthDate: Date) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const BLACK = "#0A0A0B";
  const DARK = "#161618";
  const BLUE = "#A1A1AA";
  const RED = "#71717A";
  const WHITE = "#FFFFFF";
  const YELLOW = "#A1A1AA";
  const GRAY = "#9CA3AF";
  const LIGHT_GRAY = "#D1D5DB";

  // Background
  doc.setFillColor(BLACK);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

  // Header bar
  doc.setFillColor(DARK);
  doc.roundedRect(10, 10, pageWidth - 20, 36, 4, 4, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(WHITE);
  doc.text("RELATÓRIO DE PONTO", 18, 25);

  // Month
  doc.setFontSize(10);
  doc.setTextColor(BLUE);
  const monthStr = format(monthDate, "MMMM yyyy", { locale: ptBR }).toUpperCase();
  doc.text(monthStr, 18, 33);

  // Company watermark
  doc.setFontSize(9);
  doc.setTextColor(GRAY);
  doc.text("Allcance", pageWidth - 18, 25, { align: "right" });

  // Employee info card
  doc.setFillColor(DARK);
  doc.roundedRect(10, 52, pageWidth - 20, 22, 4, 4, "F");

  doc.setFontSize(14);
  doc.setTextColor(WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(summary.employee.name.toUpperCase(), 18, 63);

  if (summary.employee.department) {
    doc.setFontSize(8);
    doc.setTextColor(GRAY);
    doc.text(summary.employee.department.toUpperCase(), 18, 69);
  }

  // Stats row
  const statsY = 80;
  const statsW = (pageWidth - 20 - 12) / 4;

  const stats = [
    { label: "HORAS TOTAIS", value: fmtDuration(summary.totalHours * 60), color: BLUE },
    { label: "DIAS TRABALHADOS", value: String(summary.daysWorked), color: WHITE },
    { label: "INTERVALO TOTAL", value: fmtDuration(summary.totalBreakMinutes), color: YELLOW },
    { label: "FALTAS", value: String(summary.absences), color: summary.absences > 0 ? RED : WHITE },
  ];

  stats.forEach((stat, i) => {
    const x = 10 + i * (statsW + 4);
    doc.setFillColor(DARK);
    doc.roundedRect(x, statsY, statsW, 20, 3, 3, "F");

    doc.setFontSize(14);
    doc.setTextColor(stat.color);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + statsW / 2, statsY + 10, { align: "center" });

    doc.setFontSize(5.5);
    doc.setTextColor(GRAY);
    doc.text(stat.label, x + statsW / 2, statsY + 16, { align: "center" });
  });

  // Table
  const filteredDays = summary.days.filter((d) => d.date <= new Date() || d.records.length > 0);

  const tableData = filteredDays.map((day) => {
    const dayNum = format(day.date, "dd");
    const dayName = format(day.date, "EEE", { locale: ptBR });

    let status = "—";
    if (day.isWeekend) status = "FIM DE SEMANA";
    else if (day.isAbsent) status = "FALTOU";
    else if (day.records.length > 0) status = "PRESENTE";

    return [
      `${dayNum} ${dayName}`,
      status,
      day.clockIn || "—",
      day.clockOut || "—",
      day.hoursWorked > 0 ? fmtDuration(day.hoursWorked * 60) : "—",
      day.breakMinutes > 0 ? fmtDuration(day.breakMinutes) : "—",
    ];
  });

  autoTable(doc, {
    startY: 106,
    head: [["DIA", "STATUS", "ENTRADA", "SAÍDA", "HORAS", "INTERVALO"]],
    body: tableData,
    foot: [["TOTAL", "", "", "", fmtDuration(summary.totalHours * 60), fmtDuration(summary.totalBreakMinutes)]],
    theme: "plain",
    styles: {
      fillColor: BLACK,
      textColor: LIGHT_GRAY,
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      font: "helvetica",
      lineColor: "#2A2A2E",
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: DARK,
      textColor: BLUE,
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    footStyles: {
      fillColor: DARK,
      textColor: BLUE,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 32, halign: "center" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 28, halign: "center" },
      5: { cellWidth: 28, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = data.cell.raw as string;
        if (val === "FALTOU") {
          data.cell.styles.textColor = RED;
          data.cell.styles.fontStyle = "bold";
        } else if (val === "PRESENTE") {
          data.cell.styles.textColor = "#D4D4D8";
          data.cell.styles.fontStyle = "bold";
        } else if (val === "FIM DE SEMANA") {
          data.cell.styles.textColor = GRAY;
          data.cell.styles.fontSize = 6.5;
        }
      }
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val !== "—") {
          data.cell.styles.textColor = YELLOW;
        }
      }
      // Alternate row shading
      if (data.section === "body" && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = "#111113";
      }
    },
    margin: { left: 10, right: 10 },
    tableWidth: "auto",
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 260;
  doc.setFontSize(6);
  doc.setTextColor(GRAY);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    Math.min(finalY + 12, doc.internal.pageSize.getHeight() - 8),
    { align: "center" }
  );

  const fileName = `ponto_${summary.employee.name.replace(/\s+/g, "_").toLowerCase()}_${format(monthDate, "yyyy_MM")}.pdf`;
  doc.save(fileName);
}
