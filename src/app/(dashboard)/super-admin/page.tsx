"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  ShieldAlert, Radio, Laptop, Smartphone, Globe, 
  MapPin, RefreshCw, AlertTriangle, 
  Users, Key, Edit, Trash2, Plus, Search, ShieldCheck, Lock, UserCheck, UserX
} from "lucide-react";

// Dynamic import for Leaflet map to avoid SSR issues
const SuperAdminMap = dynamic(() => import("./SuperAdminMap"), { ssr: false });

export default function SuperAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"telemetry" | "users">("telemetry");

  // Telemetry & Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Users Control State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // User Management Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "employee",
    status: "active",
    basicSalary: "",
  });
  const [userActionMsg, setUserActionMsg] = useState({ error: "", success: "" });
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch {}
    }
    fetchSessions();
    fetchUsers();

    const interval = setInterval(() => {
      fetchSessions();
      if (activeTab === "users") fetchUsers();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/superadmin/devices");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setAdminAccounts(data.adminAccounts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/superadmin/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // User Actions Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSaving(true);
    setUserActionMsg({ error: "", success: "" });

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormData)
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionMsg({ error: data.error || "حدث خطأ أثناء إنشاء الحساب", success: "" });
        return;
      }
      setUserActionMsg({ error: "", success: "تم إنشاء الحساب بنجاح!" });
      fetchUsers();
      setTimeout(() => {
        setIsAddUserModalOpen(false);
        setUserActionMsg({ error: "", success: "" });
        setUserFormData({ name: "", email: "", password: "", phone: "", role: "employee", status: "active", basicSalary: "" });
      }, 1500);
    } catch {
      setUserActionMsg({ error: "تعذر الاتصال بالخادم", success: "" });
    } finally {
      setActionSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionSaving(true);
    setUserActionMsg({ error: "", success: "" });

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          ...userFormData
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionMsg({ error: data.error || "حدث خطأ أثناء التحديث", success: "" });
        return;
      }
      setUserActionMsg({ error: "", success: "تم تحديث بيانات الحساب بنجاح!" });
      fetchUsers();
      fetchSessions();
      setTimeout(() => {
        setIsEditUserModalOpen(false);
        setUserActionMsg({ error: "", success: "" });
      }, 1500);
    } catch {
      setUserActionMsg({ error: "تعذر الاتصال بالخادم", success: "" });
    } finally {
      setActionSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setActionSaving(true);
    setUserActionMsg({ error: "", success: "" });

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionMsg({ error: data.error || "حدث خطأ أثناء تعيين كلمة المرور", success: "" });
        return;
      }
      setUserActionMsg({ error: "", success: "تم تغيير كلمة المرور للحساب بنجاح!" });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setUserActionMsg({ error: "", success: "" });
      }, 1500);
    } catch {
      setUserActionMsg({ error: "تعذر الاتصال بالخادم", success: "" });
    } finally {
      setActionSaving(false);
    }
  };

  const handleToggleUserStatus = async (userToToggle: any) => {
    const newStatus = userToToggle.status === "active" ? "suspended" : "active";
    try {
      await fetch("/api/superadmin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToToggle.id, status: newStatus })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userToDelete: any) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف حساب "${userToDelete.name}" نهائياً من النظام؟`)) return;
    try {
      const res = await fetch(`/api/superadmin/users?id=${userToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || "تعذر حذف الحساب");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    }
  };

  if (user && user.role !== "superadmin" && user.role !== "admin") {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <ShieldAlert size={48} color="var(--danger)" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ color: "var(--danger)" }}>غير مصرح بالدخول</h2>
        <p style={{ color: "var(--text-muted)" }}>هذه الصفحة مخصصة فقط للمشرف العام على النظام (Super Admin Arco).</p>
      </div>
    );
  }

  const onlineSessions = sessions.filter(s => (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000);

  // Filtered Users List
  const filteredUsers = allUsers.filter(u => {
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--gold-primary)" }}>
            <Radio size={26} color="var(--gold-primary)" /> لوحة الإشراف المتقدم والتحكم الشامل
          </h1>
          <p className="page-subtitle">مركز تحكم المشرف العام لمراقبة الأجهزة والجلسات وإدارة جميع حسابات النظام</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge badge-gold" style={{ padding: "8px 14px", fontSize: "13px" }}>
            👑 المشرف: {user?.name || "Arco"}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchSessions(); fetchUsers(); }}>
            <RefreshCw size={14} /> تحديث البيانات
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "6px", padding: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
        <button
          onClick={() => setActiveTab("telemetry")}
          style={{
            padding: "10px 22px", borderRadius: "9px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700, gap: "8px", display: "flex", alignItems: "center", transition: "all 0.2s",
            background: activeTab === "telemetry" ? "linear-gradient(135deg, #d4af37, #b38b22)" : "transparent",
            color: activeTab === "telemetry" ? "#000" : "var(--text-muted)",
            boxShadow: activeTab === "telemetry" ? "0 2px 12px rgba(212,175,55,0.4)" : "none"
          }}
        >
          <Radio size={16} /> مراقبة الأجهزة والجلسات المتصلة
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "10px 22px", borderRadius: "9px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700, gap: "8px", display: "flex", alignItems: "center", transition: "all 0.2s",
            background: activeTab === "users" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "transparent",
            color: activeTab === "users" ? "#fff" : "var(--text-muted)",
            border: activeTab === "users" ? "1px solid rgba(2,132,199,0.4)" : "1px solid transparent",
            boxShadow: activeTab === "users" ? "0 2px 12px rgba(2,132,199,0.3)" : "none"
          }}
        >
          <Users size={16} /> التحكم في جميع حسابات المستخدمين ({allUsers.length})
        </button>
      </div>

      {/* ===== TAB 1: TELEMETRY & DEVICES ===== */}
      {activeTab === "telemetry" && (
        <>
          {/* Stats Cards */}
          <div className="stat-grid">
            <div className="card stat-card" style={{ padding: "20px", border: "1px solid rgba(212,175,55,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>الأجهزة المتصلة مباشرة (Online)</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--success)" }}>{onlineSessions.length}</div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "var(--success)" }}>
                  <Laptop size={24} />
                </div>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>حسابات الإدارة المسجلة (الأدمن)</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--gold-primary)" }}>{adminAccounts.length}</div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(212,175,55,0.1)", color: "var(--gold-primary)" }}>
                  <ShieldCheck size={24} />
                </div>
              </div>
            </div>

            <div className="card stat-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>إجمالي جلسات الدخول المسجلة</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--info)" }}>{sessions.length}</div>
                </div>
                <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "var(--info)" }}>
                  <Globe size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Admin Devices Private Map */}
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={20} color="var(--gold-primary)" /> خريطة مواقع أجهزة الإدارة المتصلة
            </h3>
            <SuperAdminMap sessions={sessions} />
          </div>

          {/* Registered Admin Accounts Overview */}
          <div className="card" style={{ padding: "20px", border: "1px solid var(--border-gold)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={20} /> حسابات الإدارة المسجلة في النظام (جميع الأدمن)
              </h3>
              <span className="badge badge-gold">{adminAccounts.length} حساب إدارة</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>اسم حساب الأدمن</th>
                    <th>البريد الإلكتروني / اسم الدخول</th>
                    <th>نوع الصلاحية</th>
                    <th>حالة الحساب</th>
                    <th>الجلسات المسجلة</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.map((adm: any, idx: number) => {
                    const admSessions = sessions.filter(s => s.adminId === adm.id || s.username === adm.name);
                    const hasOnline = admSessions.some(s => (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000);
                    return (
                      <tr key={adm.id}>
                        <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>
                          👑 {adm.name} {hasOnline && <span className="badge badge-success" style={{ fontSize: "10px", marginRight: "6px" }}>متصل الآن</span>}
                        </td>
                        <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>{adm.email}</td>
                        <td>
                          <span className={`badge ${adm.role === "superadmin" ? "badge-gold" : "badge-info"}`}>
                            {adm.role === "superadmin" ? "مشرف عام (Super Admin)" : "مدير نظام (Admin)"}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success">{adm.status === "active" ? "نشط ومفعل" : adm.status}</span>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {admSessions.length > 0 ? (
                            <span>{admSessions.length} أجهزة ({admSessions[0].deviceName})</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>لا توجد جلسات مسجلة</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Devices Sessions Table */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <Laptop size={20} color="var(--gold-primary)" /> سجل الأجهزة والجلسات المسجلة لأي حساب أدمن
              </h3>
              <span className="badge badge-gold">{sessions.length} جلسة مسجلة</span>
            </div>

            {sessions.length === 0 ? (
              <div className="empty-state">
                <AlertTriangle size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p>لا توجد جلسات مسجلة بعد.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>المستخدم</th>
                      <th>الجهاز / النظام</th>
                      <th>عنوان IP</th>
                      <th>المتصفح (User Agent)</th>
                      <th>آخر ظهور</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: any, idx: number) => {
                      const isOnline = (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000;
                      return (
                        <tr key={s.id}>
                          <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>{s.username}</td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {s.deviceName?.includes("iPhone") || s.deviceName?.includes("Android") || s.deviceName?.includes("Mobile") ? <Smartphone size={15} /> : <Laptop size={15} />}
                              {s.deviceName || "جهاز غير محدد"}
                            </span>
                          </td>
                          <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: "12px" }}>
                            {s.ipAddress || "127.0.0.1"}
                          </td>
                          <td style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.userAgent}>
                            {s.userAgent?.substring(0, 45)}...
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            {new Date(s.lastSeen).toLocaleString("ar-EG")}
                          </td>
                          <td>
                            <span className={`badge ${isOnline ? "badge-success" : "badge-muted"}`}>
                              {isOnline ? "🟢 متصل الآن" : "⚪ غير نشط"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== TAB 2: USERS ACCOUNTS CONTROL CENTER ===== */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header & Quick Action */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={22} color="var(--gold-primary)" /> مركز التحكم وإدارة جميع حسابات النظام
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                إمكانية تعديل صلاحيات أي حساب، تغيير كلمة المرور فورياً، تفعيل أو إيقاف الحسابات، وإنشاء حسابات جديدة.
              </p>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => {
                setUserFormData({ name: "", email: "", password: "", phone: "", role: "employee", status: "active", basicSalary: "" });
                setUserActionMsg({ error: "", success: "" });
                setIsAddUserModalOpen(true);
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={16} /> إضافة مستخدم / مسؤول جديد
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="بحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ paddingRight: "36px" }}
                />
                <Search size={16} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>

              <select 
                className="form-control" 
                value={userRoleFilter} 
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ width: "auto", minWidth: "140px" }}
              >
                <option value="all">جميع الصلاحيات</option>
                <option value="superadmin">المشرف العام (Super Admin)</option>
                <option value="admin">مدير نظام (Admin)</option>
                <option value="hr">إدارة الموارد البشرية (HR)</option>
                <option value="employee">موظف (Employee)</option>
                <option value="delegate">مندوب ميداني (Delegate)</option>
              </select>

              <select 
                className="form-control" 
                value={userStatusFilter} 
                onChange={(e) => setUserStatusFilter(e.target.value)}
                style={{ width: "auto", minWidth: "130px" }}
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط / مفعل</option>
                <option value="suspended">موقوف عقابياً</option>
                <option value="leave">في إجازة</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="card" style={{ padding: "20px" }}>
            {usersLoading ? (
              <div className="loading-spinner"><div className="spinner"></div></div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <AlertTriangle size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                <p>لا توجد حسابات مطابقة للبحث.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>الاسم والبيانات</th>
                      <th>البريد الإلكتروني / الدخول</th>
                      <th>الصلاحية (الدور)</th>
                      <th>حالة الحساب</th>
                      <th>الراتب الأساسي</th>
                      <th>القسم</th>
                      <th style={{ textAlign: "center" }}>الإجراءات والتحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any, idx: number) => {
                      const isSuper = u.role === "superadmin";
                      const isAdminRole = u.role === "admin";
                      const isHR = u.role === "hr";
                      const isSuspended = u.status === "suspended";

                      return (
                        <tr key={u.id}>
                          <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{u.name}</div>
                            {u.phone && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.phone}</div>}
                          </td>
                          <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: "13px" }}>
                            {u.email}
                          </td>
                          <td>
                            <span className={`badge ${isSuper ? "badge-gold" : isAdminRole ? "badge-info" : isHR ? "badge-warning" : "badge-secondary"}`}>
                              {isSuper ? "👑 مشرف عام" : isAdminRole ? "🛡️ مدير نظام" : isHR ? "👔 موارد بشرية" : u.role === "delegate" ? "🚗 مندوب" : "👤 موظف"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${isSuspended ? "badge-danger" : u.status === "active" ? "badge-success" : "badge-warning"}`}>
                              {isSuspended ? "⛔ موقوف" : u.status === "active" ? "✅ نشط" : u.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {u.basicSalary ? `${u.basicSalary.toLocaleString("ar-EG")} ج.م` : "—"}
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                            {u.department?.name || "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                              {/* Reset Password Button */}
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewPassword("");
                                  setUserActionMsg({ error: "", success: "" });
                                  setIsPasswordModalOpen(true);
                                }}
                                title="تغيير كلمة المرور فورياً"
                                style={{ padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <Key size={13} /> كلمة المرور
                              </button>

                              {/* Edit Details Button */}
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setUserFormData({
                                    name: u.name || "",
                                    email: u.email || "",
                                    password: "",
                                    phone: u.phone || "",
                                    role: u.role || "employee",
                                    status: u.status || "active",
                                    basicSalary: u.basicSalary ? u.basicSalary.toString() : "",
                                  });
                                  setUserActionMsg({ error: "", success: "" });
                                  setIsEditUserModalOpen(true);
                                }}
                                title="تعديل بيانات وصلاحيات الحساب"
                                style={{ padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <Edit size={13} /> تعديل
                              </button>

                              {/* Suspend / Activate Toggle */}
                              <button
                                className={`btn btn-sm ${isSuspended ? "btn-primary" : "btn-secondary"}`}
                                onClick={() => handleToggleUserStatus(u)}
                                title={isSuspended ? "تفعيل الحساب" : "إيقاف الحساب"}
                                style={{ padding: "6px 8px" }}
                              >
                                {isSuspended ? <UserCheck size={14} /> : <UserX size={14} color="var(--danger)" />}
                              </button>

                              {/* Delete Button */}
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(u)}
                                title="حذف الحساب نهائياً"
                                style={{ padding: "6px 8px" }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

      {/* CREATE NEW USER MODAL */}
      {isAddUserModalOpen && (
        <div className="modal-overlay" onClick={() => !actionSaving && setIsAddUserModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-primary)" }}>
                <Plus size={20} /> إنشاء حساب مستخدم / مسؤول جديد
              </h3>
              <button className="modal-close" onClick={() => setIsAddUserModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {userActionMsg.error && <div className="alert alert-danger">{userActionMsg.error}</div>}
                {userActionMsg.success && <div className="alert alert-success">{userActionMsg.success}</div>}

                <div className="form-group">
                  <label className="form-label">الاسم الكامل <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: أحمد محمود"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">البريد أو اسم الدخول <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="user@example.com"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">كلمة المرور الأولية <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="123456"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">نوع الصلاحية (الدور) <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select
                      className="form-control"
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      <option value="employee">موظف عادي (Employee)</option>
                      <option value="delegate">مندوب ميداني (Delegate)</option>
                      <option value="hr">إدارة الموارد البشرية (HR)</option>
                      <option value="admin">مدير نظام (Admin)</option>
                      <option value="superadmin">مشرف عام (Super Admin)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة الحساب</label>
                    <select
                      className="form-control"
                      value={userFormData.status}
                      onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    >
                      <option value="active">نشط ومفعل</option>
                      <option value="suspended">موقوف عقابياً</option>
                      <option value="leave">في إجازة</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="01012345678"
                      value={userFormData.phone}
                      onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الراتب الأساسي (ج.م)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="5000"
                      value={userFormData.basicSalary}
                      onChange={(e) => setUserFormData({ ...userFormData, basicSalary: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddUserModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionSaving}>
                  {actionSaving ? "جاري الحفظ..." : "تأكيد إنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {isEditUserModalOpen && selectedUser && (
        <div className="modal-overlay" onClick={() => !actionSaving && setIsEditUserModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-primary)" }}>
                <Edit size={20} /> تعديل بيانات وصلاحيات: {selectedUser.name}
              </h3>
              <button className="modal-close" onClick={() => setIsEditUserModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {userActionMsg.error && <div className="alert alert-danger">{userActionMsg.error}</div>}
                {userActionMsg.success && <div className="alert alert-success">{userActionMsg.success}</div>}

                <div className="form-group">
                  <label className="form-label">الاسم</label>
                  <input
                    type="text"
                    className="form-control"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الصلاحية (الدور)</label>
                    <select
                      className="form-control"
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      <option value="employee">موظف عادي (Employee)</option>
                      <option value="delegate">مندوب ميداني (Delegate)</option>
                      <option value="hr">إدارة الموارد البشرية (HR)</option>
                      <option value="admin">مدير نظام (Admin)</option>
                      <option value="superadmin">مشرف عام (Super Admin)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">حالة الحساب</label>
                    <select
                      className="form-control"
                      value={userFormData.status}
                      onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    >
                      <option value="active">نشط ومفعل</option>
                      <option value="suspended">موقوف عقابياً</option>
                      <option value="leave">في إجازة</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userFormData.phone}
                      onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الراتب الأساسي (ج.م)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={userFormData.basicSalary}
                    onChange={(e) => setUserFormData({ ...userFormData, basicSalary: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditUserModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionSaving}>
                  {actionSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isPasswordModalOpen && selectedUser && (
        <div className="modal-overlay" onClick={() => !actionSaving && setIsPasswordModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-primary)" }}>
                <Lock size={20} /> تعيين كلمة مرور جديدة: {selectedUser.name}
              </h3>
              <button className="modal-close" onClick={() => setIsPasswordModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {userActionMsg.error && <div className="alert alert-danger">{userActionMsg.error}</div>}
                {userActionMsg.success && <div className="alert alert-success">{userActionMsg.success}</div>}

                <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "13px" }}>
                  الحساب: <strong style={{ color: "var(--gold-primary)" }}>{selectedUser.name}</strong> ({selectedUser.email})
                </div>

                <div className="form-group">
                  <label className="form-label">كلمة المرور الجديدة <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أدخل كلمة المرور الجديدة (4 أحرف على الأقل)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={actionSaving}>
                  {actionSaving ? "جاري الحفظ..." : "تأكيد تعيين كلمة المرور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
