"use client";
import { useEffect, useState } from "react";
import { Star, TrendingUp, Calendar, AlertCircle, Plus, CheckCircle, Activity, Target, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";

export default function EvaluationsPage() {
  const [user, setUser] = useState<any>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoEvaluating, setAutoEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    employeeId: "",
    period: currentMonth,
    manualScore: "",
    comments: "",
  });

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      // Check if user is a supervisor
      fetch(`/api/departments`)
        .then(r => r.json())
        .then(depts => {
          const supervised = depts.find((d: any) => d.supervisorId === parsed.id);
          if (supervised) {
            setIsSupervisor(true);
          }
        })
        .catch(() => {});
    }
    fetchEvaluations();
    fetchEmployees();
    fetchSettings();
  }, [selectedPeriod]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanySettings(data);
      }
    } catch(e) {}
  };

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluations?period=${selectedPeriod}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvaluations(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      let data = await res.json();
      if (Array.isArray(data)) {
        // If user is a supervisor, only show employees in their department
        if (isSupervisor && user) {
          // Find the department where user is supervisor
          const deptsRes = await fetch('/api/departments');
          const depts = await deptsRes.json();
          const supervisedDept = depts.find((d: any) => d.supervisorId === user.id);
          if (supervisedDept) {
            data = data.filter((emp: any) => emp.departmentId === supervisedDept.id && emp.id !== user.id);
          }
        }
        setEmployees(data);
      }
    } catch(e) {}
  };

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: parseInt(formData.employeeId),
          period: formData.period,
          manualScore: formData.manualScore ? parseFloat(formData.manualScore) : undefined,
          comments: formData.comments,
          type: "auto"
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ employeeId: "", period: selectedPeriod, manualScore: "", comments: "" });
        fetchEvaluations();
      } else {
        const err = await res.json();
        alert(err.error || "حدث خطأ أثناء حفظ التقييم.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoEvaluateAll = async () => {
    if (!confirm(`هل أنت متأكد من الاحتساب التلقائي لجميع الموظفين لشهر ${selectedPeriod}؟\n(يتم بناء التقييم على الحضور والمهام آلياً)`)) return;
    
    setAutoEvaluating(true);
    setEvalProgress(0);
    
    const evaluatedIds = evaluations.map(ev => ev.employeeId);
    const pendingEmployees = employees.filter(emp => !evaluatedIds.includes(emp.id));
    
    if (pendingEmployees.length === 0) {
      alert("جميع الموظفين تم تقييمهم بالفعل لهذا الشهر!");
      setAutoEvaluating(false);
      return;
    }

    let completed = 0;
    for (const emp of pendingEmployees) {
      try {
        await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: emp.id,
            period: selectedPeriod,
            type: "auto"
          }),
        });
      } catch (e) {}
      completed++;
      setEvalProgress(Math.round((completed / pendingEmployees.length) * 100));
    }
    
    setAutoEvaluating(false);
    fetchEvaluations();
  };

  // KPI Calculations
  const totalEvals = evaluations.length;
  const avgTotalScore = totalEvals > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.totalScore, 0) / totalEvals) : 0;
  const avgAttendanceScore = totalEvals > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.attendanceScore, 0) / totalEvals) : 0;
  const avgTasksScore = totalEvals > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.tasksScore, 0) / totalEvals) : 0;

  // Chart Data Preparation (Performance buckets)
  const buckets = { excellent: 0, good: 0, average: 0, weak: 0 };
  evaluations.forEach(ev => {
    if (ev.totalScore >= 90) buckets.excellent++;
    else if (ev.totalScore >= 75) buckets.good++;
    else if (ev.totalScore >= 50) buckets.average++;
    else buckets.weak++;
  });

  const chartData = [
    { name: 'ممتاز (+90)', count: buckets.excellent, color: '#10b981' },
    { name: 'جيد (+75)', count: buckets.good, color: '#3b82f6' },
    { name: 'متوسط (+50)', count: buckets.average, color: '#f59e0b' },
    { name: 'ضعيف (<50)', count: buckets.weak, color: '#ef4444' },
  ];

  return (
    <>
      {/* --- Screen Dashboard --- */}
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star style={{ color: 'var(--gold-primary)' }} /> لوحة التقييمات والأداء
          </h1>
          <p className="page-subtitle">نظرة شاملة على أداء الشركة والموظفين خلال فترة محددة</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <Calendar size={18} color="var(--gold-primary)" />
            <input 
              type="month" 
              className="form-control" 
              style={{ width: 140, border: 'none', background: 'transparent', padding: 4 }}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={() => window.open(`/api/reports/evaluations?period=${selectedPeriod}&export=pdf`, '_blank')}
            title="تصدير تقرير PDF"
            style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', whiteSpace: 'nowrap', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            <FileText size={18} /> تقرير PDF
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => window.open(`/api/reports/evaluations?period=${selectedPeriod}&export=excel`, '_blank')}
            title="تصدير تقرير Excel"
            style={{ border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', whiteSpace: 'nowrap', background: 'rgba(16, 185, 129, 0.05)' }}
          >
            <FileSpreadsheet size={18} /> تقرير Excel
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={handleAutoEvaluateAll} 
            disabled={autoEvaluating}
            style={{ border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}
          >
            {autoEvaluating ? `جارٍ الاحتساب (${evalProgress}%)` : 'تقييم تلقائي للجميع'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)', whiteSpace: 'nowrap' }}>
            <Plus size={18} /> إضافة تقييم
          </button>
        </div>
      </div>

      {/* Analytics Dashboard (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>متوسط تقييم الشركة</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--gold-primary)' }}>{avgTotalScore}%</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} style={{ color: 'var(--gold-primary)' }} />
          </div>
        </div>
        
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>أداء المهام</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>{avgTasksScore}%</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={24} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>انضباط الحضور</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--info)' }}>{avgAttendanceScore}%</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} style={{ color: 'var(--info)' }} />
          </div>
        </div>
        
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>إجمالي التقييمات</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalEvals}</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(var(--white-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        
        {/* Main Content Area: Data Table */}
        <div className="card glass-panel">
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th style={{ textAlign: 'center' }}>التقييم العام</th>
                    <th>الحضور والانصراف</th>
                    <th>إنجاز المهام</th>
                    <th style={{ textAlign: 'center' }}>إداري</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evalRecord) => (
                    <tr key={evalRecord.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="employee-avatar avatar-sm" style={{ border: '1px solid var(--border)' }}>
                            {evalRecord.employee.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{evalRecord.employee.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{evalRecord.employee.department?.name || 'بدون قسم'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="score-ring" style={{ fontSize: '16px', margin: '0 auto', color: evalRecord.totalScore >= 90 ? 'var(--success)' : evalRecord.totalScore >= 75 ? 'var(--info)' : evalRecord.totalScore >= 50 ? 'var(--warning)' : 'var(--danger)', borderColor: evalRecord.totalScore >= 90 ? 'var(--success)' : evalRecord.totalScore >= 75 ? 'var(--info)' : evalRecord.totalScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                          {evalRecord.totalScore}%
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: '80px', background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${evalRecord.attendanceScore}%`, background: 'var(--info)', height: '100%' }}></div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--info)' }}>{evalRecord.attendanceScore}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: '80px', background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${evalRecord.tasksScore}%`, background: 'var(--success)', height: '100%' }}></div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{evalRecord.tasksScore}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {evalRecord.manualScore !== null ? (
                          <span className="badge badge-warning" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-primary)' }}>{evalRecord.manualScore}%</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {evaluations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state" style={{ padding: '60px' }}>
                        <AlertCircle size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                        لا توجد تقييمات مسجلة لشهر {selectedPeriod}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Side Panel: Company Performance Chart */}
        <div className="card glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--gold-primary)' }} /> تصنيف الأداء العام (Radar)
          </h3>
          
          {totalEvals > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: 'var(--text-muted)' }} />
                  <Radar name="الموظفين" dataKey="count" stroke="var(--gold-primary)" fill="var(--gold-primary)" fillOpacity={0.4} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '13px' }}
                    itemStyle={{ color: 'var(--gold-primary)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              لا تتوفر بيانات
            </div>
          )}
        </div>
      </div>

      {/* Evaluate Employee Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h2>إضافة تقييم لموظف</h2>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                بمجرد اختيار الموظف سيقوم النظام آلياً باحتساب درجاته من واقع سجل الحضور والمهام. يمكنك إضافة تقييم إداري من طرفك للتعديل على التقييم الآلي.
              </p>
              <form onSubmit={handleCreateEvaluation}>
                <div className="form-group">
                  <label className="form-label">الموظف المراد تقييمه</label>
                  <select 
                    className="form-control" 
                    required 
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  >
                    <option value="">-- اختر الموظف --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">شهر التقييم</label>
                  <input 
                    type="month" 
                    className="form-control" 
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">التقييم الإداري / المباشر (من 100) - اختياري</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0" max="100"
                    placeholder="مثال: 85"
                    value={formData.manualScore}
                    onChange={(e) => setFormData({...formData, manualScore: e.target.value})}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    في حال تعبئة التقييم الإداري، سيصبح وزن الحضور (40%)، المهام (40%) والإداري (20%).
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات سرية للتقييم (اختياري)</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={formData.comments}
                    onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  ></textarea>
                </div>

                <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: 0 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'جاري الاحتساب...' : 'حفظ واحتساب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* --- Formal PDF Report (Hidden on Screen, Visible on Print) --- */}
      <div className="print-only-report" dir="rtl">
        <div className="formal-report-header">
          <div>
            <h2 style={{ margin: 0 }}>{companySettings?.name || "شركتي"}</h2>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>إدارة الموارد البشرية</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>عن شهر: <span dir="ltr">{selectedPeriod}</span></div>
          </div>
        </div>

        <div className="formal-report-title">
          التقرير الشهري الشامل لتقييم أداء الموظفين
        </div>

        <div className="formal-report-summary">
          <div>متوسط تقييم الشركة<br/>{avgTotalScore}%</div>
          <div>أداء المهام<br/>{avgTasksScore}%</div>
          <div>انضباط الحضور<br/>{avgAttendanceScore}%</div>
          <div>إجمالي التقييمات<br/>{totalEvals} موظف</div>
        </div>

        <table className="formal-table">
          <thead>
            <tr>
              <th>ت</th>
              <th>اسم الموظف</th>
              <th>القسم</th>
              <th style={{ textAlign: 'center' }}>التقييم العام</th>
              <th style={{ textAlign: 'center' }}>الحضور (40%)</th>
              <th style={{ textAlign: 'center' }}>المهام (40%)</th>
              <th style={{ textAlign: 'center' }}>إداري (20%)</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evalRecord, idx) => (
              <tr key={evalRecord.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{evalRecord.employee.name}</td>
                <td>{evalRecord.employee.department?.name || '-'}</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{evalRecord.totalScore}%</td>
                <td style={{ textAlign: 'center' }}>{evalRecord.attendanceScore}%</td>
                <td style={{ textAlign: 'center' }}>{evalRecord.tasksScore}%</td>
                <td style={{ textAlign: 'center' }}>{evalRecord.manualScore !== null ? `${evalRecord.manualScore}%` : '-'}</td>
              </tr>
            ))}
            {evaluations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>لا توجد تقييمات مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="signatures-area">
          <div className="signature-box">
            مدير الموارد البشرية
            <div className="signature-line">التوقيع</div>
          </div>
          <div className="signature-box">
            الختم الرسمي
            <div className="signature-line" style={{ borderTop: 'none' }}></div>
          </div>
          <div className="signature-box">
            المدير العام
            <div className="signature-line">التوقيع</div>
          </div>
        </div>
      </div>
    </>
  );
}
