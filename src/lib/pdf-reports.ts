import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reshape = require("arabic-reshaper").reshape;

export interface FormalReportOptions {
  companyName: string;
  departmentName?: string;
  period: string;
  reportTitle: string;
  summaryItems: Array<{ label: string; value: string; color?: string }>;
  tableHeaders: string[];
  tableColWidths: number[];
  tableData: Array<Array<string | number>>;
  statusColumnIndex?: number;
  statusColors?: Record<string, string>;
  statusLabels?: Record<string, string>;
  signatures?: string[];
}

export async function generateFormalReportPDF(options: FormalReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
      info: {
        Title: options.reportTitle,
        Author: options.companyName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Load Arabic fonts
    let fontRegular = "Helvetica";
    let fontBold = "Helvetica-Bold";
    try {
      const fontPath = path.join(process.cwd(), "public/fonts/Cairo-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf");
      if (fs.existsSync(fontPath)) {
        doc.registerFont("Cairo", fontPath);
        fontRegular = "Cairo";
      }
      if (fs.existsSync(boldFontPath)) {
        doc.registerFont("Cairo-Bold", boldFontPath);
        fontBold = "Cairo-Bold";
      }
    } catch (e) {
      // Font loading failed, use default
    }

    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Reshape Arabic text
    const ar = (text: string) => reshape(text) || text;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

    // Header background
    doc.rect(0, 0, pageWidth, 100).fill("#1a365d");

    // Header text
    doc.fill("#ffffff").font(fontBold).fontSize(22);
    doc.text(ar(options.companyName), margin, 20, { align: "right", width: contentWidth });
    doc.font(fontRegular).fontSize(14);
    doc.text(ar("نظام إدارة الموارد البشرية"), margin, 50, { align: "right", width: contentWidth });

    // Date on left
    doc.fontSize(10);
    doc.text(ar(`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`), margin, 20, { align: "left", width: 200 });
    doc.text(ar(`الفترة: ${options.period}`), margin, 35, { align: "left", width: 200 });

    // Decorative line
    doc.rect(0, 100, pageWidth, 4).fill("#c9a227");

    // Report title
    doc.fill("#1a365d").font(fontBold).fontSize(18);
    doc.text(ar(options.reportTitle), margin, 130, { align: "center", width: contentWidth });
    doc.rect(pageWidth / 2 - 100, 155, 200, 2).fill("#c9a227");

    // Summary boxes - RTL order
    const boxWidth = (contentWidth - 30) / 4;
    const boxY = 180;
    options.summaryItems.forEach((item, i) => {
      const boxX = pageWidth - margin - (i + 1) * (boxWidth + 10) + 10;
      doc.rect(boxX, boxY, boxWidth, 50).fill("#f7fafc").stroke("#e2e8f0");
      doc.fill("#1a365d").font(fontBold).fontSize(16);
      doc.text(ar(String(item.value)), boxX, boxY + 5, { align: "center", width: boxWidth });
      doc.font(fontRegular).fontSize(10);
      doc.text(ar(item.label), boxX, boxY + 28, { align: "center", width: boxWidth });
    });

    // Table
    const tableTop = 260;
    const rowHeight = 28;
    const colWidths = options.tableColWidths.map((w) => w * 0.65);
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableRight = pageWidth - margin;

    // Table header
    doc.rect(tableRight - tableWidth, tableTop, tableWidth, rowHeight).fill("#1a365d");
    let x = tableRight - tableWidth;
    doc.fill("#ffffff").font(fontBold).fontSize(10);
    options.tableHeaders.forEach((header, i) => {
      doc.text(ar(header), x + 5, tableTop + 8, { width: colWidths[i] - 10, align: "center" });
      x += colWidths[i];
    });

    // Table rows
    const statusLabels = options.statusLabels || {
      active: "نشط", leave: "إجازة", inactive: "غير نشط",
      present: "حاضر", absent: "غائب", late: "متأخر",
      new: "جديد", in_progress: "قيد التنفيذ", completed: "مكتمل",
    };

    options.tableData.forEach((row, rowIndex) => {
      const rowY = tableTop + (rowIndex + 1) * rowHeight;
      const bgColor = rowIndex % 2 === 0 ? "#ffffff" : "#f7fafc";
      doc.rect(tableRight - tableWidth, rowY, tableWidth, rowHeight).fill(bgColor);

      x = tableRight - tableWidth;
      doc.font(fontRegular).fontSize(9);
      row.forEach((cell, i) => {
        let text = String(cell);
        if (options.statusColumnIndex === i && statusLabels) {
          text = statusLabels[text] || text;
        }
        doc.fill("#2d3748");
        doc.text(ar(text), x + 5, rowY + 8, { width: colWidths[i] - 10, align: "center" });
        x += colWidths[i];
      });
    });

    // Table border
    doc.rect(tableRight - tableWidth, tableTop, tableWidth, (options.tableData.length + 1) * rowHeight).stroke("#e2e8f0");

    // Signatures
    const sigY = pageHeight - 100;
    doc.fill("#1a365d").font(fontBold).fontSize(12);
    doc.text(ar("التوقيعات"), margin, sigY, { align: "right", width: 100 });

    const sigWidth = 180;
    const signatures = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"];
    signatures.forEach((sig, i) => {
      const sigX = pageWidth - margin - (i + 1) * (sigWidth + 30) + 30;
      doc.font(fontRegular).fontSize(10);
      doc.text(ar(sig), sigX, sigY + 25, { align: "center", width: sigWidth });
      doc.moveTo(sigX + 20, sigY + 50).lineTo(sigX + sigWidth - 20, sigY + 50).stroke("#1a365d");
    });

    // Footer
    doc.rect(0, pageHeight - 30, pageWidth, 30).fill("#1a365d");
    doc.fill("#ffffff").font(fontRegular).fontSize(8);
    doc.text(
      ar(`تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية - ${options.companyName} | ${new Date().toLocaleString("ar-EG")}`),
      margin,
      pageHeight - 22,
      { align: "center", width: contentWidth }
    );

    doc.end();
  });
}
