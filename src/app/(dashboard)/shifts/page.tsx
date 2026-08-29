"use client";
import { useEffect, useState } from "react";
import { Plus, RotateCw, Edit2, Trash2, Clock, Users } from "lucide-react";

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    breakDuration: "60",
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (Array.isArray(data)) setShifts(data);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingShift(null);
    setFormData({ name: "", startTime: "08:00", endTime: "17:00", breakDuration: "60" });
    setIsModalOpen(true);
  };

  const openEdit = (shift: any) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: String(shift.breakDuration || 60),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingShift ? "PUT" : "POST";
      const url = editingShift ? `/api/shifts/${editingShift.id}` : `/api/shifts`;
      const body = { ...formData, breakDuration: parseInt(formData.breakDuration) || 60 };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchShifts();
      } else {
        const err = await res.json();
        alert(err.error || "حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shift: any) => {
    if (!confirm(`هل أنت متأكد من حذف وردية "${shift.name}"؟`)) return;
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
      if (res.ok) fetchShifts();
      else {
        const err = await res.json();
        alert(err.error || "فشل الحذف");
      }
    } catch { alert("حدث خطأ"); }
  };

  const calcHours = (start: string, end: string, breakMin: number) => {
    if (!start || !end) return "--";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
    if (total <= 0) return "--";
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}س ${m > 0 ? m + "د" : ""}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">🔄</span> إدارة الورديات
          </h1>
          <p className="page-subtitle">تحديد أوقات العمل والورديات الخاصة بالموظفين</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ boxShadow: "0 4px 15px rgba(212,175,55,0.3)" }}>
          <Plus size={16} /> إضافة وردية جديدة
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="stat-icon" style={{ background: "rgba(212,175,55,0.1)", color: "var(--gold-primary)" }}>
            <RotateCw size={24} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>{shifts.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>إجمالي الورديات</div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', minHeight: 200 }} className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: "50px", textAlign: "center" }} className="empty-state card">
            لا توجد ورديات مضافة بعد. أضف أول وردية!
          </div>
        ) : shifts.map((shift) => (
          <div className="card" key={shift.id} style={{ transition: "0.2s" }}>
            <div className="card-header">
              <h3 className="card-title">
                <RotateCw size={18} color="var(--gold-primary)" />
                {shift.name}
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: 'var(--gold-primary)' }}
                  onClick={() => openEdit(shift)}
                  title="تعديل"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDelete(shift)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> وقت الدخول
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--gold-light)' }}>
                    {shift.startTime}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> وقت الانصراف
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>
                    {shift.endTime}
                  </div>
                </div>

                <div className="gold-divider" style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>مدة الراحة</div>
                  <div className="badge badge-gold">{shift.breakDuration} دقيقة</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>ساعات العمل الفعلية</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>
                    {calcHours(shift.startTime, shift.endTime, shift.breakDuration || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingShift ? "تعديل الوردية" : "إضافة وردية جديدة"}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">اسم الوردية <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: الوردية الصباحية"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">وقت بداية الدوام</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">وقت نهاية الدوام</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">مدة الراحة (بالدقائق)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      max="240"
                      value={formData.breakDuration}
                      onChange={e => setFormData({ ...formData, breakDuration: e.target.value })}
                    />
                  </div>
                  {formData.startTime && formData.endTime && (
                    <div style={{ padding: "12px", background: "rgba(212,175,55,0.08)", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.2)", fontSize: 13, color: "var(--gold-primary)" }}>
                      ✅ ساعات العمل الفعلية: {calcHours(formData.startTime, formData.endTime, parseInt(formData.breakDuration) || 0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !formData.name.trim()}>
                  {saving ? "جاري الحفظ..." : "حفظ الوردية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
