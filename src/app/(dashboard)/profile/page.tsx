"use client";
import { useEffect, useState } from "react";
import { Save, User, Lock, Mail } from "lucide-react";

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      setName(parsed.name || "");
      setEmail(parsed.email || "");
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/employees/" + user.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, name, email };
        localStorage.setItem("hr_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setMessage({ type: "success", text: "تم تحديث البيانات بنجاح" });
      } else {
        setMessage({ type: "error", text: data.error || "حدث خطأ" });
      }
    } catch {
      setMessage({ type: "error", text: "تعذر الاتصال بالخادم" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "كلمة المرور الجديدة غير متطابقة" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/employees/" + user.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage({ type: "success", text: "تم تغيير كلمة المرور بنجاح" });
      } else {
        setMessage({ type: "error", text: data.error || "حدث خطأ" });
      }
    } catch {
      setMessage({ type: "error", text: "تعذر الاتصال بالخادم" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="page-container">جاري التحميل...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>حسابي</h1>
        <p>تعديل البيانات الشخصية وكلمة المرور</p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <User size={18} />
          <span>البيانات الشخصية</span>
        </div>
        <form onSubmit={handleUpdateProfile}>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">الاسم</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <Lock size={18} />
          <span>تغيير كلمة المرور</span>
        </div>
        <form onSubmit={handleChangePassword}>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">كلمة المرور الحالية</label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور الجديدة</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Lock size={16} />
              {saving ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}