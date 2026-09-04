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
        body { font-family: Arial, Tahoma, sans-serif; direction: rtl; padding: 40px; background: white; color: #333; }
        .header { background: #1a365d; padding: 30px; margin: -40px -40px 30px -40px; text-align: center; }
        .header h1 { color: white; font-size: 28px; margin-bottom: 10px; }
        .header p { color: #c9a227; font-size: 16px; }
        
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; color: #666; margin-top: 20px; }
        
        .summary-box { display: flex; gap: 20px; margin-bottom: 30px; }
        .stat { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; text-align: center; background: #f9fafb; }
        .stat-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #1a365d; }
        
        table { width: 100%; border-collapse: collapse; direction: rtl; }
        th { background: #1a365d; color: white; padding: 12px; border: 1px solid #333; font-size: 13px; text-align: center; }
        td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 13px; color: #333; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
        
        .signatures { display: flex; justify-content: space-around; margin-top: 50px; margin-bottom: 20px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1px dashed #999; height: 40px; margin-bottom: 10px; }
        
        @media print { 
          body { padding: 20px; } 
          .no-print { display: none !important; }
        }
      `}} />

      <div className="header">
        <h1>{companyName}</h1>
        <p>تقرير الرواتب المجمع</p>
      </div>
      
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
          <div style={{ fontSize: '13px', color: '#666' }}>أعد بواسطة (الموارد البشرية)</div>
        </div>
        <div className="sig-box">
          <div className="sig-line"></div>
          <div style={{ fontSize: '13px', color: '#666' }}>المراجعة والاعتماد (المدير العام)</div>
        </div>
      </div>

      <div className="footer">
        تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية | {new Date().toLocaleString("ar-EG")}
      </div>

      <div className="no-print" style={{ textAlign: 'center', marginTop: '30px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#1a365d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          طباعة التقرير مرة أخرى
        </button>
      </div>
    </>
  );
}
