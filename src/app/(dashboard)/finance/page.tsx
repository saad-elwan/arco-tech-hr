"use client";
import { useEffect, useState } from "react";
import { Banknote, Calculator, Search, TrendingDown, TrendingUp, Edit2, AlertCircle, Download, PieChart as PieIcon, BarChart2, Activity, Users, Save, UserCog, CheckCircle2, XCircle, Wallet, ArrowDownLeft, ArrowUpRight, Plus, Minus, History, ShieldAlert, FileText, FileSpreadsheet } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function FinancePage() {
  return (
    <ErrorBoundary>
      <FinanceContent />
    </ErrorBoundary>
  );
}

function FinanceContent() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'payroll' | 'manual' | 'treasury'>('payroll');

  // Modal logic
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [formData, setFormData] = useState({ basicSalary: "", bonus: 0, manualDeduction: 0, notes: "", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Manual tab state
  const [employees, setEmployees] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [manualEdits, setManualEdits] = useState<Record<string, { basicSalary: string; bonus: string; deduction: string; notes: string }>>({});
  const [savingEmp, setSavingEmp] = useState<Record<string, boolean>>({});
  const [savedEmp, setSavedEmp] = useState<Record<string, boolean>>({});
  const [empSearch, setEmpSearch] = useState("");

  // Treasury State
  const [treasury, setTreasury] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
  const [treasuryActionType, setTreasuryActionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [treasuryDesc, setTreasuryDesc] = useState('');
  const [treasurySaving, setTreasurySaving] = useState(false);
  const [treasuryMsg, setTreasuryMsg] = useState({ error: '', success: '' });

  useEffect(() => {
    fetchPayrolls();
    fetch('/api/settings').then(r => r.json()).then(setCompanySettings).catch(()=>{});
  }, [selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'manual') fetchEmployeesForManual();
    if (activeTab === 'treasury') fetchTreasury();
  }, [activeTab, selectedPeriod]);

  const fetchTreasury = async () => {
    setTreasuryLoading(true);
    try {
      const res = await fetch('/api/treasury');
      if (res.ok) {
        const data = await res.json();
        setTreasury(data.treasury);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTreasuryLoading(false);
    }
  };

  const handleTreasuryAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTreasurySaving(true);
    setTreasuryMsg({ error: '', success: '' });
    try {
      const res = await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: treasuryActionType,
          amount: parseFloat(treasuryAmount),
          description: treasuryDesc
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setTreasuryMsg({ error: data.error || 'حدث خطأ في العملية', success: '' });
        return;
      }
      setTreasury(data.treasury);
      setTreasuryMsg({ error: '', success: 'تم تسجيل الحركة المالية وتحديث رصيد الخزينة بنجاح' });
      setTreasuryAmount('');
      setTreasuryDesc('');
      fetchTreasury();
      setTimeout(() => {
        setIsTreasuryModalOpen(false);
        setTreasuryMsg({ error: '', success: '' });
      }, 1500);
    } catch {
      setTreasuryMsg({ error: 'تعذر الاتصال بالخادم', success: '' });
    } finally {
      setTreasurySaving(false);
    }
  };

  const fetchEmployeesForManual = async () => {
    setEmpLoading(true);
    try {
      const [empRes, payRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/payroll?period=${selectedPeriod}`)
      ]);
      const emps = await empRes.json();
      const pays = payRes.ok ? await payRes.json() : [];
      const payMap: Record<string, any> = {};
      if (Array.isArray(pays)) pays.forEach((p: any) => { payMap[p.employeeId] = p; });
      if (Array.isArray(emps)) {
        setEmployees(emps);
        const edits: Record<string, any> = {};
        emps.forEach((emp: any) => {
          const pay = payMap[emp.id];
          edits[emp.id] = {
            basicSalary: String(emp.basicSalary || ''),
            bonus: String(pay?.bonus || '0'),
            deduction: String(pay?.manualDeduction || '0'),
            notes: pay?.notes || ''
          };
        });
        setManualEdits(edits);
      }
    } catch(err) { console.error(err); }
    finally { setEmpLoading(false); }
  };

  const handleSaveEmployee = async (emp: any) => {
    const edit = manualEdits[emp.id];
    if (!edit) return;
    setSavingEmp(prev => ({ ...prev, [emp.id]: true }));
    try {
      // 1. Update basicSalary on the Employee model
      await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basicSalary: parseFloat(edit.basicSalary) || 0 })
      });
      // 2. Upsert Payroll record for this period with manual bonus/deduction
      await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          period: selectedPeriod,
          basicSalary: parseFloat(edit.basicSalary) || 0,
          bonus: parseFloat(edit.bonus) || 0,
          manualDeduction: parseFloat(edit.deduction) || 0,
          notes: edit.notes
        })
      });
      fetchPayrolls(); // Refresh the main payrolls data in the background
      setSavedEmp(prev => ({ ...prev, [emp.id]: true }));
      setTimeout(() => setSavedEmp(prev => ({ ...prev, [emp.id]: false })), 2500);
    } catch(err) { console.error(err); }
    finally { setSavingEmp(prev => ({ ...prev, [emp.id]: false })); }
  };

  const updateEdit = (empId: string, field: string, value: string) => {
    setManualEdits(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
    setSavedEmp(prev => ({ ...prev, [empId]: false }));
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Unauthorized");
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert("غير مصرح لك بتنزيل هذا الملف أو حدث خطأ");
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?period=${selectedPeriod}`);
      const data = await res.json();
      if (Array.isArray(data)) setPayrolls(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAll = async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: selectedPeriod }),
      });
      if (res.ok) fetchPayrolls();
    } catch(err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const openEditModal = (payroll: any) => {
    setSelectedPayroll(payroll);
    setFormData({
      basicSalary: payroll.basicSalary || "",
      bonus: payroll.bonus || 0,
      manualDeduction: payroll.manualDeduction || 0,
      notes: payroll.notes || "",
      status: payroll.status || "draft"
    });
    setIsModalOpen(true);
  };

  const handleSaveAdjustment = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPayroll.id,
          basicSalary: formData.basicSalary,
          bonus: formData.bonus,
          manualDeduction: formData.manualDeduction,
          notes: formData.notes,
          status: formData.status
        }),
      });
      if(res.ok) {
        setIsModalOpen(false);
        fetchPayrolls();
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = payrolls.filter(p => !search || p.employee?.name.includes(search));
  
  const totalNetSalaries = payrolls.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);
  const totalBonuses = payrolls.reduce((acc, curr) => acc + (curr.bonus || 0), 0);
  const totalDeductions = payrolls.reduce((acc, curr) => acc + (curr.autoDeduction || 0) + (curr.manualDeduction || 0), 0);

  // --- Enterprise Analytics Computations ---
  
  // 1. Department Cost Distribution
  const deptCosts: Record<string, number> = {};
  payrolls.forEach(p => {
    const deptName = p.employee?.department?.name || "أخرى";
    deptCosts[deptName] = (deptCosts[deptName] || 0) + (p.netSalary || 0);
  });
  const pieData = Object.keys(deptCosts).map(key => ({
    name: key,
    value: deptCosts[key]
  })).sort((a,b) => b.value - a.value);

  const COLORS = ['url(#goldGrad)', 'url(#goldGrad2)', 'url(#goldGrad3)', '#b38b22', '#6b5314'];

  // 2. Exception Identifiers
  const topBonuses = [...payrolls].sort((a,b) => (b.bonus||0) - (a.bonus||0)).slice(0, 5).map(p => ({
    name: p.employee?.name || "استثناء",
    value: p.bonus
  })).filter(p => p.value > 0);

  const topDeductions = [...payrolls].sort((a,b) => ((b.autoDeduction||0) + (b.manualDeduction||0)) - ((a.autoDeduction||0) + (a.manualDeduction||0))).slice(0, 5).map(p => ({
    name: p.employee?.name || "استثناء",
    value: (p.autoDeduction||0) + (p.manualDeduction||0)
  })).filter(p => p.value > 0);

  // 3. Salary Overall Structure Mapping
  const totalBasic = payrolls.reduce((sum, p) => sum + (p.basicSalary||0), 0);
  const structureData = [
    { name: 'إجمالي الخصومات', value: totalDeductions, fill: 'url(#redGradBar)' }, 
    { name: 'الراتب الأساسي', value: totalBasic, fill: 'url(#blueGrad)' }, 
    { name: 'إجمالي المكافآت', value: totalBonuses, fill: 'url(#greenGrad)' }, 
    { name: 'صافي الصرف', value: totalNetSalaries, fill: 'url(#goldGradBar)' }, 
  ];

  return (
    <>
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="page-title-icon" style={{ color: "var(--gold-primary)" }}><Banknote size={24} /></span> 
            الماليات ومسيّر الرواتب
          </h1>
          <p className="page-subtitle">إدارة رواتب الموظفين، الحسابات التلقائية للغياب، وإضافة المكافآت أو الخصومات</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="search-input-wrapper" style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", padding: "8px 16px" }}>
            <input 
              type="month" 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
            />
          </div>
          <button className="btn btn-ghost" onClick={() => handleDownload(`/api/reports/payroll?period=${selectedPeriod}&export=pdf`, `payroll_${selectedPeriod}.pdf`)} title="تصدير تقرير PDF" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', whiteSpace: 'nowrap', background: 'rgba(239, 68, 68, 0.05)' }}>
            <FileText size={18} /> تقرير PDF
          </button>
          <button className="btn btn-ghost" onClick={() => handleDownload(`/api/reports/payroll?period=${selectedPeriod}&export=excel`, `payroll_${selectedPeriod}.csv`)} title="تصدير تقرير Excel" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', whiteSpace: 'nowrap', background: 'rgba(16, 185, 129, 0.05)' }}>
            <FileSpreadsheet size={18} /> تقرير Excel
          </button>
          {activeTab === 'payroll' && (
            <button 
              className="btn btn-primary" 
              onClick={handleCalculateAll} 
              disabled={calculating}
              style={{ boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)', whiteSpace: 'nowrap' }}
            >
              <Calculator size={18} /> {calculating ? "جاري احتساب الرواتب..." : "حساب رواتب الشهر تلقائياً"}
            </button>
          )}
        </div>
      </div>

      {/* --- Tab Toggle --- */}
      <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(var(--white-rgb),0.04)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', flexWrap: 'wrap', boxSizing: 'border-box' }} className="tabs hide-on-print">
        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, gap: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
            background: activeTab === 'payroll' ? 'linear-gradient(135deg, #d4af37, #b38b22)' : 'transparent',
            color: activeTab === 'payroll' ? '#000' : 'var(--text-muted)',
            boxShadow: activeTab === 'payroll' ? '0 2px 12px rgba(212,175,55,0.4)' : 'none'
          }}
        >
          <Calculator size={15} /> مسيّر الرواتب
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '9px 16px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, gap: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
            background: activeTab === 'manual' ? 'rgba(96,165,250,0.15)' : 'transparent',
            color: activeTab === 'manual' ? '#60a5fa' : 'var(--text-muted)',
            border: activeTab === 'manual' ? '1px solid rgba(96,165,250,0.3)' : '1px solid transparent'
          }}
        >
          <UserCog size={15} /> رواتب يدوياً
        </button>
        <button
          onClick={() => setActiveTab('treasury')}
          style={{
            padding: '9px 16px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, gap: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
            background: activeTab === 'treasury' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'treasury' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'treasury' ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent',
            boxShadow: activeTab === 'treasury' ? '0 2px 12px rgba(16,185,129,0.3)' : 'none'
          }}
        >
          <Wallet size={15} /> الخزينة
        </button>
      </div>

      {/* ===== TAB: AUTO PAYROLL ===== */}
      {activeTab === 'payroll' && (<>
      {/* Stats Board - Premium Design */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "24px"
      }}>
        {/* Net Salaries Card */}
        <div className="card" style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.02) 100%)", 
          border: "1px solid rgba(212,175,55,0.3)",
          boxShadow: "0 8px 32px rgba(212,175,55,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(212,175,55,0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                إجمالي الرواتب الصافية
              </div>
              <div style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "900", color: "var(--gold-primary)", letterSpacing: "0.5px", textShadow: "0 2px 10px rgba(212,175,55,0.2)" }}>
                {totalNetSalaries.toLocaleString('ar-EG')} <span style={{ fontSize: '16px', fontWeight: "600", opacity: 0.8 }}>ج.م</span>
              </div>
            </div>
            <div style={{ 
              background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))", 
              color: "var(--gold-primary)", width: "50px", height: "50px", borderRadius: "14px",
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(212,175,55,0.3)"
            }}>
              <Banknote size={28} />
            </div>
          </div>
        </div>

        {/* Bonuses Card */}
        <div className="card" style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.02) 100%)", 
          border: "1px solid rgba(16,185,129,0.3)",
          boxShadow: "0 8px 32px rgba(16,185,129,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(16,185,129,0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>إجمالي المكافآت</div>
              <div style={{ fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: "800", color: "var(--success)" }}>
                {totalBonuses.toLocaleString('ar-EG')} <span style={{ fontSize: '14px', opacity: 0.8 }}>ج.م</span>
              </div>
            </div>
            <div style={{ 
              background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", width: "46px", height: "46px", borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16,185,129,0.2)"
            }}>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Deductions Card */}
        <div className="card" style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.02) 100%)", 
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "0 8px 32px rgba(239,68,68,0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(239,68,68,0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>إجمالي الخصومات (حضور/إداري)</div>
              <div style={{ fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: "800", color: "var(--danger)" }}>
                {totalDeductions.toLocaleString('ar-EG')} <span style={{ fontSize: '14px', opacity: 0.8 }}>ج.م</span>
              </div>
            </div>
            <div style={{ 
              background: "rgba(239,68,68,0.15)", color: "var(--danger)", width: "46px", height: "46px", borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.2)"
            }}>
              <TrendingDown size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Analytics Charts */}
      {payrolls.length > 0 && (
        <div className="hide-on-print">
          {/* Analytics Section Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '16px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(212,175,55,0.05)'
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'40px', height:'40px', borderRadius:'10px', background:'rgba(212,175,55,0.2)', color:'var(--gold-primary)' }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', letterSpacing:'0.5px' }}>لوحة التحليلات المالية</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>بيانات حية بناءً على مسير شهر {selectedPeriod}</div>
            </div>
            <div style={{ marginRight: 'auto', display:'flex', gap:'8px' }}>
              <span style={{ padding:'6px 14px', borderRadius:'20px', background:'rgba(212,175,55,0.15)', color:'var(--gold-primary)', fontSize:'12px', fontWeight:700, border:'1px solid rgba(212,175,55,0.3)' }}>
                {payrolls.length} موظف
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Department Pie Chart */}
          <div className="card" style={{
            background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 1) 0%, rgba(var(--bg-card-rgb), 0.6) 100%)',
            borderRadius: '20px',
            border: '1px solid var(--border-gold)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glow accent */}
            <div style={{ position:'absolute', top:"-20px", right:"-20px", width:'100px', height:'100px', background:'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)', pointerEvents:'none', filter: 'blur(15px)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'10px', background:'rgba(212,175,55,0.15)', color:'var(--gold-primary)', flexShrink:0 }}>
                <PieIcon size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>توزيع التكلفة على الأقسام</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop:'2px' }}>Cost Center Distribution</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5d568" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#b38b22" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="goldGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.85}/>
                      <stop offset="100%" stopColor="#907218" stopOpacity={0.85}/>
                    </linearGradient>
                    <linearGradient id="goldGrad3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f2df9a" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#6b5314" stopOpacity={0.9}/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={6} dataKey="value" stroke="rgba(var(--bg-card-rgb),1)" strokeWidth={3}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'الصافي']}
                    contentStyle={{ background: 'rgba(var(--bg-card-rgb), 0.95)', backdropFilter:'blur(16px)', border:'1px solid var(--border-gold)', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.1)', color:'var(--text-primary)', fontSize:'13px', padding:'12px 16px' }}
                    itemStyle={{ color: 'var(--text-primary)', fontWeight: 800 }}
                    labelStyle={{ color: 'var(--gold-primary)', fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Deductions */}
          <div className="card" style={{
            background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 1) 0%, rgba(var(--bg-card-rgb), 0.6) 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(239,68,68,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position:'absolute', top:"-20px", left:"-20px", width:'100px', height:'100px', background:'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)', pointerEvents:'none', filter: 'blur(15px)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'10px', background:'rgba(239,68,68,0.15)', color:'var(--danger)', flexShrink:0 }}>
                <TrendingDown size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>أعلى 5 استقطاعات</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop:'2px' }}>Top Deductions This Month</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDeductions} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.1)" />
                  <XAxis type="number" stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={85} stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(239,68,68,0.05)' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'إجمالي الخصم']}
                    contentStyle={{ background:'rgba(var(--bg-card-rgb), 0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.1)', color:'var(--text-primary)', fontSize:'13px', padding:'12px 16px' }}
                    itemStyle={{ color: 'var(--danger)', fontWeight: 800 }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <Bar dataKey="value" fill="url(#redGrad)" radius={[0, 8, 8, 0]} barSize={22} name="الخصم" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Total Financial Structure */}
          <div className="card" style={{
            background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 1) 0%, rgba(var(--bg-card-rgb), 0.6) 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(59,130,246,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position:'absolute', bottom:"-20px", right:"-20px", width:'120px', height:'120px', background:'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents:'none', filter: 'blur(20px)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px', position: 'relative', zIndex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'10px', background:'rgba(59,130,246,0.15)', color:'var(--info)', flexShrink:0 }}>
                <BarChart2 size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>هيكل الحركات المالية</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop:'2px' }}>Financial Structure Overview</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={structureData} barGap={8}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="goldGradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#f5d568" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="redGradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                  <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'القيمة']}
                    contentStyle={{ background:'rgba(var(--bg-card-rgb), 0.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.1)', color:'var(--text-primary)', fontSize:'13px', padding:'12px 16px' }}
                    itemStyle={{ color: 'var(--text-primary)', fontWeight: 800 }}
                    labelStyle={{ color: 'var(--info)', fontWeight: 700, marginBottom:'4px' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={45} maxBarSize={55}>
                    {structureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          </div>
        </div>
      )}

      <div className="card" style={{ 
        padding: "0", 
        borderRadius: "20px",
        border: "1px solid var(--border-gold)",
        background: "linear-gradient(180deg, rgba(var(--bg-card-rgb), 1) 0%, rgba(var(--bg-card-rgb), 0.6) 100%)",
        overflow: "hidden"
      }}>
        <div style={{ 
          display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", 
          padding: "20px", borderBottom: "1px solid rgba(212,175,55,0.15)",
          background: "rgba(212,175,55,0.03)", gap: "16px"
        }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: "700" }}>
            <div style={{ background: "rgba(212,175,55,0.1)", padding: "8px", borderRadius: "10px", color: "var(--gold-primary)" }}>
              <Calculator size={20} />
            </div>
            تفاصيل مسيّر الرواتب
          </h3>
          
          <div className="search-input-wrapper" style={{ flex: "1", maxWidth: "400px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", alignItems: "center", padding: "10px 16px" }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="ابحث عن موظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", width: "100%", paddingRight: "10px", fontSize: "14px" }}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><div className="spinner"></div></div>
          ) : payrolls.length === 0 ? (
            <div className="empty-state" style={{ padding: "80px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ marginBottom: "16px", color: "var(--gold-dark)", opacity: 0.5 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                  <AlertCircle size={40} />
                </div>
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "18px" }}>لم يتم احتساب الرواتب بعد</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>اضغط على زر (حساب رواتب الشهر تلقائياً) للبدء في استخراج المسير المالي.</p>
            </div>
          ) : (
            <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap" }}>اسـم المـوظف</th>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap" }}>الراتب الأساسي</th>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap" }}>ساعات الحضور</th>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap" }}>ساعات التأخير</th>
                  <th style={{ padding: "16px", color: 'var(--danger)', fontSize: "13px", whiteSpace: "nowrap" }}>خصم غياب/تأخير</th>
                  <th style={{ padding: "16px", color: 'var(--danger)', fontSize: "13px", whiteSpace: "nowrap" }}>خصم إداري</th>
                  <th style={{ padding: "16px", color: 'var(--success)', fontSize: "13px", whiteSpace: "nowrap" }}>مكافآت</th>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap" }}>صافي راتب شهر {selectedPeriod.split('-').reverse().join('-')}</th>
                  <th style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "13px", whiteSpace: "nowrap", textAlign: "center" }}>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pr) => (
                  <tr key={pr.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background='rgba(212,175,55,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{pr.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', background: "rgba(255,255,255,0.05)", display: "inline-block", padding: "2px 8px", borderRadius: "4px" }}>
                        {pr.employee?.department?.name || "---"}
                      </div>
                    </td>
                    <td style={{ padding: "16px", fontWeight: "700", color: "var(--gold-primary)", fontSize: "15px" }}>
                      {pr.employee?.basicSalary || pr.basicSalary} <span style={{fontSize:'11px', opacity:0.7}}>ج.م</span>
                    </td>
                    <td style={{ padding: "16px", color: 'var(--info)', fontWeight: "700", fontSize: "15px" }}>
                      {pr.attendedHours || 0} <span style={{fontSize:'12px', color:'var(--text-muted)', fontWeight: "normal"}}>س</span>
                    </td>
                    <td style={{ padding: "16px", color: 'var(--warning)', fontWeight: "700", fontSize: "15px" }}>
                      {pr.lateHours || 0} <span style={{fontSize:'12px', color:'var(--text-muted)', fontWeight: "normal"}}>س</span>
                    </td>
                    <td style={{ padding: "16px", color: 'var(--danger)', fontWeight: "700", fontSize: "15px" }}>
                      <div>-{pr.autoDeduction.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: "normal" }}>({pr.absentDays} أيام غياب)</div>
                    </td>
                    <td style={{ padding: "16px", color: 'var(--danger)', fontWeight: "700", fontSize: "15px" }}>-{pr.manualDeduction.toFixed(2)}</td>
                    <td style={{ padding: "16px", color: 'var(--success)', fontWeight: "700", fontSize: "15px" }}>+{pr.bonus.toFixed(2)}</td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ 
                        background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
                        border: "1px solid rgba(212,175,55,0.3)",
                        color: "var(--gold-primary)",
                        padding: "8px 14px", borderRadius: "10px", fontSize: "15px", fontWeight: "800", display: "inline-block"
                      }}>
                        {pr.netSalary.toFixed(2)} ج.م
                      </div>
                      <div style={{ fontSize: '11px', textAlign: 'center', marginTop: '6px', color: pr.status==='paid'?'var(--success)':'var(--text-muted)', fontWeight: "600" }}>
                        {pr.status === 'paid' ? '✅ تم الصرف' : '⏳ استحقاق'}
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(pr)} style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "var(--text-primary)" }}>
                        <Edit2 size={14} /> تسوية
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>)}

      {/* ===== TAB: MANUAL ADJUSTMENTS ===== */}
      {activeTab === 'manual' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', color: 'var(--gold-primary)', margin: '0 0 4px 0' }}>إدارة الرواتب الأساسية والتسويات</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>تحديد الراتب الأساسي وإضافة مكافآت أو خصومات يدوية عن شهر <strong style={{ color: '#fff' }}>{selectedPeriod}</strong></p>
            </div>
            <div className="search-input-wrapper" style={{ width: "300px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", padding: "8px 16px" }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="ابحث عن موظف..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", width: "100%", paddingRight: "10px" }}
              />
            </div>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            {empLoading ? (
              <div className="loading-spinner" style={{ padding: '40px' }}><div className="spinner"></div></div>
            ) : employees.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد موظفين مسجلين.</div>
            ) : (
              <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: 'rgba(var(--white-rgb),0.02)' }}>
                    <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", width: '25%' }}>الموظف</th>
                    <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", width: '20%' }}>الراتب الأساسي (يُحفظ دائماً)</th>
                    <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", width: '20%' }}>مكافأة الشهر</th>
                    <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", width: '20%' }}>خصم يدوي الشهر</th>
                    <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", width: '15%' }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(e => !empSearch || e.name.includes(empSearch)).map((emp) => {
                    const edit = manualEdits[emp.id] || { basicSalary: '', bonus: '', deduction: '', notes: '' };
                    const isSaving = savingEmp[emp.id];
                    const isSaved = savedEmp[emp.id];
                    
                    return (
                      <tr key={emp.id} style={{ borderBottom: "1px solid rgba(var(--white-rgb),0.03)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.department?.name || "بدون قسم"}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(var(--black-rgb),0.2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                            <input 
                              type="number"
                              value={edit.basicSalary}
                              onChange={e => updateEdit(emp.id, 'basicSalary', e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                              placeholder="0"
                            />
                            <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '12px' }}>ج.م</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <input 
                              type="number"
                              value={edit.bonus}
                              onChange={e => updateEdit(emp.id, 'bonus', e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--success)', outline: 'none' }}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <input 
                              type="number"
                              value={edit.deduction}
                              onChange={e => updateEdit(emp.id, 'deduction', e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--danger)', outline: 'none' }}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button 
                            onClick={() => handleSaveEmployee(emp)}
                            disabled={isSaving}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: '6px', 
                              padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                              background: isSaved ? 'rgba(16, 185, 129, 0.15)' : 'var(--gold-primary)',
                              color: isSaved ? 'var(--success)' : '#000',
                              fontWeight: 600, fontSize: '13px', transition: '0.2s', width: '100%', justifyContent: 'center'
                            }}
                          >
                            {isSaving ? <div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#000' }}></div> : 
                             isSaved ? <><CheckCircle2 size={16} /> تم الحفظ</> : 
                             <><Save size={16} /> حفظ الراتب</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: TREASURY (الخزينة النقدية والحركات المالية) ===== */}
      {activeTab === 'treasury' && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Treasury Stats - Premium Design */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px"
          }}>
            {/* Balance Card */}
            <div className="card" style={{ 
              padding: "24px", 
              background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.02) 100%)", 
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "0 8px 32px rgba(16,185,129,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "20px",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(16,185,129,0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    الرصيد الفعلي الحالي في الخزينة
                  </div>
                  <div style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "900", color: "var(--success)", letterSpacing: "0.5px", textShadow: "0 2px 10px rgba(16,185,129,0.2)" }}>
                    {(treasury?.balance || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '16px', fontWeight: "600", opacity: 0.8 }}>ج.م</span>
                  </div>
                </div>
                <div style={{ 
                  background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))", 
                  color: "var(--success)", width: "50px", height: "50px", borderRadius: "14px",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16,185,129,0.3)"
                }}>
                  <Wallet size={28} />
                </div>
              </div>
            </div>

            {/* Deposits Card */}
            <div className="card" style={{ 
              padding: "24px", 
              background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.02) 100%)", 
              border: "1px solid rgba(59,130,246,0.2)",
              boxShadow: "0 8px 32px rgba(59,130,246,0.05)",
              borderRadius: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>إجمالي الإيداعات النقدية</div>
                  <div style={{ fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: "800", color: "var(--info)" }}>
                    {(treasury?.totalDeposits || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '14px', opacity: 0.8 }}>ج.م</span>
                  </div>
                </div>
                <div style={{ 
                  background: "rgba(59,130,246,0.15)", color: "var(--info)", width: "46px", height: "46px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <ArrowDownLeft size={24} />
                </div>
              </div>
            </div>

            {/* Withdrawals Card */}
            <div className="card" style={{ 
              padding: "24px", 
              background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)", 
              border: "1px solid rgba(239,68,68,0.2)",
              boxShadow: "0 8px 32px rgba(239,68,68,0.05)",
              borderRadius: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>إجمالي المصروفات والسحوبات</div>
                  <div style={{ fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: "800", color: "var(--danger)" }}>
                    {(treasury?.totalWithdrawals || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '14px', opacity: 0.8 }}>ج.م</span>
                  </div>
                </div>
                <div style={{ 
                  background: "rgba(239,68,68,0.15)", color: "var(--danger)", width: "46px", height: "46px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <ArrowUpRight size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Treasury Actions */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px",
            marginTop: "8px"
          }}>
            <button 
              className="btn"
              onClick={() => {
                setTreasuryActionType('deposit');
                setTreasuryAmount('');
                setTreasuryDesc('');
                setTreasuryMsg({ error: '', success: '' });
                setIsTreasuryModalOpen(true);
              }}
              style={{ 
                background: "linear-gradient(135deg, #10b981, #059669)", 
                border: "none", 
                color: "#fff", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                gap: "10px",
                padding: "16px",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "700",
                boxShadow: "0 8px 20px rgba(16,185,129,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Plus size={20} /> إيداع نقدي جديد للخزينة
            </button>
            <button 
              className="btn"
              onClick={() => {
                setTreasuryActionType('withdrawal');
                setTreasuryAmount('');
                setTreasuryDesc('');
                setTreasuryMsg({ error: '', success: '' });
                setIsTreasuryModalOpen(true);
              }}
              style={{ 
                background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.4)", 
                color: "var(--danger)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                gap: "10px",
                padding: "16px",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "700",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <Minus size={20} /> سحب نقدي من الخزينة
            </button>
          </div>

          {/* Transactions Log Table */}
          <div className="card" style={{ 
            padding: "0", 
            borderRadius: "20px",
            border: "1px solid var(--border-gold)",
            background: "linear-gradient(180deg, rgba(var(--bg-card-rgb), 1) 0%, rgba(var(--bg-card-rgb), 0.6) 100%)",
            overflow: "hidden"
          }}>
            <div style={{ 
              display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", 
              padding: "20px", borderBottom: "1px solid rgba(212,175,55,0.15)",
              background: "rgba(212,175,55,0.03)"
            }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: "700" }}>
                <div style={{ background: "rgba(212,175,55,0.1)", padding: "8px", borderRadius: "10px", color: "var(--gold-primary)" }}>
                  <History size={20} />
                </div>
                سجل العمليات والحركات النقدية للخزينة
              </h3>
              <span className="badge badge-gold" style={{ padding: "6px 12px", borderRadius: "12px", fontSize: "13px" }}>
                {transactions.length} حركة مسجلة
              </span>
            </div>

            {treasuryLoading ? (
              <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}><div className="spinner"></div></div>
            ) : transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: "60px 20px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <AlertCircle size={40} style={{ color: "var(--text-muted)" }} />
                </div>
                <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>لا توجد حركات نقدية مسجلة بعد في الخزينة.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                      <th style={{ width: "50px", padding: "16px", color: "var(--text-secondary)" }}>#</th>
                      <th style={{ padding: "16px", color: "var(--text-secondary)" }}>نوع الحركة</th>
                      <th style={{ padding: "16px", color: "var(--text-secondary)" }}>المبلغ</th>
                      <th style={{ padding: "16px", color: "var(--text-secondary)" }}>البيان والتفاصيل</th>
                      <th style={{ padding: "16px", color: "var(--text-secondary)" }}>المنفذ</th>
                      <th style={{ padding: "16px", color: "var(--text-secondary)" }}>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any, idx: number) => {
                      const isDeposit = tx.type === "deposit";
                      const isSalary = tx.type === "salary_payment";
                      return (
                        <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "16px", color: "var(--text-muted)", textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ padding: "16px" }}>
                            <span className={`badge ${isDeposit ? "badge-success" : isSalary ? "badge-gold" : "badge-danger"}`} style={{ padding: "6px 12px", borderRadius: "8px" }}>
                              {isDeposit ? "📥 إيداع نقدي" : isSalary ? "💰 صرف رواتب" : "📤 سحب نقدي"}
                            </span>
                          </td>
                          <td style={{ padding: "16px", fontWeight: "800", color: isDeposit ? "var(--success)" : "var(--danger)", direction: "ltr", textAlign: "right", fontSize: "15px" }}>
                            {isDeposit ? `+${tx.amount.toLocaleString('ar-EG')}` : `-${tx.amount.toLocaleString('ar-EG')}`} <span style={{ fontSize: "11px", opacity: 0.7 }}>ج.م</span>
                          </td>
                          <td style={{ padding: "16px", color: "var(--text-primary)", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={tx.description}>
                            {tx.description}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                              {tx.performedBy}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "var(--text-muted)", fontSize: "13px" }}>
                            {new Date(tx.createdAt).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TREASURY TRANSACTION MODAL */}
      {isTreasuryModalOpen && (
        <div className="modal-overlay" onClick={() => !treasurySaving && setIsTreasuryModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: treasuryActionType === "deposit" ? "var(--success)" : "var(--danger)" }}>
                {treasuryActionType === "deposit" ? "📥 تسجيل إيداع نقدي في الخزينة" : "📤 تسجيل سحب نقدي من الخزينة"}
              </h3>
              <button className="modal-close" onClick={() => setIsTreasuryModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleTreasuryAction}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {treasuryMsg.error && <div className="alert alert-danger">{treasuryMsg.error}</div>}
                {treasuryMsg.success && <div className="alert alert-success">{treasuryMsg.success}</div>}

                <div className="form-group">
                  <label className="form-label">المبلغ (بالجنيه المصري) <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-control"
                    placeholder="مثال: 5000"
                    value={treasuryAmount}
                    onChange={(e) => setTreasuryAmount(e.target.value)}
                    required
                    autoFocus
                  />
                  {treasuryActionType === "withdrawal" && (
                    <small style={{ color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      الرصيد المتاح حالياً للسحب: {(treasury?.balance || 0).toLocaleString('ar-EG')} ج.م
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">بيان وسبب الحركة <span style={{ color: "var(--danger)" }}>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder={treasuryActionType === "deposit" ? "مثال: إيداع رأس مال / تحصيل فواتير عملاء..." : "مثال: شراء مستلزمات مكتبية / عهدة مؤقتة..."}
                    value={treasuryDesc}
                    onChange={(e) => setTreasuryDesc(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTreasuryModalOpen(false)}>إلغاء</button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={treasurySaving}
                  style={{ background: treasuryActionType === "deposit" ? "var(--success)" : "var(--danger)", borderColor: "transparent", color: "#fff" }}
                >
                  {treasurySaving ? "جاري الحفظ..." : treasuryActionType === "deposit" ? "تأكيد الإيداع" : "تأكيد السحب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {isModalOpen && selectedPayroll && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">تسوية الإستحقاقات المالية</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body" style={{ padding: "24px" }}>
                <div style={{ marginBottom: "20px", padding: '16px', background: 'rgba(var(--white-rgb),0.02)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px", color: "var(--gold-primary)" }}>{selectedPayroll.employee?.name}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>خصم تلقائي محتسب للغياب: {selectedPayroll.autoDeduction} ج.م</div>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--info)' }}>الراتب الأساسي (ج.م) <span style={{fontSize:'12px',color:'var(--text-muted)'}}>(سيُحفظ بملف الموظف)</span></label>
                    <input type="number" step="0.01" className="form-control" value={formData.basicSalary} onChange={e => setFormData({...formData, basicSalary: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--success)' }}>إضافة مكافأة (ج.م)</label>
                    <input type="number" step="0.01" className="form-control" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value ? parseFloat(e.target.value) : 0})} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--danger)' }}>إضافة خصم إداري مفتوح (ج.م)</label>
                    <input type="number" step="0.01" className="form-control" value={formData.manualDeduction} onChange={e => setFormData({...formData, manualDeduction: e.target.value ? parseFloat(e.target.value) : 0})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة الصرف</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="draft">استحقاق (مسودة)</option>
                      <option value="paid">تم الصرف</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات والتفاصيل (اختياري)</label>
                    <textarea className="form-control" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="أسباب المكافأة أو الخصم الإداري للرجوع إليها مستقبلاً..."></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "جاري الحفظ والاحتساب..." : "تطبيق التسوية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* --- Print functionality relies on PDF API route --- */}
    </>
  );
}
