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
      margin: 30,
      info: {
        Title: options.reportTitle,
        Author: options.companyName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Load Arabic font
    try {
      const fontPath = path.join(process.cwd(), "public/fonts/Cairo-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf");
      if (fs.existsSync(fontPath)) {
        doc.registerFont("Cairo", fontPath);
      }
      if (fs.existsSync(boldFontPath)) {
        doc.registerFont("Cairo-Bold", boldFontPath);
      }
    } catch (e) {
      // Font loading failed, use default
    }

    const statusLabels = options.statusLabels || {
      active: "نشط",
      leave: "إجازة",
      inactive: "غير نشط",
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      new: "جديد",
      in_progress: "قيد التنفيذ",
      completed: "مكتمل",
    };

    // Header
    doc.font("Cairo-Bold").fontSize(18).text(options.companyName, { align: "right" });
    doc.font("Cairo").fontSize(10).text(`تاريخ: ${new Date().toLocaleDateString("ar-EG")}`, { align: "left" });
    doc.moveDown();

    // Title
    doc.font("Cairo-Bold").fontSize(16).text(options.reportTitle, { align: "center" });
    doc.moveDown();

    // Summary
    const summaryY = doc.y;
    options.summaryItems.forEach((item, i) => {
      const x = 30 + i * 180;
      doc.font("Cairo").fontSize(10).text(`${item.label}: ${item.value}`, x, summaryY);
    });
    doc.moveDown(2);

    // Table
    const startX = 30;
    let startY = doc.y;
    const rowHeight = 25;
    const colWidths = options.tableColWidths.map((w) => w * 0.6);

    // Table headers
    doc.font("Cairo-Bold").fontSize(10);
    let x = startX;
    options.tableHeaders.forEach((header, i) => {
      doc.text(header, x, startY, { width: colWidths[i], align: "center" });
      x += colWidths[i];
    });
    startY += rowHeight;

    // Table rows
    doc.font("Cairo").fontSize(9);
    options.tableData.forEach((row) => {
      x = startX;
      row.forEach((cell, i) => {
        let text = String(cell);
        if (options.statusColumnIndex === i && statusLabels) {
          text = statusLabels[text] || text;
        }
        doc.text(text, x, startY, { width: colWidths[i], align: "center" });
        x += colWidths[i];
      });
      startY += rowHeight;
    });

    // Signatures
    doc.moveDown(2);
    const sigY = doc.y;
    const signatures = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"];
    signatures.forEach((sig, i) => {
      const x = 30 + i * 250;
      doc.font("Cairo").fontSize(11).text(sig, x, sigY, { width: 200, align: "center" });
      doc.font("Cairo").fontSize(10).text("_________________", x, sigY + 20, { width: 200, align: "center" });
    });

    doc.end();
  });
}
