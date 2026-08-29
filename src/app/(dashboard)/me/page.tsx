"use client";
import { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertCircle, DollarSign, Star, FileText, Plus, LogIn, LogOut, MapPin } from "lucide-react";

export default function EmployeePortal() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [leaveType, setLeaveType] = useState("vacation");
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveDuration, setLeaveDuration] = useState("1");
  const [leaveReason, setLeaveReason] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function loadInitialData() {
      setLoading(true);
      const res = await fetch("/api/me");
      if (!res.ok) { 
        if (mounted) setLoading(false); 
        return; 
      }
      const d = await res.json();
      if (mounted) {
        setData(d);
        setLoading(false);
      }
    }
    loadInitialData();
    fetch("/api/settings").then(r => r.json()).then(d => { if (mounted) setCompany(d); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function refreshData() {
    const res = await fetch("/api/me");
    if (!res.ok) return;
    const d = await res.json();
    setData(d);
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("جهازك لا يدعم تحديد الموقع");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      // Check if within 5 meters of company
      if (company?.geofenceLat && company?.geofenceLng) {
        const dist = getDistance(latitude, longitude, company.geofenceLat, company.geofenceLng);
        if (dist > 5) {
          setLocationError(`أنت على بُعد ${Math.round(dist)} متر من الشركة. يجب أن تكون داخل نطاق 5 أمتار لتسجيل الحضور.`);
          setCheckingIn(false);
          return;
        }
      }

      const today = data?.todayAttendance;
      const isCheckIn = !today?.checkIn;

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, type: isCheckIn ? "in" : "out" })
      });

      if (res.ok) {
        await refreshData();
      } else {
        const d = await res.json();
        setLocationError(d.error || "حدث خطأ");
      }
      setCheckingIn(false);
    }, (err) => {
      setLocationError("تعذّر الحصول على موقعك. يرجى السماح بالوصول للموقع.");
      setCheckingIn(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async function submitAdvance() {
    const res = await fetch("/api/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(advanceAmount), reason: advanceReason })
    });
    const d = await res.json();
    if (res.ok) {
      setSubmitMsg("✅ تم إرسال طلب السلفة بنجاح");
      setShowAdvanceForm(false);
      setAdvanceAmount(""); setAdvanceReason("");
      refreshData();
    } else {
      setSubmitMsg("❌ " + d.error);
    }
    setTimeout(() => setSubmitMsg(""), 4000);
  }

  async function submitLeave() {
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: leaveType, date: leaveDate, duration: Number(leaveDuration), reason: leaveReason })
    });
    const d = await res.json();
    if (res.ok) {
      setSubmitMsg("✅ تم إرسال الطلب بنجاح");
      setShowLeaveForm(false);
      setLeaveReason("");
      refreshData();
    } else {
      setSubmitMsg("❌ " + d.error);
    }
    setTimeout(() => setSubmitMsg(""), 4000);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" style={{ width: 48, height: 48, border: "4px solid var(--border)", borderTopColor: "var(--gold-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
      <p style={{ color: "var(--text-muted)" }}>جاري التحميل...</p>
    </div>
  );

  if (!data) return (
    <div style={{ textAlign: "center", padding: 50, color: "var(--danger)" }}>
      <h2>تعذّر تحميل البيانات</h2>
      <button onClick={refreshData} className="btn btn-primary mt-4">إعادة المحاولة</button>
    </div>
  );

  const { employee, todayAttendance, stats, payroll, evaluation, advances, leaveRequests } = data;
  const hasCheckedIn = !!todayAttendance?.checkIn;
  const hasCheckedOut = !!todayAttendance?.checkOut;
  const lateHours = Math.floor(stats.totalLateMinutes / 60);
  const lateMinutesRem = stats.totalLateMinutes % 60;
  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20, padding: "24px", background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(0,0,0,0))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#000" }}>
            {employee.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--gold-primary)" }}>مرحباً، {employee.name} 👋</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>{employee.department?.name} • {employee.shift?.name} • {today}</p>
          </div>
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          <MapPin size={18} style={{ color: "var(--gold-primary)", marginLeft: 8 }} />
          تسجيل الحضور والانصراف
        </h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {/* Check-in status */}
          <div style={{ padding: "12px 20px", borderRadius: 10, background: hasCheckedIn ? "var(--success-bg)" : "var(--bg-secondary)", border: `1px solid ${hasCheckedIn ? "var(--success)" : "var(--border)"}`, flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>وقت الحضور</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: hasCheckedIn ? "var(--success)" : "var(--text-muted)" }}>
              {todayAttendance?.checkIn || "--:--"}
            </div>
          </div>
          <div style={{ padding: "12px 20px", borderRadius: 10, background: hasCheckedOut ? "var(--danger-bg)" : "var(--bg-secondary)", border: `1px solid ${hasCheckedOut ? "var(--danger)" : "var(--border)"}`, flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>وقت الانصراف</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: hasCheckedOut ? "var(--danger)" : "var(--text-muted)" }}>
              {todayAttendance?.checkOut || "--:--"}
            </div>
          </div>
        </div>

        {locationError && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "var(--danger)", fontSize: 13 }}>
            {locationError}
          </div>
        )}

        {!hasCheckedOut && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 16, borderRadius: 12 }}
          >
            {checkingIn ? "جاري تحديد موقعك..." : hasCheckedIn ? <><LogOut size={20} /> تسجيل الانصراف</> : <><LogIn size={20} /> تسجيل الحضور</>}
          </button>
        )}
        {hasCheckedOut && (
          <div style={{ textAlign: "center", padding: "10px", color: "var(--success)", fontWeight: 700 }}>
            <CheckCircle size={20} style={{ marginLeft: 8 }} /> تم تسجيل حضورك وانصرافك اليوم ✅
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircle /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.presentDays}</div>
            <div className="stat-label">أيام الحضور</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><AlertCircle /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.absentDays}</div>
            <div className="stat-label">أيام الغياب</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Clock /></div>
          <div className="stat-info">
            <div className="stat-value">{lateHours > 0 ? `${lateHours}س ${lateMinutesRem}د` : `${stats.totalLateMinutes}د`}</div>
            <div className="stat-label">إجمالي التأخير</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold"><Star /></div>
          <div className="stat-info">
            <div className="stat-value">{evaluation ? `${evaluation.totalScore}%` : "—"}</div>
            <div className="stat-label">تقييم الشهر</div>
          </div>
        </div>
      </div>

      {/* Salary & Advance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Salary */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={18} /> مرتب الشهر
          </h3>
          {payroll ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>{payroll.netSalary.toLocaleString("ar-EG")} <span style={{ fontSize: 14 }}>جنيه</span></div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>الأساسي: {payroll.basicSalary.toLocaleString("ar-EG")} • خصم: {payroll.autoDeduction.toLocaleString("ar-EG")}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${payroll.status === "paid" ? "badge-success" : "badge-warning"}`}>
                  {payroll.status === "paid" ? "✅ مدفوع" : "⏳ قيد المراجعة"}
                </span>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>لا توجد بيانات مرتب هذا الشهر</p>
          )}
        </div>

        {/* Advance */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} /> السلفة
          </h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            الحد الأقصى: <strong>{advances.maxLimit.toLocaleString("ar-EG")} جنيه</strong>
          </div>
          <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 8 }}>
            المستحق: <strong>{advances.totalOwed.toLocaleString("ar-EG")} جنيه</strong>
          </div>
          <div style={{ fontSize: 13, color: "var(--success)", marginBottom: 12 }}>
            المتاح: <strong>{advances.available.toLocaleString("ar-EG")} جنيه</strong>
          </div>
          <button onClick={() => setShowAdvanceForm(true)} className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
            <Plus size={14} /> طلب سلفة
          </button>
        </div>
      </div>

      {/* Leave Requests */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--text-primary)" }}>طلبات الإذن والإجازة</h3>
          <button onClick={() => setShowLeaveForm(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> طلب جديد
          </button>
        </div>
        {leaveRequests.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>لا توجد طلبات مسبقة</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leaveRequests.map((req: any) => (
              <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {req.type === "vacation" ? "إجازة" : req.type === "early_leave" ? "انصراف مبكر" : "غياب"} — {req.date}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{req.reason}</div>
                </div>
                <span className={`badge ${req.status === "approved" ? "badge-success" : req.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                  {req.status === "approved" ? "موافق" : req.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Tasks */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--text-primary)" }}>المهام المسندة إليك</h3>
        </div>
        {!data.tasks || data.tasks.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>لا توجد مهام مسندة إليك حالياً</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.tasks.map((task: any) => (
              <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{task.description}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                    بواسطة: {task.assigner?.name || "الإدارة"} • تاريخ التسليم: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}
                  </div>
                </div>
                <span className={`badge ${task.status === "completed" ? "badge-success" : task.status === "in_progress" ? "badge-info" : "badge-warning"}`}>
                  {task.status === "completed" ? "مكتملة" : task.status === "in_progress" ? "قيد التنفيذ" : "معلقة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation */}
      {evaluation && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "var(--gold-primary)" }}>
            <Star size={18} style={{ marginLeft: 8 }} /> آخر تقييم شهري
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-secondary)", borderRadius: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)" }}>{evaluation.attendanceScore}%</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>تقييم الحضور</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "var(--bg-secondary)", borderRadius: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--info)" }}>{evaluation.tasksScore}%</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>تقييم المهام</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "linear-gradient(135deg, rgba(212,175,55,0.2), transparent)", borderRadius: 10, border: "1px solid var(--border-gold)" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--gold-primary)" }}>{evaluation.totalScore}%</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>التقييم الكلي</div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Form Modal */}
      {showAdvanceForm && (
        <div className="modal-overlay" onClick={() => setShowAdvanceForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">طلب سلفة</h3>
              <button className="modal-close" onClick={() => setShowAdvanceForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "var(--gold-subtle)", borderRadius: 8, fontSize: 13 }}>
                الحد المتاح: <strong style={{ color: "var(--gold-primary)" }}>{advances.available.toLocaleString("ar-EG")} جنيه</strong>
              </div>
              <div className="form-group">
                <label className="form-label">المبلغ المطلوب (جنيه)</label>
                <input type="number" className="form-control" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="أدخل المبلغ" />
              </div>
              <div className="form-group">
                <label className="form-label">السبب</label>
                <textarea className="form-control" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="اكتب سبب طلب السلفة" rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdvanceForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={submitAdvance} disabled={!advanceAmount || !advanceReason}>إرسال الطلب</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Form Modal */}
      {showLeaveForm && (
        <div className="modal-overlay" onClick={() => setShowLeaveForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">طلب إذن / إجازة</h3>
              <button className="modal-close" onClick={() => setShowLeaveForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">نوع الطلب</label>
                <select className="form-control" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  <option value="vacation">إجازة</option>
                  <option value="early_leave">انصراف مبكر</option>
                  <option value="absence">غياب بإذن</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">التاريخ</label>
                  <input type="date" className="form-control" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{leaveType === "early_leave" ? "عدد الساعات" : "عدد الأيام"}</label>
                  <input type="number" className="form-control" value={leaveDuration} onChange={e => setLeaveDuration(e.target.value)} min="0.5" step="0.5" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">السبب</label>
                <textarea className="form-control" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="اكتب سبب الطلب" rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLeaveForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={submitLeave} disabled={!leaveReason}>إرسال الطلب</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit message */}
      {submitMsg && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--bg-modal)", border: "1px solid var(--border-gold)", borderRadius: 12, padding: "12px 24px", fontSize: 14, zIndex: 999 }}>
          {submitMsg}
        </div>
      )}
    </div>
  );
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
