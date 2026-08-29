"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Users, AlertTriangle, Search, Filter } from "lucide-react";

// Dynamic import for Leaflet map to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

export default function TrackingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "delegate" | "outOfRange"
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLocationData();
    // Auto refresh every minute
    const interval = setInterval(fetchLocationData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLocationData = async () => {
    try {
      const res = await fetch("/api/location");
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

  if (loading && !data) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  const employees = data?.employees || [];
  const geofence = data?.geofence;
  const stats = data?.stats;

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
            <span className="page-title-icon" style={{ color: "var(--gold-primary)" }}>📍</span> تتبع المواقع
          </h1>
          <p className="page-subtitle">تتبع مباشر لمواقع الموظفين والمناديب وتنبيهات النطاق الجغرافي</p>
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
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}><AlertTriangle size={24} /></div>
          <div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats?.outOfRange || 0}</div><div style={{ color: "var(--text-muted)", fontSize: "13px" }}>خارج النطاق</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
        <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>الخريطة المباشرة</h3>
        <MapComponent employees={filteredEmployees} geofence={geofence} />
      </div>

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
                      <span className="badge badge-info">مندوب</span>
                    ) : (
                      <span className="badge" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>موظف داخلي</span>
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
                        <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                          <AlertTriangle size={14} /> خارج النطاق
                        </span>
                      ) : (
                        <span className="badge badge-success">داخل النطاق</span>
                      )
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    لا توجد بيانات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
