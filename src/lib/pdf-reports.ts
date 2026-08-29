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
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;

  pdfMake.vfs = pdfFonts.pdfMake ? pdfMake.vfs : pdfFonts.vfs;

  const tableBody = [
    options.tableHeaders.map((h) => ({
      text: h,
      style: "tableHeader",
      alignment: "center",
    })),
    ...options.tableData.map((row) =>
      row.map((cell, i) => {
        let text = String(cell);
        if (options.statusColumnIndex === i && options.statusLabels) {
          text = options.statusLabels[text] || text;
        }
        return { text, alignment: "center", style: "tableCell" };
      })
    ),
  ];

  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          { text: options.companyName, style: "companyName" },
          { text: `تاريخ: ${new Date().toLocaleDateString("ar-EG")}`, alignment: "left" },
        ],
      },
      { text: options.reportTitle, style: "reportTitle" },
      {
        table: {
          headerRows: 1,
          widths: options.tableColWidths.map((w) => w * 0.7),
          body: tableBody,
        },
        style: "table",
      },
    ],
    defaultStyle: {
      font: "Roboto",
      direction: "rtl",
    },
    styles: {
      companyName: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      reportTitle: { fontSize: 16, bold: true, margin: [0, 10, 0, 20], alignment: "center" },
      tableHeader: { bold: true, fontSize: 11, fillColor: "#f0f0f0" },
      tableCell: { fontSize: 10 },
      table: { margin: [0, 10, 0, 20] },
    },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}
