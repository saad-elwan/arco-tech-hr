import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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

    // Helper function for RTL text
    const rtlText = (text: string, x: number, y: number, width: number, align: string = "right") => {
      doc.text(text, x, y, { width, align, direction: "rtl" as any });
    };

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

    // Header background
    doc.rect(0, 0, pageWidth, 100).fill("#1a365d");

    // Header text - RTL aligned
    doc.fill("#ffffff");
    rtlText(options.companyName, margin, 20, contentWidth, "right");
    doc.font(fontBold).fontSize(22);
    rtlText("نظام إدارة الموارد البشرية", margin, 50, contentWidth, "right");
    doc.font(fontRegular).fontSize(12);

    // Date on left (in RTL this is the start)
    doc.fontSize(10).text(`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`, margin, 20, { align: "left", width: 200 });
    doc.text(`الفترة: ${options.period}`, margin, 35, { align: "left", width: 200 });

    // Decorative line
    doc.rect(0, 100, pageWidth, 4).fill("#c9a227");

    // Report title - centered
    doc.fill("#1a365d").font(fontBold).fontSize(18);
    rtlText(options.reportTitle, margin, 130, contentWidth, "center");
    doc.rect(pageWidth / 2 - 100, 155, 200, 2).fill("#c9a227");

    // Summary boxes - RTL order (right to left)
    const boxWidth = (contentWidth - 30) / 4;
    const boxY = 180;
    options.summaryItems.forEach((item, i) => {
      // Reverse order for RTL: last item first
      const boxX = pageWidth - margin - (i + 1) * (boxWidth + 10) + 10;
      doc.rect(boxX, boxY, boxWidth, 50).fill("#f7fafc").stroke("#e2e8f0");
      doc.fill("#1a365d").font(fontBold).fontSize(16);
      rtlText(String(item.value), boxX, boxY + 5, boxWidth, "center");
      doc.font(fontRegular).fontSize(10);
      rtlText(item.label, boxX, boxY + 28, boxWidth, "center");
    });

    // Table - RTL layout
    const tableTop = 260;
    const rowHeight = 28;
    const colWidths = options.tableColWidths.map((w) => w * 0.65);
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableRight = pageWidth - margin;

    // Table header - RTL (right to left)
    doc.rect(tableRight - tableWidth, tableTop, tableWidth, rowHeight).fill("#1a365d");
    let x = tableRight - tableWidth;
    doc.fill("#ffffff").font(fontBold).fontSize(10);
    options.tableHeaders.forEach((header, i) => {
      rtlText(header, x + 5, tableTop + 8, colWidths[i] - 10, "center");
      x += colWidths[i];
    });

    // Table rows - RTL
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
        rtlText(text, x + 5, rowY + 8, colWidths[i] - 10, "center");
        x += colWidths[i];
      });
    });

    // Table border
    doc.rect(tableRight - tableWidth, tableTop, tableWidth, (options.tableData.length + 1) * rowHeight).stroke("#e2e8f0");

    // Signatures section - RTL
    const sigY = pageHeight - 100;
    doc.fill("#1a365d").font(fontBold).fontSize(12);
    rtlText("التوقيعات", margin, sigY, 100, "right");

    const sigWidth = 180;
    const signatures = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"];
    signatures.forEach((sig, i) => {
      const sigX = pageWidth - margin - (i + 1) * (sigWidth + 30) + 30;
      doc.font(fontRegular).fontSize(10);
      rtlText(sig, sigX, sigY + 25, sigWidth, "center");
      doc.moveTo(sigX + 20, sigY + 50).lineTo(sigX + sigWidth - 20, sigY + 50).stroke("#1a365d");
    });

    // Footer
    doc.rect(0, pageHeight - 30, pageWidth, 30).fill("#1a365d");
    doc.fill("#ffffff").font(fontRegular).fontSize(8);
    rtlText(
      `تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية - ${options.companyName} | ${new Date().toLocaleString("ar-EG")}`,
      margin,
      pageHeight - 22,
      contentWidth,
      "center"
    );

    doc.end();
  });
}
