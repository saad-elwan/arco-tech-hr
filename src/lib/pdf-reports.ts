import PDFDocument from "pdfkit";

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

    // Header
    doc.fontSize(18).text(options.companyName, { align: "right" });
    doc.fontSize(10).text(`تاريخ: ${new Date().toLocaleDateString("ar-EG")}`, { align: "left" });
    doc.moveDown();

    // Title
    doc.fontSize(16).text(options.reportTitle, { align: "center" });
    doc.moveDown();

    // Table
    const startX = 30;
    let startY = doc.y;
    const rowHeight = 25;
    const colWidths = options.tableColWidths.map((w) => w * 0.6);

    // Table headers
    doc.fontSize(10).font("Helvetica-Bold");
    let x = startX;
    options.tableHeaders.forEach((header, i) => {
      doc.text(header, x, startY, { width: colWidths[i], align: "center" });
      x += colWidths[i];
    });
    startY += rowHeight;

    // Table rows
    doc.fontSize(9).font("Helvetica");
    options.tableData.forEach((row) => {
      x = startX;
      row.forEach((cell, i) => {
        let text = String(cell);
        if (options.statusColumnIndex === i && options.statusLabels) {
          text = options.statusLabels[text] || text;
        }
        doc.text(text, x, startY, { width: colWidths[i], align: "center" });
        x += colWidths[i];
      });
      startY += rowHeight;
    });

    doc.end();
  });
}
