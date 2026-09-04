"use client";
import { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertCircle, DollarSign, Star, FileText, Plus, LogIn, LogOut, MapPin, Play, Loader2 } from "lucide-react";

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
  const [myRoutes, setMyRoutes] = useState<any[]>([]);

  // Unable to reach modal state
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [isUnableModalOpen, setIsUnableModalOpen] = useState(false);
  const [unableReason, setUnableReason] = useState("");
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

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
    
    // Fetch today's assigned field route if any
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/routes?date=${today}`)
      .then(r => r.json())
      .then(d => { if (mounted && Array.isArray(d)) setMyRoutes(d); })
      .catch(() => {});

    // Continuous High-Accuracy Location Tracking Service (Real-time watch + 1-minute interval)
    let watchId: number | null = null;
    let lastSent = 0;
    let locInterval: any = null;

    const postLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastSent < 20000) return; // Debounce to max once per 20s
      lastSent = now;
      try {
        await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lng })
        });
      } catch {}
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => postLocation(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      } catch {}

      const sendPeriodicLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => postLocation(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: true }
        );
      };

      sendPeriodicLocation();
      locInterval = setInterval(sendPeriodicLocation, 60000); // 1 minute
    }

    return () => { 
      mounted = false; 
      if (watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (locInterval) clearInterval(locInterval);
    };
  }, []);

  const handleVisitCheckpoint = async (checkpointId: number) => {
    try {
      const res = await fetch(`/api/routes/checkpoints/${checkpointId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "visited" })
      });
      if (res.ok) {
        const today = new Date().toISOString().split("T")[0];
        const rRes = await fetch(`/api/routes?date=${today}`);
        const rData = await rRes.json();
        if (Array.isArray(rData)) setMyRoutes(rData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openUnableModal = (cp: any) => {
    setSelectedCheckpoint(cp);
    setUnableReason("");
    setIsUnableModalOpen(true);
  };

  const handleUnableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckpoint || !unableReason.trim()) return;
    setSavingCheckpoint(true);
    try {
      const res = await fetch(`/api/routes/checkpoints/${selectedCheckpoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped", notes: unableReason.trim() })
      });
      if (res.ok) {
        setIsUnableModalOpen(false);
        const today = new Date().toISOString().split("T")[0];
        fetch(`/api/routes?date=${today}`)
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setMyRoutes(d); });
      }
    } finally {
      setSavingCheckpoint(false);
    }
  };

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
      setLocationError("جهازك لا يدعم تحديد الموقع GPS");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Check if within allowed distance of company
        if (company?.geofenceLat && company?.geofenceLng) {
          const dist = getDistance(latitude, longitude, company.geofenceLat, company.geofenceLng);
          const baseRadius = Math.max(company.geofenceRadius || 20, 20);
          const accuracyBonus = Math.min(accuracy || 0, 15);
          const allowedDist = baseRadius + accuracyBonus;

          if (dist > allowedDist) {
            setLocationError(`أنت على بُعد ${Math.round(dist)} متر من مقر الشركة. يجب أن تكون داخل نطاق المقر لتسجيل الحضور/الانصراف.`);
            setCheckingIn(false);
            return;
          }
        }

        const today = data?.todayAttendance;
        const isCheckIn = !today?.checkIn;

        const res = await fetch("/api/attendance/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            latitude, 
            longitude, 
            accuracy, 
            type: isCheckIn ? "in" : "out" 
          })
        });

        if (res.ok) {
          await refreshData();
        } else {
          const d = await res.json();
          setLocationError(d.error || "حدث خطأ أثناء تسجيل الحضور/الانصراف");
        }
        setCheckingIn(false);
      },
      (err) => {
        setLocationError("تعذّر الحصول على إحداثيات موقعك بدقة. يرجى تفعيل الـ GPS والسماح بالوصول للموقع.");
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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
      <div className="card" style={{ marginBottom: 20, padding: "24px", background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(var(--black-rgb),0))" }}>
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

      {/* Field Route Card (For delegates / assigned routes) */}
      {myRoutes.length > 0 && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px", border: "1px solid var(--border-gold)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={20} /> خط السير اليومي والمحطات المطلوبة
          </h3>
          
          {myRoutes.map((rt: any) => {
            const total = rt.checkpoints?.length || 0;
            const visited = rt.checkpoints?.filter((c: any) => c.status === "visited").length || 0;
            const pct = total > 0 ? Math.round((visited / total) * 100) : 0;

            return (
              <div key={rt.id} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "15px" }}>{rt.title}</strong>
                  <span className={`badge ${pct === 100 ? "badge-success" : "badge-gold"}`}>{pct}% مكتمل</span>
                </div>

                <div className="progress-bar" style={{ height: "8px" }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : undefined }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  {rt.checkpoints?.map((cp: any) => (
                    <div 
                      key={cp.id}
                      style={{ 
                        padding: "12px 14px", borderRadius: "8px", 
                        background: cp.status === "visited" ? "rgba(16,185,129,0.08)" : "rgba(var(--white-rgb),0.02)",
                        border: `1px solid ${cp.status === "visited" ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: cp.status === "visited" ? "var(--success)" : "var(--text-primary)" }}>
                          #{cp.order} {cp.clientName}
                        </div>
                        {cp.address && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>{cp.address}</div>}
                        {cp.phone && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>هاتف: {cp.phone}</div>}
                      </div>

                      {cp.status === "visited" ? (
                        <span className="badge badge-success" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={14} /> تمت الزيارة بنجاح
                        </span>
                      ) : cp.status === "skipped" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={14} /> تعذر الوصول ({cp.notes || "غير محدد"})
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleVisitCheckpoint(cp.id)}
                            style={{ fontSize: "11px", padding: "4px 8px" }}
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleVisitCheckpoint(cp.id)}
                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <CheckCircle size={14} /> تأكيد زيارة العميل
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openUnableModal(cp)}
                            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                          >
                            <AlertCircle size={14} /> تعذر الوصول
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Advance Requests History */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} color="var(--gold-primary)" /> سجل ومتابعة طلبات السلف وموقف الاعتماد
          </h3>
          <button onClick={() => setShowAdvanceForm(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> طلب سلفة جديدة
          </button>
        </div>
        {!advances.requests || advances.requests.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>لا توجد طلبات سلف سابقة مسجلة</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {advances.requests.map((adv: any) => {
              const isApproved = adv.status === "approved";
              const isRejected = adv.status === "rejected";
              const isPending = adv.status === "pending";
              const remaining = isApproved ? Math.max(0, adv.approvedAmount - adv.repaidAmount) : 0;

              return (
                <div 
                  key={adv.id} 
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "14px 16px", 
                    borderRadius: 10, 
                    background: "var(--bg-secondary)", 
                    border: `1px solid ${isApproved ? "rgba(16,185,129,0.3)" : isRejected ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                    flexWrap: "wrap",
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                        {adv.amount?.toLocaleString("ar-EG")} جنيه
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        بتاريخ {adv.date || new Date(adv.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    {adv.reason && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                        السبب: {adv.reason}
                      </div>
                    )}
                    {isApproved && (
                      <div style={{ fontSize: 12, color: "var(--gold-primary)", marginTop: 4, fontWeight: 600 }}>
                        المعتمد: {adv.approvedAmount?.toLocaleString("ar-EG")} ج.م • تم سداد: {adv.repaidAmount?.toLocaleString("ar-EG")} ج.م • المتبقي: {remaining.toLocaleString("ar-EG")} ج.م
                      </div>
                    )}
                  </div>

                  <div>
                    <span className={`badge ${isApproved ? "badge-success" : isRejected ? "badge-danger" : "badge-warning"}`} style={{ padding: "6px 12px", fontSize: "12px" }}>
                      {isApproved ? "✅ تمت الموافقة والاعتماد" : isRejected ? "❌ تم الرفض" : "⏳ قيد المراجعة والتدقيق"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.tasks.map((task: any) => (
              <div key={task.id} style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{task.description}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                      بواسطة: {task.assigner?.name || "الإدارة"} • تاريخ التسليم: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}
                    </div>
                  </div>
                  <span className={`badge ${task.status === "completed" ? "badge-success" : task.status === "in_progress" ? "badge-info" : "badge-warning"}`} style={{ flexShrink: 0, marginRight: 8 }}>
                    {task.status === "completed" ? "✅ مكتملة" : task.status === "in_progress" ? "⏳ قيد التنفيذ" : "⏸ معلقة"}
                  </span>
                </div>
                {/* Task Action Button */}
                {task.status !== "completed" && (
                  <button
                    disabled={updatingTaskId === task.id}
                    onClick={async () => {
                      setUpdatingTaskId(task.id);
                      const nextStatus = task.status === "in_progress" ? "completed" : "in_progress";
                      try {
                        const res = await fetch(`/api/tasks/${task.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: nextStatus }),
                        });
                        if (res.ok) {
                          setData((prev: any) => ({
                            ...prev,
                            tasks: prev.tasks.map((t: any) =>
                              t.id === task.id ? { ...t, status: nextStatus } : t
                            ),
                          }));
                        }
                      } catch {}
                      setUpdatingTaskId(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "none",
                      cursor: updatingTaskId === task.id ? "wait" : "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.2s",
                      background: task.status === "in_progress"
                        ? "linear-gradient(135deg, #059669, #10b981)"
                        : "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))",
                      color: "#fff",
                      boxShadow: task.status === "in_progress"
                        ? "0 4px 15px rgba(16, 185, 129, 0.3)"
                        : "0 4px 15px rgba(212, 175, 55, 0.3)",
                    }}
                  >
                    {updatingTaskId === task.id ? (
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    ) : task.status === "in_progress" ? (
                      <><CheckCircle size={16} /> إكمال المهمة وتسليمها</>
                    ) : (
                      <><Play size={16} /> بدء تنفيذ المهمة</>
                    )}
                  </button>
                )}
                {task.status === "completed" && (
                  <div style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    color: "var(--success)",
                    fontSize: 13,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}>
                    <CheckCircle size={16} /> تم إكمال المهمة بنجاح ✅
                  </div>
                )}
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

      {/* UNABLE TO REACH MODAL */}
      {isUnableModalOpen && selectedCheckpoint && (
        <div className="modal-overlay" onClick={() => !savingCheckpoint && setIsUnableModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
                <AlertCircle size={20} /> تسجيل سبب تعذر زيارة العميل
              </h3>
              <button className="modal-close" onClick={() => setIsUnableModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleUnableSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(var(--white-rgb),0.03)", fontSize: "13px" }}>
                  العميل: <strong style={{ color: "var(--gold-primary)" }}>{selectedCheckpoint.clientName}</strong>
                  {selectedCheckpoint.address && <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: 2 }}>العنوان: {selectedCheckpoint.address}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">سبب تعذر الوصول / إلغاء الزيارة <span style={{ color: "var(--danger)" }}>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="اكتب سبب عدم إتمام الزيارة بالتفصيل (مثل: المحل مغلق، لم يتم الرد، العميل طلب التأجيل...)"
                    value={unableReason}
                    onChange={(e) => setUnableReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Quick Suggestion Tags */}
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: 6 }}>أسباب شائعة سريعة (انقر للاختيار):</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["مقر العميل مغلق", "عدم تواجد المسؤول", "العنوان غير مطابق", "طلب العميل تأجيل الموعد", "تعذر الاتصال هاتفياً"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setUnableReason(tag)}
                        style={{
                          background: "rgba(212,175,55,0.08)",
                          border: "1px solid rgba(212,175,55,0.2)",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          cursor: "pointer"
                        }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsUnableModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-danger" disabled={savingCheckpoint}>
                  {savingCheckpoint ? "جاري الإرسال..." : "تأكيد تعذر الزيارة"}
                </button>
              </div>
            </form>
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
