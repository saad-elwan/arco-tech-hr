"use client";
import { useEffect, useState } from "react";
import { Search, Plus, Filter, MoreVertical, Edit2, Trash2, Eye, Building, Clock, Phone, Mail, FileText, UserPlus, Fingerprint, Calendar, Users, CheckCircle, AlertTriangle } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: "", email: "", password: "", phone: "", nationalId: "", role: "employee", status: "active", departmentId: "", shiftId: "", fingerprintId: "", hireDate: "", basicSalary: "", maxAdvanceLimit: "", permissions: ["/me"] });
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetch("/api/departments").then(r => r.json()).then(setDepartments).catch(() => {});
    fetch("/api/shifts").then(r => r.json()).then(setShifts).catch(() => {});
  }, [filterDept, filterStatus]);

  const fetchEmployees = async (q = search) => {
    setLoading(true);
    try {
      const url = new URL(window.location.origin + "/api/employees");
      if (q) url.searchParams.set("search", q);
      if (filterDept) url.searchParams.set("department", filterDept);
      if (filterStatus) url.searchParams.set("status", filterStatus);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEditMode ? `/api/employees/${selectedEmp.id}` : `/api/employees`;
      const method = isEditMode ? "PUT" : "POST";
      
      const payload: any = { ...formData };
      payload.permissions = JSON.stringify(payload.permissions);
      if (!isEditMode && !payload.password) payload.password = "123456"; // Default password
      if (isEditMode && !payload.password) delete payload.password; // Don't send empty pass on edit
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsFormModalOpen(false);
        fetchEmployees();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "حدث خطأ أثناء الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, { method: "DELETE" });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchEmployees();
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => {
    setIsEditMode(false);
    setSelectedEmp(null);
    setFormData({ name: "", email: "", password: "", phone: "", nationalId: "", role: "employee", status: "active", departmentId: "", shiftId: "", fingerprintId: "", hireDate: new Date().toISOString().split("T")[0], basicSalary: "", maxAdvanceLimit: "", permissions: ["/me"] });
    setIsFormModalOpen(true);
  };

  const openAddDelegateForm = () => {
    setIsEditMode(false);
    setSelectedEmp(null);
    setFormData({ 
      name: "", 
      email: "", 
      password: "", 
      phone: "", 
      nationalId: "", 
      role: "delegate", 
      status: "active", 
      departmentId: "", 
      shiftId: "", 
      fingerprintId: "", 
      hireDate: new Date().toISOString().split("T")[0], 
      basicSalary: "", 
      maxAdvanceLimit: "", 
      permissions: ["/me"] 
    });
    setIsFormModalOpen(true);
  };

  const openEditForm = (emp: any) => {
    setIsEditMode(true);
    setSelectedEmp(emp);
    setFormData({
      name: emp.name || "",
      email: emp.email || "",
      password: "",
      phone: emp.phone || "",
      nationalId: emp.nationalId || "",
      role: emp.role || "employee",
      status: emp.status || "active",
      departmentId: emp.departmentId || "",
      shiftId: emp.shiftId || "",
      fingerprintId: emp.fingerprintId || "",
      basicSalary: emp.basicSalary || "",
      maxAdvanceLimit: emp.maxAdvanceLimit || "",
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split("T")[0] : "",
      permissions: emp.permissions ? JSON.parse(emp.permissions) : ["/me"],
    });
    setIsFormModalOpen(true);
  };

  const roleLabels: Record<string, string> = { 
    superadmin: "مشرف عام",
    admin: "مدير نظام", 
    hr: "موارد بشرية", 
    employee: "موظف",
    delegate: "🚗 مندوب ميداني"
  };

  const availablePermissions = [
    { id: "/me", label: "حسابي (أساسي)" },
    { id: "/tasks", label: "مهامي والمشاريع" },
    { id: "/attendance", label: "سجل الحضور" },
    { id: "/finance", label: "الماليات والرواتب والخزينة (إدارة مالية)" },
    { id: "/tracking", label: "تتبع المواقع وخطوط السير" },
    { id: "/evaluations", label: "التقييمات" },
    { id: "/requests", label: "سجل الطلبات والسلف" }
  ];

  const handlePermissionToggle = (permId: string) => {
    setFormData((prev: any) => {
      const perms = prev.permissions || [];
      if (perms.includes(permId)) {
        if (permId === "/me") return prev; // Don't allow removing /me
        return { ...prev, permissions: perms.filter((p: string) => p !== permId) };
      }
      return { ...prev, permissions: [...perms, permId] };
    });
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">
            <span className="page-title-icon" style={{ color: "var(--gold-primary)" }}>👥</span> إدارة الموظفين الشاملة
          </h1>
          <p className="page-subtitle">عرض التفاصيل الدقيقة والسجلات الوظيفية لكل فرد في المؤسسة</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button 
            className="btn btn-secondary" 
            onClick={openAddDelegateForm} 
            style={{ display: "flex", alignItems: "center", gap: 8, borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}
          >
            🚗 إضافة مندوب جديد
          </button>
          <button className="btn btn-primary" onClick={openAddForm} style={{ boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)" }}>
            <UserPlus size={18} /> تعيين موظف جديد
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "24px" }}>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(212, 175, 55, 0.1)", color: "var(--gold-primary)" }}><Users size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{employees.length}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>إجمالي الموظفين</div></div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}><CheckCircle size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{employees.filter(e => e.status === 'active').length}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>على رأس العمل</div></div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}><AlertTriangle size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{employees.filter(e => e.status !== 'active').length}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>موقوف أو إجازة</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "24px", padding: "16px", background: "rgba(var(--white-rgb),0.02)" }}>
        <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <div className="search-input-wrapper" style={{ flex: "1", minWidth: "250px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", padding: "8px 16px" }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم، الايميل، الهاتف، الكود القومي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", width: "100%", paddingRight: "10px", fontSize: "14px" }}
            />
          </div>
          <select className="form-control" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: 'fit-content' }}>
            <option value="">كل الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 'fit-content' }}>
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="leave">إجازة</option>
          </select>
          <button className="btn btn-secondary btn-icon" onClick={() => fetchEmployees()}>
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>البيانات الأساسية</th>
                  <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>التسكين الوظيفي</th>
                  <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>تاريخ التعيين</th>
                  <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>الحالة</th>
                  <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid rgba(var(--white-rgb),0.05)", transition: "0.2s" }} onMouseOver={e=>e.currentTarget.style.background='rgba(212,175,55,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="employee-avatar avatar-sm" style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: "14px" }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: "flex", gap: 8, marginTop: 4 }}>
                            <span>{emp.phone || "لا يوجد هاتف"}</span> • <span>{roleLabels[emp.role] || emp.role}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}><Building size={12} style={{ display: "inline", marginLeft: 4, color: "var(--text-muted)" }}/> {emp.department?.name || 'غير محدد'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}><Clock size={12} style={{ display: "inline", marginLeft: 4 }}/> {emp.shift?.name || 'غير محدد'}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {new Date(emp.hireDate).toLocaleDateString("ar-EG")}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'leave' ? 'warning' : 'danger'}`} style={{ padding: "4px 10px", fontSize: "12px" }}>
                        {emp.status === 'active' ? 'نشط' : emp.status === 'leave' ? 'إجازة' : 'موقوف'}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "left" }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setSelectedEmp(emp); setIsViewModalOpen(true); }} style={{ color: 'var(--info)' }} title="عرض التفاصيل"><Eye size={16} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditForm(emp)} style={{ color: 'var(--gold-primary)' }} title="تعديل"><Edit2 size={16} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setSelectedEmp(emp); setIsDeleteModalOpen(true); }} style={{ color: 'var(--danger)' }} title="حذف دائيم"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                      لا يوجد موظفين مسجلين حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* VIEW PROFILE MODAL */}
      {isViewModalOpen && selectedEmp && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", backdropFilter: "blur(20px)" }}>
            <div className="modal-header">
              <h3 className="modal-title">ملف الموظف الشامل</h3>
              <button className="modal-close" onClick={() => setIsViewModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "24px 32px" }}>
              <div style={{ display: "flex", gap: "24px", marginBottom: "32px", alignItems: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", color: "#000", fontSize: "36px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
                  {selectedEmp.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", color: "var(--text-primary)" }}>{selectedEmp.name}</h2>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span className={`badge badge-${selectedEmp.status === 'active' ? 'success' : 'danger'}`}>{selectedEmp.status === 'active' ? 'نشط' : 'موقوف'}</span>
                    <span className="badge badge-gold">{roleLabels[selectedEmp.role] || selectedEmp.role}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Contact Info Group */}
                <div className="card" style={{ padding: "16px", background: "rgba(var(--white-rgb),0.02)" }}>
                  <h4 style={{ color: "var(--gold-primary)", marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}><FileText size={16}/> بيانات شخصية واتصال</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "14px", marginTop: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Mail size={14} style={{display:"inline",marginRight:4}}/> البريد:</span> <strong>{selectedEmp.email || "---"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Phone size={14} style={{display:"inline",marginRight:4}}/> الهاتف:</span> <strong>{selectedEmp.phone || "---"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><FileText size={14} style={{display:"inline",marginRight:4}}/> الرقم القومي:</span> <strong>{selectedEmp.nationalId || "---"}</strong></div>
                  </div>
                </div>

                {/* System Info Group */}
                <div className="card" style={{ padding: "16px", background: "rgba(var(--white-rgb),0.02)" }}>
                  <h4 style={{ color: "var(--gold-primary)", marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}><Building size={16}/> البيانات الوظيفية</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "14px", marginTop: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Building size={14} style={{display:"inline",marginRight:4}}/> القسم:</span> <strong>{selectedEmp.department?.name || "---"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Clock size={14} style={{display:"inline",marginRight:4}}/> الوردية:</span> <strong>{selectedEmp.shift?.name || "---"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Calendar size={14} style={{display:"inline",marginRight:4}}/> تاريخ التعيين:</span> <strong>{new Date(selectedEmp.hireDate).toLocaleDateString("ar-EG")}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Fingerprint size={14} style={{display:"inline",marginRight:4}}/> رقم البصمة:</span> <strong>{selectedEmp.fingerprintId || "---"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><UserPlus size={14} style={{display:"inline",marginRight:4}}/> الراتب الأساسي:</span> <strong>{selectedEmp.basicSalary ? `${selectedEmp.basicSalary} ج.م` : "غير محدد"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><Building size={14} style={{display:"inline",marginRight:4}}/> الحد الأقصى للسلف:</span> <strong>{selectedEmp.maxAdvanceLimit ? `${selectedEmp.maxAdvanceLimit} ج.م` : "غير محدد"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}><FileText size={14} style={{display:"inline",marginRight:4}}/> الصفحات المسموحة:</span> <strong style={{ textAlign: "left" }}>
                      {selectedEmp.permissions ? JSON.parse(selectedEmp.permissions).map((p: string) => {
                        const lbl = availablePermissions.find(ap => ap.id === p)?.label || p;
                        return <span key={p} className="badge badge-info" style={{ marginRight: 4, display: "inline-block", marginBottom: 4 }}>{lbl}</span>
                      }) : <span className="badge badge-info">حسابي (أساسي)</span>}
                    </strong></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>إغلاق</button>
              <button className="btn btn-primary" onClick={() => { setIsViewModalOpen(false); openEditForm(selectedEmp); }}><Edit2 size={16}/> تعديل البيانات</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (Add / Edit) */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsFormModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditMode ? "تعديل بيانات الموظف" : "تعيين موظف جديد"}</h3>
              <button className="modal-close" onClick={() => setIsFormModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">الاسم الرباعي <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">كلمة المرور للنظام {isEditMode && "(اتركه فارغاً لعدم التغيير)"} {!isEditMode && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                    <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={!isEditMode ? "الافتراضي: 123456" : "••••••••"} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الراتب الأساسي (ج.م) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" step="0.01" className="form-control" value={formData.basicSalary} onChange={e => setFormData({...formData, basicSalary: e.target.value})} placeholder="الراتب الشهري الأساسي" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحد الأقصى للسلف (ج.م) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" step="0.01" className="form-control" value={formData.maxAdvanceLimit} onChange={e => setFormData({...formData, maxAdvanceLimit: e.target.value})} placeholder="الحد الأقصى المسموح" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرقم القومي (البطاقة)</label>
                    <input type="text" className="form-control" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ التعيين</label>
                    <input type="date" className="form-control" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تفضيلات الوصول (الصلاحية)</label>
                    <select className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="employee">موظف (صلاحيات محدودة)</option>
                      <option value="delegate">🚗 مندوب ميداني (Delegate)</option>
                      <option value="hr">إدارة الموارد البشرية</option>
                      <option value="admin">مدير نظام (صلاحيات كاملة)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">حالة الموظف</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">نشط / على رأس العمل</option>
                      <option value="leave">في إجازة</option>
                      <option value="suspended">موقوف عقابياً</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">القسم</label>
                    <select className="form-control" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                      <option value="">-- غير محدد --</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الوردية المخصصة</label>
                    <select className="form-control" value={formData.shiftId} onChange={e => setFormData({...formData, shiftId: e.target.value})}>
                      <option value="">-- غير محدد --</option>
                      {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">رقم معرف البصمة (في جهاز الحضور)</label>
                    <input type="text" className="form-control" value={formData.fingerprintId} onChange={e => setFormData({...formData, fingerprintId: e.target.value})} placeholder="مثال: 1004" />
                  </div>
                  
                  {(formData.role === "employee" || formData.role === "delegate") && (
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">الصفحات المسموح للموظف برؤيتها (الصلاحيات المخصصة)</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: "rgba(var(--white-rgb),0.03)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        {availablePermissions.map(perm => (
                          <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: perm.id === "/me" ? "not-allowed" : "pointer" }}>
                            <input 
                              type="checkbox" 
                              checked={formData.permissions?.includes(perm.id)} 
                              onChange={() => handlePermissionToggle(perm.id)}
                              disabled={perm.id === "/me"}
                              style={{ width: "16px", height: "16px", accentColor: "var(--gold-primary)" }}
                            />
                            <span style={{ fontSize: "14px", color: formData.permissions?.includes(perm.id) ? "var(--gold-primary)" : "var(--text-primary)" }}>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>ملاحظة: هذه الصلاحيات تظهر فقط لأصحاب دور &quot;موظف&quot;. المدراء يمتلكون وصولاً كاملاً.</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && selectedEmp && (
        <div className="modal-overlay" onClick={() => !saving && setIsDeleteModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-body" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--danger-bg)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>تأكيد الحذف</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                هل أنت متأكد من حذف الموظف <strong>{selectedEmp.name}</strong> نهائياً؟ هذا الإجراء لا يمكن التراجع عنه وسيحذف جميع سجلات مهامه وحضوره.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center", borderTop: "none" }}>
              <button className="btn btn-secondary" disabled={saving} onClick={() => setIsDeleteModalOpen(false)}>تراجع</button>
              <button className="btn btn-danger" disabled={saving} onClick={handleDelete}>{saving ? "جاري الحذف..." : "نعم، حذف نهائي"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
