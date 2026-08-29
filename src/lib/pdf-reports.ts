import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

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

function generateReportHTML(options: FormalReportOptions): string {
  const sigItems = options.signatures || ["مدير الموارد البشرية", "المدير المالي", "الختم الرسمي", "المدير العام"];
  
  const summaryHTML = options.summaryItems.map(item => `
    <div style="flex: 1; text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 8px; background: #fafafa; margin: 0 5px;">
      <div style="font-size: 20px; font-weight: bold; color: ${item.color || '#000'};">${item.value}</div>
      <div style="font-size: 12px; color: #666; margin-top: 5px;">${item.label}</div>
    </div>
  `).join('');

  const headerHTML = options.tableHeaders.map((h, i) => {
    const width = options.tableColWidths[i];
    return `<th style="width: ${width}px; padding: 10px; text-align: ${width <= 50 ? 'center' : 'right'}; background: #f0f0f0; border: 1px solid #000; font-weight: bold; font-size: 13px;">${h}</th>`;
  }).join('');

  const rowsHTML = options.tableData.map((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? '#fafafa' : '#fff';
    const cellsHTML = row.map((cell, i) => {
      const width = options.tableColWidths[i];
      let textColor = '#000';
      let content = String(cell);
      let fontWeight = 'normal';
      
      if (options.statusColumnIndex !== undefined && i === options.statusColumnIndex) {
        const statusKey = String(cell);
        textColor = options.statusColors?.[statusKey] || '#000';
        content = options.statusLabels?.[statusKey] || statusKey;
        fontWeight = 'bold';
      } else if (i === 1) {
        fontWeight = 'bold';
      }
      
      return `<td style="width: ${width}px; padding: 8px; text-align: ${width <= 50 ? 'center' : 'right'}; border: 1px solid #000; color: ${textColor}; font-weight: ${fontWeight}; font-size: 12px;">${content}</td>`;
    }).join('');
    return `<tr style="background: ${bgColor}">${cellsHTML}</tr>`;
  }).join('');

  const signaturesHTML = sigItems.map(item => `
    <div style="flex: 1; text-align: center; padding: 15px;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 40px;">${item}</div>
      <div style="border-top: 1px dashed #000; padding-top: 5px;"></div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Tajawal', 'Cairo', 'Tahoma', Arial, sans-serif; 
          padding: 40px;
          direction: rtl;
          background: #fff;
          color: #000;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #000;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }
        .company-info h2 { font-size: 22px; margin-bottom: 5px; }
        .company-info div { font-size: 13px; color: #666; }
        .date-info { text-align: left; font-size: 13px; line-height: 1.8; }
        .title {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 25px;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          gap: 10px;
          margin-bottom: 25px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 40px;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #999;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h2>${options.companyName}</h2>
          ${options.departmentName ? `<div>${options.departmentName}</div>` : ''}
        </div>
        <div class="date-info">
          <div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div>
          <div>مسير شهر: ${options.period}</div>
        </div>
      </div>
      
      <div class="title">${options.reportTitle}</div>
      
      <div class="summary">
        ${summaryHTML}
      </div>
      
      <table>
        <thead>
          <tr>${headerHTML}</tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
      
      <div class="signatures">
        ${signaturesHTML}
      </div>
      
      <div class="footer">
        تم إنشاء التقرير في ${new Date().toLocaleString('ar-EG')} | Arco Tech
      </div>
    </body>
    </html>
  `;
}

export async function generateFormalReportPDF(options: FormalReportOptions): Promise<Buffer> {
  const html = generateReportHTML(options);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
  });
  
  await browser.close();
  
  return Buffer.from(pdfBuffer);
}