import puppeteer from 'puppeteer';

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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    const getStatusStyle = (val: string, colIndex: number) => {
      if (options.statusColumnIndex !== undefined && colIndex === options.statusColumnIndex) {
        if (val === "تم الصرف" || val === "paid") {
          return `background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); border-radius: 4px; padding: 2px 8px; font-weight: bold;`;
        } else {
          return `background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 4px; padding: 2px 8px; font-weight: bold;`;
        }
      }
      return '';
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${options.reportTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Cairo', sans-serif;
          margin: 0;
          padding: 20px 40px;
          color: #e2e8f0;
          background-color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Glassmorphism Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          margin-bottom: 30px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #f8fafc;
        }

        .header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .header .company-info {
          text-align: left;
        }

        /* Summary Cards */
        .summary-container {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
        }

        .summary-card {
          flex: 1;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px 20px;
          border-radius: 10px;
          text-align: center;
        }

        .summary-label {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 20px;
          font-weight: bold;
          color: #38bdf8;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        th, td {
          padding: 12px 15px;
          text-align: right;
          font-size: 13px;
        }

        th {
          background-color: rgba(15, 23, 42, 0.8);
          color: #f8fafc;
          font-weight: 600;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        tr {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.02);
        }

        /* Signatures */
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
          padding: 0 40px;
        }

        .signature-box {
          text-align: center;
          width: 200px;
        }

        .signature-line {
          border-bottom: 1px dashed #475569;
          margin-bottom: 10px;
          height: 40px;
        }

        .signature-label {
          color: #94a3b8;
          font-size: 14px;
        }

        /* Print Specifics */
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${options.reportTitle}</h1>
          <p>عن الفترة: ${options.period}</p>
        </div>
        <div class="company-info">
          <h2 style="margin:0; font-size:20px; color:#f8fafc;">${options.companyName}</h2>
          <p>${new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>

      <div class="summary-container">
        ${options.summaryItems.map(item => \`
          <div class="summary-card">
            <div class="summary-label">\${item.label}</div>
            <div class="summary-value" style="color: \${item.color || '#38bdf8'}">\${item.value}</div>
          </div>
        \`).join('')}
      </div>

      <table>
        <thead>
          <tr>
            ${options.tableHeaders.map(header => \`<th>\${header}</th>\`).join('')}
          </tr>
        </thead>
        <tbody>
          ${options.tableData.map(row => \`
            <tr>
              \${row.map((cell, i) => \`<td style="\${getStatusStyle(String(cell), i)}">\${cell}</td>\`).join('')}
            </tr>
          \`).join('')}
        </tbody>
      </table>

      ${options.signatures ? \`
        <div class="signatures">
          \${options.signatures.map(sig => \`
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">\${sig}</div>
            </div>
          \`).join('')}
        </div>
      \` : ''}
    </body>
    </html>
    \`;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
