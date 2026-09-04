import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reshape = require("arabic-reshaper").convertArabic;

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
      autoFirstPage: false,
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

    // Reshape and reverse Arabic text for PDFKit
    const ar = (text: string) => {
      const reshaped = reshape(String(text)) || String(text);
      return reshaped.split('').reverse().join('');
    };

    const colWidths = options.tableColWidths.map((w) => w * 0.65);
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableRight = pageWidth - margin;
    const rowHeight = 28;
    const maxRowsFirstPage = Math.floor((pageHeight - 260 - 130) / rowHeight); // space for header + summary + signatures
    const maxRowsPerPage = Math.floor((pageHeight - 80 - 60) / rowHeight); // space for mini header + footer

    // --- Helper: draw table header row ---
    const drawTableHeader = (y: number) => {
      doc.rect(tableRight - tableWidth, y, tableWidth, rowHeight).fill("#0a0a0c");
      let x = tableRight - tableWidth;
      doc.fill("#d4af37").font(fontBold).fontSize(10);
      options.tableHeaders.forEach((header, i) => {
        doc.text(ar(header), x + 5, y + 8, { width: colWidths[i] - 10, align: "center" });
        x += colWidths[i];
      });
    };

    // --- Helper: draw page footer ---
    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.rect(0, pageHeight - 30, pageWidth, 30).fill("#1a365d");
      doc.fill("#ffffff").font(fontRegular).fontSize(8);
      doc.text(
        ar(`صفحة ${pageNum} من ${totalPages} | ${options.companyName} | ${new Date().toLocaleString("ar-EG")}`),
        margin, pageHeight - 22, { align: "center", width: contentWidth }
      );
    };

    // Calculate total pages
    const totalDataRows = options.tableData.length;
    let totalPages = 1;
    if (totalDataRows > maxRowsFirstPage) {
      totalPages += Math.ceil((totalDataRows - maxRowsFirstPage) / maxRowsPerPage);
    }

    // ===== PAGE 1 =====
    doc.addPage();
    
    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

    // Header background
    doc.rect(0, 0, pageWidth, 100).fill("#0a0a0c");

    // Header text
    doc.fill("#d4af37").font(fontBold).fontSize(22);
    doc.text(ar(options.companyName), margin, 20, { align: "right", width: contentWidth });
    doc.fill("#ffffff").font(fontRegular).fontSize(14);
    doc.text(ar("نظام الإدارة المتقدم"), margin, 50, { align: "right", width: contentWidth });

    // Date on left
    doc.fontSize(10);
    doc.text(ar(`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`), margin, 20, { align: "left", width: 200 });
    doc.text(ar(`الفترة: ${options.period}`), margin, 35, { align: "left", width: 200 });

    // Decorative line
    doc.rect(0, 100, pageWidth, 4).fill("#d4af37");

    // Report title
    doc.fill("#0a0a0c").font(fontBold).fontSize(18);
    doc.text(ar(options.reportTitle), margin, 130, { align: "center", width: contentWidth });
    doc.rect(pageWidth / 2 - 100, 155, 200, 2).fill("#d4af37");

    // Summary boxes - RTL order
    const boxWidth = (contentWidth - 30) / 4;
    const boxY = 180;
    options.summaryItems.forEach((item, i) => {
      const boxX = pageWidth - margin - (i + 1) * (boxWidth + 10) + 10;
      doc.rect(boxX, boxY, boxWidth, 50).fill("#fbfbfb").stroke("#d4af37");
      doc.fill("#0a0a0c").font(fontBold).fontSize(16);
      doc.text(ar(String(item.value)), boxX, boxY + 5, { align: "center", width: boxWidth });
      doc.font(fontRegular).fontSize(10);
      doc.text(ar(item.label), boxX, boxY + 28, { align: "center", width: boxWidth });
    });

    // Table on page 1
    const tableTop = 260;
    drawTableHeader(tableTop);

    const statusLabels = options.statusLabels || {
      active: "نشط", leave: "إجازة", inactive: "غير نشط",
      present: "حاضر", absent: "غائب", late: "متأخر",
      new: "جديد", in_progress: "قيد التنفيذ", completed: "مكتمل",
    };

    const rowsOnFirstPage = Math.min(totalDataRows, maxRowsFirstPage);
    
    for (let rowIndex = 0; rowIndex < rowsOnFirstPage; rowIndex++) {
      const row = options.tableData[rowIndex];
      const rowY = tableTop + (rowIndex + 1) * rowHeight;
      const bgColor = rowIndex % 2 === 0 ? "#ffffff" : "#fdfdfd";
      doc.rect(tableRight - tableWidth, rowY, tableWidth, rowHeight).fill(bgColor);

      let x = tableRight - tableWidth;
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
    }

    // Table border for page 1
    doc.rect(tableRight - tableWidth, tableTop, tableWidth, (rowsOnFirstPage + 1) * rowHeight).stroke("#d4af37");

    // If all data fits on page 1, draw signatures
    if (totalDataRows <= maxRowsFirstPage) {
      const sigY = pageHeight - 100;
      doc.fill("#0a0a0c").font(fontBold).fontSize(12);
      doc.text(ar("التوقيعات"), margin, sigY, { align: "right", width: 100 });
      const sigWidth = 180;
      const signatures = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"];
      signatures.forEach((sig, i) => {
        const sigX = pageWidth - margin - (i + 1) * (sigWidth + 30) + 30;
        doc.font(fontRegular).fontSize(10);
        doc.text(ar(sig), sigX, sigY + 25, { align: "center", width: sigWidth });
        doc.moveTo(sigX + 20, sigY + 50).lineTo(sigX + sigWidth - 20, sigY + 50).stroke("#1a365d");
      });
    }

    drawFooter(1, totalPages);

    // ===== ADDITIONAL PAGES =====
    let remainingIndex = rowsOnFirstPage;
    let currentPage = 2;

    while (remainingIndex < totalDataRows) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

      // Mini header
      doc.rect(0, 0, pageWidth, 50).fill("#0a0a0c");
      doc.fill("#d4af37").font(fontBold).fontSize(14);
      doc.text(ar(options.reportTitle + " (تابع)"), margin, 15, { align: "right", width: contentWidth });
      doc.rect(0, 50, pageWidth, 3).fill("#d4af37");

      const contTableTop = 70;
      drawTableHeader(contTableTop);

      const rowsThisPage = Math.min(maxRowsPerPage, totalDataRows - remainingIndex);

      for (let ri = 0; ri < rowsThisPage; ri++) {
        const row = options.tableData[remainingIndex + ri];
        const rowY = contTableTop + (ri + 1) * rowHeight;
        const bgColor = ri % 2 === 0 ? "#ffffff" : "#fdfdfd";
        doc.rect(tableRight - tableWidth, rowY, tableWidth, rowHeight).fill(bgColor);

        let x = tableRight - tableWidth;
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
      }

      doc.rect(tableRight - tableWidth, contTableTop, tableWidth, (rowsThisPage + 1) * rowHeight).stroke("#d4af37");

      remainingIndex += rowsThisPage;

      // If this is the last page, draw signatures
      if (remainingIndex >= totalDataRows) {
        const lastRowBottom = contTableTop + (rowsThisPage + 1) * rowHeight;
        if (lastRowBottom + 100 < pageHeight - 30) {
          const sigY = lastRowBottom + 30;
          doc.fill("#0a0a0c").font(fontBold).fontSize(12);
          doc.text(ar("التوقيعات"), margin, sigY, { align: "right", width: 100 });
          const sigWidth = 180;
          const signatures = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"];
          signatures.forEach((sig, i) => {
            const sigX = pageWidth - margin - (i + 1) * (sigWidth + 30) + 30;
            doc.font(fontRegular).fontSize(10);
            doc.text(ar(sig), sigX, sigY + 25, { align: "center", width: sigWidth });
            doc.moveTo(sigX + 20, sigY + 50).lineTo(sigX + sigWidth - 20, sigY + 50).stroke("#1a365d");
          });
        }
      }

      drawFooter(currentPage, totalPages);
      currentPage++;
    }

    doc.end();
  });
}

