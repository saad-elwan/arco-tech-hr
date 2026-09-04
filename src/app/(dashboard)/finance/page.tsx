"use client";
import { useEffect, useState } from "react";
import { Banknote, Calculator, Search, TrendingDown, TrendingUp, Edit2, AlertCircle, Download, PieChart as PieIcon, BarChart2, Activity, Users, Save, UserCog, CheckCircle2, XCircle, Wallet, ArrowDownLeft, ArrowUpRight, Plus, Minus, History, ShieldAlert } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function FinancePage() {
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
          <button className="btn btn-ghost" onClick={() => window.print()} title="تصدير الشاشة كملف PDF" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <Download size={18} /> تقرير PDF
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
      {/* Stats Board */}
      <div className="stat-grid">
        <div className="card stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>إجمالي الرواتب الصافية</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--gold-primary)" }}>{totalNetSalaries.toLocaleString('ar-EG')} <span style={{ fontSize:'14px' }}>ج.م</span></div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(212, 175, 55, 0.1)", color: "var(--gold-primary)" }}><Banknote size={24} /></div>
          </div>
        </div>
        <div className="card stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>إجمالي المكافآت</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--success)" }}>{totalBonuses.toLocaleString('ar-EG')} <span style={{ fontSize:'14px' }}>ج.م</span></div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}><TrendingUp size={24} /></div>
          </div>
        </div>
        <div className="card stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>إجمالي الخصومات (حضور/إداري)</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--danger)" }}>{totalDeductions.toLocaleString('ar-EG')} <span style={{ fontSize:'14px' }}>ج.م</span></div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}><TrendingDown size={24} /></div>
          </div>
        </div>
      </div>

      {/* Enterprise Analytics Charts */}
      {payrolls.length > 0 && (
        <div className="hide-on-print">
          {/* Analytics Section Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'8px', background:'rgba(212,175,55,0.15)', color:'#d4af37' }}>
              <Activity size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#d4af37', letterSpacing:'0.5px' }}>لوحة التحليلات المالية</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>بيانات حية بناءً على مسير شهر {selectedPeriod}</div>
            </div>
            <div style={{ marginRight: 'auto', display:'flex', gap:'8px' }}>
              <span style={{ padding:'4px 10px', borderRadius:'20px', background:'rgba(212,175,55,0.1)', color:'#d4af37', fontSize:'11px', fontWeight:600, border:'1px solid rgba(212,175,55,0.2)' }}>
                {payrolls.length} موظف
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Department Pie Chart */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,20,20,0.9) 0%, rgba(10,10,12,0.95) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 4px 24px rgba(var(--black-rgb),0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glow accent */}
            <div style={{ position:'absolute', top:0, right:0, width:'100px', height:'100px', background:'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'8px', background:'rgba(212,175,55,0.15)', color:'#d4af37', flexShrink:0 }}>
                <PieIcon size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>توزيع التكلفة على الأقسام</div>
                <div style={{ fontSize: '11px', color: '#777', marginTop:'2px' }}>Cost Center Distribution</div>
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
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={4} dataKey="value" stroke="rgba(var(--black-rgb),0.6)" strokeWidth={2}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'الصافي']}
                    contentStyle={{ background: 'rgba(5,5,8,0.92)', backdropFilter:'blur(16px)', border:'1px solid rgba(212,175,55,0.35)', borderRadius:'12px', boxShadow:'0 12px 40px rgba(var(--black-rgb),0.7)', color:'#fff', fontSize:'13px', padding:'10px 14px' }}
                    itemStyle={{ color: '#fff', fontWeight: 700 }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#aaa', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Deductions */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,20,20,0.9) 0%, rgba(10,10,12,0.95) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(239,68,68,0.2)',
            boxShadow: '0 4px 24px rgba(var(--black-rgb),0.4), inset 0 1px 0 rgba(239,68,68,0.08)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position:'absolute', top:0, left:0, width:'100px', height:'100px', background:'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'8px', background:'rgba(239,68,68,0.15)', color:'#ef4444', flexShrink:0 }}>
                <TrendingDown size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>أعلى 5 استقطاعات</div>
                <div style={{ fontSize: '11px', color: '#777', marginTop:'2px' }}>Top Deductions This Month</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDeductions} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#991b1b" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="rgba(var(--white-rgb),0.04)" />
                  <XAxis type="number" stroke="transparent" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={80} stroke="transparent" tick={{ fill: '#bbb', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(239,68,68,0.06)' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'إجمالي الخصم']}
                    contentStyle={{ background:'rgba(5,5,8,0.92)', backdropFilter:'blur(16px)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'12px', boxShadow:'0 12px 40px rgba(var(--black-rgb),0.7)', color:'#fff', fontSize:'13px', padding:'10px 14px' }}
                    itemStyle={{ color: '#fff', fontWeight: 700 }}
                  />
                  <Bar dataKey="value" fill="url(#redGrad)" radius={[0, 6, 6, 0]} barSize={18} name="الخصم" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Total Financial Structure */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,20,20,0.9) 0%, rgba(10,10,12,0.95) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 4px 24px rgba(var(--black-rgb),0.4), inset 0 1px 0 rgba(212,175,55,0.08)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position:'absolute', bottom:0, right:0, width:'120px', height:'120px', background:'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'8px', background:'rgba(96,165,250,0.15)', color:'#60a5fa', flexShrink:0 }}>
                <BarChart2 size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>هيكل الحركات المالية</div>
                <div style={{ fontSize: '11px', color: '#777', marginTop:'2px' }}>Financial Structure Overview</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={structureData} barGap={6}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#065f46" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="goldGradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5d568" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#92620f" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="redGradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(var(--white-rgb),0.04)" />
                  <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#aaa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(212,175,55,0.04)' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'القيمة']}
                    contentStyle={{ background:'rgba(5,5,8,0.92)', backdropFilter:'blur(16px)', border:'1px solid rgba(212,175,55,0.35)', borderRadius:'12px', boxShadow:'0 12px 40px rgba(var(--black-rgb),0.7)', color:'#fff', fontSize:'13px', padding:'10px 14px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#d4af37', fontWeight: 700, marginBottom:'4px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40} maxBarSize={50}>
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

      <div className="card">
        <div className="filter-bar" style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <div className="search-input-wrapper" style={{ flex: "1", maxWidth: "400px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", padding: "8px 16px" }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="ابحث عن موظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", width: "100%", paddingRight: "10px" }}
            />
          </div>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner" style={{ padding: '40px' }}><div className="spinner"></div></div>
          ) : payrolls.length === 0 ? (
            <div className="empty-state" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ marginBottom: "16px", color: "var(--gold-dark)", opacity: 0.5 }}><AlertCircle size={48} style={{ margin: "0 auto" }}/></div>
              <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>لم يتم احتساب الرواتب بعد</h3>
              <p>اضغط على زر (حساب رواتب الشهر تلقائياً) للبدء في استخراج المسير المالي.</p>
            </div>
          ) : (
            <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>اسـم المـوظف</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>الراتب الأساسي</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>تأخير / غياب</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", color: 'var(--danger)' }}>خصم تلقائي</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", color: 'var(--danger)' }}>خصم إداري</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", color: 'var(--success)' }}>مكافآت</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>صافي راتب شهر {selectedPeriod}</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pr) => (
                  <tr key={pr.id} style={{ borderBottom: "1px solid rgba(var(--white-rgb),0.05)", transition: "0.2s" }} onMouseOver={e=>e.currentTarget.style.background='rgba(212,175,55,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 600 }}>{pr.employee?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{pr.employee?.department?.name || "---"}</div>
                    </td>
                    <td style={{ padding: "16px", fontWeight: "bold" }}>{pr.employee?.basicSalary || pr.basicSalary} <span style={{fontSize:'12px', color:'var(--text-muted)'}}>ج.م</span></td>
                    <td style={{ padding: "16px", fontSize: '13px' }}>
                      <span style={{color: 'var(--danger)', display: 'block'}}>{pr.absentDays} يوم غياب</span>
                      <span style={{color: 'var(--warning)', display: 'block'}}>{pr.lateDays} مرة تأخير</span>
                    </td>
                    <td style={{ padding: "16px", color: 'var(--danger)', fontWeight: "bold" }}>-{pr.autoDeduction.toFixed(2)}</td>
                    <td style={{ padding: "16px", color: 'var(--danger)', fontWeight: "bold" }}>-{pr.manualDeduction.toFixed(2)}</td>
                    <td style={{ padding: "16px", color: 'var(--success)', fontWeight: "bold" }}>+{pr.bonus.toFixed(2)}</td>
                    <td style={{ padding: "16px" }}>
                      <div className="badge badge-gold" style={{ fontSize: '15px', padding: '6px 12px' }}>
                        {pr.netSalary.toFixed(2)} ج.م
                      </div>
                      <div style={{ fontSize: '11px', textAlign: 'center', marginTop: '4px', color: pr.status==='paid'?'var(--success)':'var(--text-muted)' }}>
                        {pr.status === 'paid' ? 'تم الصرف' : 'استحقاق'}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(pr)}>
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

          <div className="table-wrapper">
            {empLoading ? (
              <div className="loading-spinner" style={{ padding: '40px' }}><div className="spinner"></div></div>
            ) : employees.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد موظفين مسجلين.</div>
            ) : (
              <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
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
          {/* Treasury Stats */}
          <div className="stat-grid">
            <div className="card stat-card" style={{ padding: "24px", background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>الرصيد الفعلي الحالي في الخزينة</div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--success)" }}>
                    {(treasury?.balance || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '15px' }}>ج.م</span>
                  </div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--success)" }}><Wallet size={28} /></div>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>إجمالي الإيداعات النقدية</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--info)" }}>
                    {(treasury?.totalDeposits || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '14px' }}>ج.م</span>
                  </div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--info)" }}><ArrowDownLeft size={24} /></div>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>إجمالي المصروفات والسحوبات</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--danger)" }}>
                    {(treasury?.totalWithdrawals || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '14px' }}>ج.م</span>
                  </div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}><ArrowUpRight size={24} /></div>
              </div>
            </div>
          </div>

          {/* Quick Treasury Actions */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setTreasuryActionType('deposit');
                setTreasuryAmount('');
                setTreasuryDesc('');
                setTreasuryMsg({ error: '', success: '' });
                setIsTreasuryModalOpen(true);
              }}
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={18} /> إيداع نقدي جديد في الخزينة
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setTreasuryActionType('withdrawal');
                setTreasuryAmount('');
                setTreasuryDesc('');
                setTreasuryMsg({ error: '', success: '' });
                setIsTreasuryModalOpen(true);
              }}
              style={{ border: "1px solid rgba(239,68,68,0.4)", color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Minus size={18} /> سحب نقدي من الخزينة
            </button>
          </div>

          {/* Transactions Log Table */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <History size={20} color="var(--gold-primary)" /> سجل العمليات والحركات النقدية للخزينة
              </h3>
              <span className="badge badge-gold">{transactions.length} عملية مسجلة</span>
            </div>

            {treasuryLoading ? (
              <div className="loading-spinner"><div className="spinner"></div></div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p>لا توجد حركات نقدية مسجلة بعد في الخزينة.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>نوع الحركة</th>
                      <th>المبلغ</th>
                      <th>البيان والتفاصيل</th>
                      <th>المنفذ</th>
                      <th>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any, idx: number) => {
                      const isDeposit = tx.type === "deposit";
                      const isSalary = tx.type === "salary_payment";
                      return (
                        <tr key={tx.id}>
                          <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                          <td>
                            <span className={`badge ${isDeposit ? "badge-success" : isSalary ? "badge-gold" : "badge-danger"}`}>
                              {isDeposit ? "📥 إيداع" : isSalary ? "💰 صرف راتب" : "📤 سحب نقدي"}
                            </span>
                          </td>
                          <td style={{ fontWeight: "bold", color: isDeposit ? "var(--success)" : "var(--danger)", direction: "ltr", textAlign: "right" }}>
                            {isDeposit ? `+${tx.amount.toLocaleString('ar-EG')}` : `-${tx.amount.toLocaleString('ar-EG')}`} ج.م
                          </td>
                          <td>{tx.description}</td>
                          <td><span className="chip" style={{ fontSize: "11px" }}>{tx.performedBy}</span></td>
                          <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            {new Date(tx.createdAt).toLocaleString('ar-EG')}
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

      {/* --- Formal PDF Report (Hidden on Screen, Visible on Print) --- */}
      <div className="print-only-report" dir="rtl">
        <div className="formal-report-header">
          <div>
            <h2 style={{ margin: 0 }}>{companySettings?.name || "شركتي"}</h2>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>الإدارة المالية والموارد البشرية</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>مسير شهر: <span dir="ltr">{selectedPeriod}</span></div>
          </div>
        </div>

        <div className="formal-report-title">
          مسير الرواتب المعتمد للموظفين
        </div>

        <div className="formal-report-summary" style={{ marginBottom: '10px' }}>
          <div>إجمالي المستحقات<br/>{(totalNetSalaries).toLocaleString('ar-EG')} ج.م</div>
          <div>إجمالي الخصومات<br/>{(totalDeductions).toLocaleString('ar-EG')} ج.م</div>
          <div>إجمالي المكافآت<br/>{(totalBonuses).toLocaleString('ar-EG')} ج.م</div>
        </div>

        <table className="formal-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>م</th>
              <th>اسم الموظف</th>
              <th style={{ textAlign: 'center' }}>الراتب الأساسي</th>
              <th style={{ textAlign: 'center' }}>إجمالي الخصم (تلقائي+إداري)</th>
              <th style={{ textAlign: 'center' }}>مكافآت</th>
              <th style={{ textAlign: 'center' }}>صافي الراتب</th>
              <th style={{ textAlign: 'center' }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pr, idx) => {
              const totalDed = pr.autoDeduction + pr.manualDeduction;
              return (
              <tr key={pr.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{pr.employee?.name}</td>
                <td style={{ textAlign: 'center' }}>{pr.basicSalary}</td>
                <td style={{ textAlign: 'center' }}>{totalDed.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{pr.bonus.toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{pr.netSalary.toFixed(2)} ج.م</td>
                <td style={{ textAlign: 'center' }}>{pr.status === 'paid' ? 'تم الصرف' : 'مستحق'}</td>
              </tr>
            )})}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>لا يوجد سجلات لهذا الشهر</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="signatures-area" style={{ marginTop: '40px' }}>
          <div className="signature-box">
            مدير الموارد البشرية
            <div className="signature-line"></div>
          </div>
          <div className="signature-box">
            المدير المالي
            <div className="signature-line"></div>
          </div>
          <div className="signature-box">
            الختم الرسمي
            <div className="signature-line" style={{ borderTop: 'none' }}></div>
          </div>
          <div className="signature-box">
            المدير العام
            <div className="signature-line"></div>
          </div>
        </div>
      </div>
    </>
  );
}
