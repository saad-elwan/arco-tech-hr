"use client";

import React, { useEffect } from 'react';

interface PrintClientProps {
  payrolls: any[];
  period: string;
  companyName: string;
  totalNet: number;
  totalDeductions: number;
  totalBonuses: number;
}

export default function PrintClient({ payrolls, period, companyName, totalNet, totalDeductions, totalBonuses }: PrintClientProps) {
  useEffect(() => {
    // Give it a tiny delay to ensure fonts load, then print
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          font-family: Arial, Tahoma, sans-serif !important; 
          direction: rtl !important; 
          background-color: #ffffff !important; 
          color: #000000 !important; 
          padding: 0 !important;
          margin: 0 !important;
          width: 100%;
        }
        
        .content-container {
          padding: 20px;
        }

        .header { 
          background-color: #1a365d !important; 
          padding: 30px 20px; 
          text-align: center; 
          width: 100%;
          margin-bottom: 40px !important; /* Space between header and data */
        }
        .header h1 { color: #ffffff !important; font-size: 28px; margin-bottom: 10px; font-weight: bold; }
        .header p { color: #c9a227 !important; font-size: 18px; font-weight: bold; }
        
        .info { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 15px; color: #000000 !important; font-weight: bold; }
        
        .summary-box { display: flex; gap: 15px; margin-bottom: 30px; }
        .stat { border: 1px solid #ccc !important; padding: 15px; border-radius: 6px; flex: 1; text-align: center; background-color: #ffffff !important; }
        .stat-label { font-size: 13px; color: #333333 !important; margin-bottom: 8px; font-weight: bold; }
        .stat-value { font-size: 18px; font-weight: bold; color: #000000 !important; }
        
        table { width: 100%; border-collapse: collapse; direction: rtl; margin-bottom: 30px; }
        th { background-color: #1a365d !important; color: #ffffff !important; padding: 12px; border: 1px solid #000000 !important; font-size: 13px; text-align: center; font-weight: bold; }
        td { border: 1px solid #000000 !important; padding: 10px; text-align: center; font-size: 13px; color: #000000 !important; background-color: #ffffff !important; font-weight: bold; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 13px; color: #333333 !important; border-top: 1px solid #000000 !important; padding-top: 15px; font-weight: bold; }
        
        .signatures { display: flex; justify-content: space-around; margin-top: 60px; margin-bottom: 20px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1px dashed #000000 !important; height: 30px; margin-bottom: 15px; }
        .sig-text { font-size: 14px; color: #000000 !important; font-weight: bold; }
        
        @page {
          size: A4 landscape;
          margin: 10mm 0;
        }
        
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .header { margin-top: -10mm !important; } /* Pull header up to edge of paper */
        }
      `}} />

      <div className="header">
        <h1>{companyName}</h1>
        <p>تقرير الرواتب المجمع</p>
      </div>
      
      <div className="content-container">
      
      <div className="info">
        <span>تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</span>
        <span>الفترة: {period}</span>
      </div>

      <div className="summary-box">
        <div className="stat">
          <div className="stat-label">إجمالي الرواتب المستحقة (الصافي)</div>
          <div className="stat-value">{totalNet.toFixed(2)} ج.م</div>
        </div>
        <div className="stat">
          <div className="stat-label">إجمالي الاستقطاعات</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{totalDeductions.toFixed(2)} ج.م</div>
        </div>
        <div className="stat">
          <div className="stat-label">إجمالي المكافآت والإضافي</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{totalBonuses.toFixed(2)} ج.م</div>
        </div>
        <div className="stat">
          <div className="stat-label">عدد الموظفين</div>
          <div className="stat-value">{payrolls.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>اسم الموظف</th>
            <th>الأساسي</th>
            <th>الغياب (أيام)</th>
            <th>التأخير (أيام)</th>
            <th>مكافآت</th>
            <th>خصم إداري</th>
            <th>خصم غياب</th>
            <th>الصافي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {payrolls.map((pr, index) => (
            <tr key={pr.id}>
              <td>{index + 1}</td>
              <td style={{ fontWeight: 'bold' }}>{pr.employee?.name || "غير محدد"}</td>
              <td>{pr.basicSalary.toFixed(2)}</td>
              <td>{pr.absentDays}</td>
              <td>{pr.lateDays}</td>
              <td style={{ color: '#10b981', fontWeight: 'bold' }}>{pr.bonus.toFixed(2)}</td>
              <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{pr.manualDeduction.toFixed(2)}</td>
              <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{pr.autoDeduction.toFixed(2)}</td>
              <td style={{ fontWeight: 'bold', color: '#1a365d' }}>{pr.netSalary.toFixed(2)}</td>
              <td style={{ 
                color: pr.status === 'paid' ? '#10b981' : '#f59e0b',
                fontWeight: 'bold'
              }}>
                {pr.status === 'paid' ? 'تم الصرف' : 'استحقاق'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="signatures">
        <div className="sig-box">
          <div className="sig-line"></div>
          <div className="sig-text">أعد بواسطة (الموارد البشرية)</div>
        </div>
        <div className="sig-box">
          <div className="sig-line"></div>
          <div className="sig-text">المراجعة والاعتماد (المدير العام)</div>
        </div>
      </div>

      <div className="footer">
        تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية | {new Date().toLocaleString("ar-EG")}
      </div>
      </div>

      <div className="no-print" style={{ textAlign: 'center', marginTop: '30px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#1a365d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          طباعة التقرير مرة أخرى
        </button>
      </div>
    </>
  );
}
