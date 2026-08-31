"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Users, AlertTriangle, Search, Plus, Navigation, CheckCircle2, Clock, Trash2, Calendar, Edit, Edit2 } from "lucide-react";

// Dynamic import for Leaflet map to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

export default function TrackingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "delegate" | "outOfRange"
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Route Creation & Editing State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [delegates, setDelegates] = useState<any[]>([]);
  const [routeTitle, setRouteTitle] = useState("");
  const [selectedDelegateId, setSelectedDelegateId] = useState("");
  const [checkpoints, setCheckpoints] = useState<any[]>([
    { clientName: "", address: "", phone: "", lat: 30.0444, lng: 31.2357 }
  ]);
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState({ error: "", success: "" });

  useEffect(() => {
    fetchLocationData();
    fetchDelegates();
    const interval = setInterval(fetchLocationData, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const fetchLocationData = async () => {
    try {
      const res = await fetch(`/api/location?date=${selectedDate}`);
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDelegates = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const emps = await res.json();
        if (Array.isArray(emps)) {
          setDelegates(emps);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddRouteModal = () => {
    setEditingRoute(null);
    setRouteTitle("");
    setSelectedDelegateId("");
    setCheckpoints([{ clientName: "", address: "", phone: "", lat: 30.0444, lng: 31.2357 }]);
    setRouteMsg({ error: "", success: "" });
    setIsRouteModalOpen(true);
  };

  const openEditRouteModal = (rt: any) => {
    setEditingRoute(rt);
    setRouteTitle(rt.title);
    setSelectedDelegateId(rt.delegateId || rt.delegate?.id || "");
    setCheckpoints(
      rt.checkpoints && rt.checkpoints.length > 0
        ? rt.checkpoints.map((cp: any) => ({
            clientName: cp.clientName || "",
            address: cp.address || "",
            phone: cp.phone || "",
            lat: cp.lat || 30.0444,
            lng: cp.lng || 31.2357,
            status: cp.status || "pending",
            notes: cp.notes || null,
          }))
        : [{ clientName: "", address: "", phone: "", lat: 30.0444, lng: 31.2357 }]
    );
    setRouteMsg({ error: "", success: "" });
    setIsRouteModalOpen(true);
  };

  const handleDeleteRoute = async (rt: any) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف خط السير "${rt.title}" للمندوب ${rt.delegate?.name || ""}?`)) return;
    try {
      const res = await fetch(`/api/routes?id=${rt.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLocationData();
      } else {
        const d = await res.json();
        alert(d.error || "تعذر حذف خط السير");
      }
    } catch {
      alert("تعذر الاتصال بالخادم");
    }
  };

  const addCheckpointRow = () => {
    setCheckpoints(prev => [
      ...prev,
      { clientName: "", address: "", phone: "", lat: 30.0444, lng: 31.2357 }
    ]);
  };

  const removeCheckpointRow = (idx: number) => {
    setCheckpoints(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCheckpoint = (idx: number, field: string, value: any) => {
    setCheckpoints(prev => prev.map((cp, i) => i === idx ? { ...cp, [field]: value } : cp));
  };

  const handleCreateOrUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRoute(true);
    setRouteMsg({ error: "", success: "" });

    try {
      const method = editingRoute ? "PUT" : "POST";
      const body: any = {
        delegateId: selectedDelegateId,
        date: selectedDate,
        title: routeTitle,
        checkpoints
      };
      if (editingRoute) body.id = editingRoute.id;

      const res = await fetch("/api/routes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const resData = await res.json();
      if (!res.ok) {
        setRouteMsg({ error: resData.error || "فشل في حفظ خط السير", success: "" });
        return;
      }

      setRouteMsg({ error: "", success: editingRoute ? "تم تعديل خط السير بنجاح!" : "تم إنشاء خط السير بنجاح وإسناده للمندوب!" });
      fetchLocationData();
      setTimeout(() => {
        setIsRouteModalOpen(false);
        setRouteMsg({ error: "", success: "" });
        setEditingRoute(null);
        setRouteTitle("");
        setSelectedDelegateId("");
        setCheckpoints([{ clientName: "", address: "", phone: "", lat: 30.0444, lng: 31.2357 }]);
      }, 1500);
    } catch {
      setRouteMsg({ error: "تعذر الاتصال بالخادم", success: "" });
    } finally {
      setSavingRoute(false);
    }
  };

  if (loading && !data) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  const employees = data?.employees || [];
  const geofence = data?.geofence;
  const stats = data?.stats;
  const routes: any[] = data?.routes || [];

  const filteredEmployees = employees.filter((emp: any) => {
    if (search && !emp.name.includes(search)) return false;
    if (filter === "delegate" && emp.role !== "delegate") return false;
    if (filter === "outOfRange" && !emp.lastLocation?.isOutOfRange) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">
            <span className="page-title-icon" style={{ color: "var(--gold-primary)" }}>📍</span> تتبع المواقع وخطوط السير
          </h1>
          <p className="page-subtitle">تتبع مباشر لمواقع الموظفين والمناديب ومتابعة إنجاز خطوط السير اليومية</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "auto" }}
          />
          <button 
            className="btn btn-primary"
            onClick={openAddRouteModal}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} /> إضافة خط سير يومي للمندوب
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "24px" }}>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--info)" }}><MapPin size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats?.totalTracked || 0}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>إجمالي المتتبعين اليوم</div></div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}><Users size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats?.inRange || 0}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>داخل النطاق</div></div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon" style={{ background: "rgba(212, 175, 55, 0.1)", color: "var(--gold-primary)" }}><Navigation size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{routes.length}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>خطوط سير المناديب اليوم</div></div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
        <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={18} color="var(--gold-primary)" /> الخريطة المباشرة وخطوط السير
        </h3>
        <MapComponent employees={filteredEmployees} geofence={geofence} routes={routes} />
      </div>

      {/* Daily Routes Progress Cards */}
      {routes.length > 0 && (
        <div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
          <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Navigation size={18} color="var(--gold-primary)" /> متابعة ونسبة إتمام خطوط سير المناديب
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {routes.map((rt: any) => {
              const total = rt.checkpoints?.length || 0;
              const visited = rt.checkpoints?.filter((c: any) => c.status === "visited").length || 0;
              const pct = total > 0 ? Math.round((visited / total) * 100) : 0;

              return (
                <div 
                  key={rt.id} 
                  className="card"
                  style={{ padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-gold)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <h4 style={{ margin: 0, color: "var(--gold-primary)", fontSize: "15px" }}>{rt.title}</h4>
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                        المندوب: <strong>{rt.delegate?.name}</strong> {rt.delegate?.phone ? `(${rt.delegate.phone})` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`badge ${pct === 100 ? "badge-success" : "badge-gold"}`}>
                        {pct}% مكتمل
                      </span>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: "var(--gold-primary)" }}
                        onClick={() => openEditRouteModal(rt)}
                        title="تعديل خط السير"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDeleteRoute(rt)}
                        title="حذف خط السير"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-bar" style={{ margin: "12px 0 10px", height: "8px" }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : undefined }} />
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span>تمت زيارة {visited} من {total} عميل</span>
                    <span>الحالة: {rt.status === "completed" ? "✅ مكتمل" : "⏳ جاري التنفيذ"}</span>
                  </div>

                  {/* Checkpoints list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                    {rt.checkpoints?.map((cp: any) => (
                      <div 
                        key={cp.id}
                        style={{ 
                          fontSize: "12px", padding: "6px 10px", borderRadius: "6px", 
                          background: cp.status === "visited" ? "rgba(16, 185, 129, 0.1)" : cp.status === "skipped" ? "rgba(239, 68, 68, 0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${cp.status === "visited" ? "rgba(16, 185, 129, 0.3)" : cp.status === "skipped" ? "rgba(239, 68, 68, 0.3)" : "rgba(255,255,255,0.06)"}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}
                      >
                        <span>#{cp.order} {cp.clientName}</span>
                        <span style={{ 
                          color: cp.status === "visited" ? "var(--success)" : cp.status === "skipped" ? "var(--danger)" : "var(--gold-primary)", 
                          fontWeight: 600 
                        }}>
                          {cp.status === "visited" ? "✅ تمت الزيارة" : cp.status === "skipped" ? `⚠️ تعذر: ${cp.notes || ""}` : "⏳ قيد الانتظار"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Employees Location List */}
      <div className="card" style={{ padding: "16px" }}>
        <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
          <div className="search-input-wrapper" style={{ flex: "1", minWidth: "250px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", padding: "8px 16px" }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", width: "100%", paddingRight: "10px", fontSize: "14px" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("all")}>
              الكل
            </button>
            <button className={`btn ${filter === "delegate" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("delegate")}>
              المناديب فقط
            </button>
            <button className={`btn ${filter === "outOfRange" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("outOfRange")}>
              خارج النطاق
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>الموظف</th>
                <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>الوظيفة</th>
                <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>آخر ظهور</th>
                <th style={{ padding: "16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp: any) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{emp.phone || '-'}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {emp.role === "delegate" ? (
                      <span className="badge badge-info">مندوب ميداني</span>
                    ) : (
                      <span className="badge" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>موظف</span>
                    )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    {emp.lastLocation ? (
                      <div style={{ color: "var(--text-primary)" }}>
                        {new Date(emp.lastLocation.timestamp).toLocaleTimeString("ar-EG")}
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>لم يتم تسجيل موقع اليوم</span>
                    )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    {emp.lastLocation ? (
                      emp.lastLocation.isOutOfRange ? (
                        <span className="badge badge-danger">خارج النطاق</span>
                      ) : (
                        <span className="badge badge-success">داخل النطاق</span>
                      )
                    ) : (
                      <span className="badge badge-muted">غير متصل</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DAILY ROUTE MODAL */}
      {isRouteModalOpen && (
        <div className="modal-overlay" onClick={() => !savingRoute && setIsRouteModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-primary)" }}>
                <Navigation size={20} /> {editingRoute ? "تعديل بيانات ومحطات خط السير" : "إضافة خط سير يومي جديد للمندوب"}
              </h3>
              <button className="modal-close" onClick={() => setIsRouteModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrUpdateRoute}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {routeMsg.error && <div className="alert alert-danger">{routeMsg.error}</div>}
                {routeMsg.success && <div className="alert alert-success">{routeMsg.success}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">عنوان خط السير <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: خط سير عملاء مدينة نصر والقاهرة الجديدة"
                      value={routeTitle}
                      onChange={(e) => setRouteTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المندوب المسؤول <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select
                      className="form-control"
                      value={selectedDelegateId}
                      onChange={(e) => setSelectedDelegateId(e.target.value)}
                      required
                    >
                      <option value="">-- اختر المندوب --</option>
                      {delegates.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.department?.name || "عام"})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gold-divider" style={{ margin: "8px 0" }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px" }}>
                    محطات ونقاط التوقف (العملاء):
                  </h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addCheckpointRow}>
                    <Plus size={14} /> إضافة محطة عميل
                  </button>
                </div>

                {checkpoints.map((cp, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", 
                      border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px" 
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "var(--gold-primary)", fontSize: "13px" }}>المحطة #{idx + 1}</strong>
                      {checkpoints.length > 1 && (
                        <button type="button" onClick={() => removeCheckpointRow(idx)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="اسم العميل / المتجر *"
                        value={cp.clientName}
                        onChange={(e) => updateCheckpoint(idx, "clientName", e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="هاتف العميل"
                        value={cp.phone}
                        onChange={(e) => updateCheckpoint(idx, "phone", e.target.value)}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="العنوان التفصيلي"
                        value={cp.address}
                        onChange={(e) => updateCheckpoint(idx, "address", e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control"
                        placeholder="خط العرض Lat"
                        value={cp.lat}
                        onChange={(e) => updateCheckpoint(idx, "lat", e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        step="0.000001"
                        className="form-control"
                        placeholder="خط الطول Lng"
                        value={cp.lng}
                        onChange={(e) => updateCheckpoint(idx, "lng", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRouteModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={savingRoute}>
                  {savingRoute ? "جاري الحفظ..." : editingRoute ? "حفظ التعديلات" : "حفظ وإسناد خط السير"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
