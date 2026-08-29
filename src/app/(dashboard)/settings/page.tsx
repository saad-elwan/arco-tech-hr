"use client";
import { useEffect, useState } from "react";
import { Save, Download, Building, Database, Clock } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setSettings(data || {});
      setLoading(false);
    });
  }, []);

  const handleChange = (e: any) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      alert("تم حفظ الإعدادات بنجاح");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">⚙️</span> إعدادات النظام
          </h1>
          <p className="page-subtitle">تكوين إعدادات الشركة وقاعدة البيانات</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 className="settings-section-title">
          <Building size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> 
          بيانات الشركة
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">اسم الشركة</label>
            <input type="text" className="form-control" name="name" value={settings.name || ""} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">رقم الهاتف</label>
            <input type="text" className="form-control" name="phone" value={settings.phone || ""} onChange={handleChange} dir="ltr" style={{ textAlign: 'right' }} />
          </div>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input type="email" className="form-control" name="email" value={settings.email || ""} onChange={handleChange} dir="ltr" style={{ textAlign: 'right' }} />
          </div>
          <div className="form-group">
            <label className="form-label">العنوان</label>
            <input type="text" className="form-control" name="address" value={settings.address || ""} onChange={handleChange} />
          </div>
        </div>

        <h3 className="settings-section-title" style={{ marginTop: 20 }}>
          <Clock size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> 
          إعدادات الدوام الأساسية
        </h3>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">وقت بداية العمل الافتراضي</label>
            <input type="time" className="form-control" name="workStartTime" value={settings.workStartTime || "08:00"} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">وقت نهاية العمل الافتراضي</label>
            <input type="time" className="form-control" name="workEndTime" value={settings.workEndTime || "17:00"} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">فترة السماح التأخير (بالدقائق)</label>
            <input type="number" className="form-control" name="lateThresholdMin" value={settings.lateThresholdMin || "15"} onChange={handleChange} />
          </div>
        </div>

        {/* Geofence Settings Section */}
        <div className="card" style={{ padding: "20px", marginBottom: "24px", marginTop: "20px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--info)" }}>
              <Building size={20} />
            </div>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>النطاق الجغرافي (Geofence)</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">خط العرض (Latitude)</label>
              <input
                type="number"
                name="geofenceLat"
                className="form-control"
                value={settings.geofenceLat || ""}
                onChange={handleChange}
                placeholder="مثال: 30.0444"
              />
            </div>
            <div className="form-group">
              <label className="form-label">خط الطول (Longitude)</label>
              <input
                type="number"
                name="geofenceLng"
                className="form-control"
                value={settings.geofenceLng || ""}
                onChange={handleChange}
                placeholder="مثال: 31.2357"
              />
            </div>
            <div className="form-group">
              <label className="form-label">النطاق المسموح (بالمتر)</label>
              <input
                type="number"
                name="geofenceRadius"
                className="form-control"
                value={settings.geofenceRadius || ""}
                onChange={handleChange}
                placeholder="مثال: 500"
              />
            </div>
          </div>
          <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-muted)" }}>
            يستخدم النطاق الجغرافي للتحقق من موقع الموظفين والمناديب وتوليد تنبيهات في حال الخروج.
          </p>
        </div>

        <h3 className="settings-section-title" style={{ marginTop: 20 }}>
          <Database size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> 
          إدارة قاعدة البيانات
        </h3>
        
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={18} color="var(--success)" />
              نسخ احتياطي للبيانات
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              قم بتنزيل نسخة احتياطية من قاعدة البيانات (SQL / SQLite DB file) للاحتفاظ بها.
            </p>
            <button className="btn btn-secondary">تنزيل نسخة احتياطية (Backup)</button>
          </div>
        </div>

      </div>
    </div>
  );
}
