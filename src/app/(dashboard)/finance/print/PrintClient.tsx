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
    <div className="print-container" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif', padding: '20px', backgroundColor: '#fff', color: '#000', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: #fff !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { padding: 0 !important; }
          .no-print { display: none !important; }
          @page { size: landscape; margin: 15mm; }
        }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #f3f4f6 !important; font-weight: bold; color: #111827; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 15px; margin-bottom: 20px; }
        .summary-box { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; flex: 1; text-align: center; background: #f9fafb !important; }
        .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #111827; }
        .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 10px; }
      `}} />

      <div className="header">
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>تقرير رواتب الموظفين</h1>
          <p style={{ margin: '5px 0 0', color: '#4b5563' }}>عن الفترة: {period}</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{companyName}</h2>
          <p style={{ margin: '5px 0 0', color: '#4b5563' }}>{new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>

      <div className="summary-box">
        <div className="stat">
          <div className="stat-label">إجمالي الرواتب المستحقة (الصافي)</div>
          <div className="stat-value">{totalNet.toFixed(2)} ر.س</div>
        </div>
        <div className="stat">
          <div className="stat-label">إجمالي الاستقطاعات</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{totalDeductions.toFixed(2)} ر.س</div>
        </div>
        <div className="stat">
          <div className="stat-label">إجمالي المكافآت والإضافي</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{totalBonuses.toFixed(2)} ر.س</div>
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
              <td style={{ color: '#10b981' }}>{pr.bonus.toFixed(2)}</td>
              <td style={{ color: '#ef4444' }}>{pr.manualDeduction.toFixed(2)}</td>
              <td style={{ color: '#ef4444' }}>{pr.autoDeduction.toFixed(2)}</td>
              <td style={{ fontWeight: 'bold' }}>{pr.netSalary.toFixed(2)}</td>
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
          <div>أعد بواسطة (الموارد البشرية)</div>
        </div>
        <div className="sig-box">
          <div className="sig-line"></div>
          <div>المراجعة والاعتماد (المدير العام)</div>
        </div>
      </div>

      <div className="no-print" style={{ textAlign: 'center', marginTop: '30px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          طباعة التقرير مرة أخرى
        </button>
      </div>
    </div>
  );
}
