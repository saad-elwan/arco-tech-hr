"use client";
import { useEffect, useState } from "react";
import { Plus, Building, Trash2, Edit2, Users, User } from "lucide-react";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [name, setName] = useState("");
  const [supervisorId, setSupervisorId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (Array.isArray(data)) setDepartments(data);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingDept(null);
    setName("");
    setSupervisorId("");
    setIsModalOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    setName(dept.name);
    setSupervisorId(dept.supervisorId || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = editingDept ? `/api/departments` : `/api/departments`;
      const method = editingDept ? "PUT" : "POST";
      const body = editingDept 
        ? { id: editingDept.id, name, supervisorId: supervisorId || null } 
        : { name, supervisorId: supervisorId || null };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchDepartments();
      } else {
        const err = await res.json();
        alert(err.error || "حدث خطأ أثناء الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: any) => {
    if (dept._count?.employees > 0) {
      alert("لا يمكن حذف قسم يحتوي على موظفين. يرجى نقل الموظفين أولاً.");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف قسم "${dept.name}"؟`)) return;
    try {
      const res = await fetch(`/api/departments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dept.id }),
      });
      if (res.ok) fetchDepartments();
      else alert("فشل حذف القسم");
    } catch { alert("حدث خطأ"); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">🏢</span> إدارة الأقسام
          </h1>
          <p className="page-subtitle">الأقسام والهيكل التنظيمي للشركة</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> إضافة قسم جديد
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="stat-icon" style={{ background: "rgba(212,175,55,0.1)", color: "var(--gold-primary)" }}>
            <Building size={24} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>{departments.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>إجمالي الأقسام</div>
          </div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>
              {departments.reduce((acc, d) => acc + (d._count?.employees || 0), 0)}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>إجمالي الموظفين</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>اسم القسم</th>
                  <th>مشرف القسم</th>
                  <th>عدد الموظفين</th>
                  <th>تاريخ الإنشاء</th>
                  <th style={{ textAlign: "left" }}>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} onMouseOver={e => e.currentTarget.style.background = 'rgba(212,175,55,0.04)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} style={{ borderBottom: "1px solid rgba(var(--white-rgb),0.05)", transition: "0.2s" }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "10px", background: "rgba(212,175,55,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Building size={18} color="var(--gold-primary)" />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{dept.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={14} color="var(--gold-primary)" />
                        <span style={{ fontWeight: 600, color: dept.supervisor?.name ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {dept.supervisor?.name || "لم يتم تعيين"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gold">
                        {dept._count?.employees || 0} موظف
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(dept.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--gold-primary)' }}
                          onClick={() => openEdit(dept)}
                          title="تعديل بيانات القسم"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(dept)}
                          title="حذف القسم"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state" style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
                      لا توجد أقسام مسجلة بعد. أضف أول قسم!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDept ? "تعديل اسم القسم" : "إضافة قسم جديد"}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: "24px" }}>
                <div className="form-group">
                  <label className="form-label">اسم القسم <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: قسم المبيعات"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">مشرف القسم</label>
                  <select
                    className="form-control"
                    value={supervisorId}
                    onChange={e => setSupervisorId(e.target.value ? parseInt(e.target.value) : "")}
                  >
                    <option value="">-- اختر مشرف --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
