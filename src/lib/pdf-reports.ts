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
  const pdfMake = await import("pdfmake/build/pdfmake");

  // Load custom Arabic font
  const vfsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "https://hr-amr.vercel.app"}/fonts/vfs_fonts.js`
  );
  const vfsText = await vfsResponse.text();
  eval(vfsText);

  const pdfMakeInstance = pdfMake.default;
  pdfMakeInstance.fonts = {
    Cairo: {
      normal: "Cairo-Regular.ttf",
      bold: "Cairo-Bold.ttf",
      italics: "Cairo-Regular.ttf",
      bolditalics: "Cairo-Bold.ttf",
    },
  };

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

  const tableBody = [
    options.tableHeaders.map((h) => ({
      text: h,
      style: "tableHeader",
      alignment: "center",
    })),
    ...options.tableData.map((row) =>
      row.map((cell, i) => {
        let text = String(cell);
        if (options.statusColumnIndex === i && statusLabels) {
          text = statusLabels[text] || text;
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
          {
            width: "auto",
            stack: [
              { text: options.companyName, style: "companyName" },
              options.departmentName ? { text: options.departmentName, style: "departmentName" } : {},
            ],
          },
          {
            width: "*",
            text: `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}\nشهر التقرير: ${options.period}`,
            style: "dateInfo",
            alignment: "left",
          },
        ],
        columnGap: 10,
      },
      { text: "", style: "spacer" },
      { text: options.reportTitle, style: "reportTitle" },
      { text: "", style: "spacer" },
      {
        table: {
          headerRows: 1,
          widths: options.tableColWidths.map((w) => w * 0.7),
          body: tableBody,
        },
        style: "table",
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#000",
          vLineColor: () => "#000",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      { text: "", style: "spacer" },
      {
        columns: (options.signatures || ["مدير الموارد البشرية", "المدير المالي", "المدير العام"]).map((sig) => ({
          width: "*",
          stack: [
            { text: sig, style: "signatureName" },
            { text: "_________________", style: "signatureLine" },
          ],
          alignment: "center",
        })),
        columnGap: 20,
      },
    ],
    defaultStyle: {
      font: "Cairo",
      direction: "rtl",
      fontSize: 11,
    },
    styles: {
      companyName: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
      departmentName: { fontSize: 13, color: "#666" },
      dateInfo: { fontSize: 11, color: "#666", lineHeight: 1.5, alignment: "left" },
      reportTitle: { fontSize: 16, bold: true, margin: [0, 0, 0, 15], alignment: "center" },
      tableHeader: { bold: true, fontSize: 11, fillColor: "#e8e8e8", color: "#000" },
      tableCell: { fontSize: 10, color: "#333" },
      table: { margin: [0, 10, 0, 20] },
      spacer: { fontSize: 8 },
      signatureName: { fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
      signatureLine: { fontSize: 12, color: "#666" },
    },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}
