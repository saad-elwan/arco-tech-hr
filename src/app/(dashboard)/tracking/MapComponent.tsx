"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Custom colored markers
function createCustomIcon(isOutOfRange: boolean) {
  const color = isOutOfRange ? "#ef4444" : "#10b981";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:34px; height:34px; border-radius:50% 50% 50% 0;
      background:${color}; transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

export default function MapComponent({ 
  employees, 
  geofence 
}: { 
  employees: any[]; 
  geofence: any 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) return (
    <div style={{ height: "450px", background: "var(--bg-secondary)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      جاري تحميل الخريطة...
    </div>
  );

  const center = geofence?.lat && geofence?.lng 
    ? [geofence.lat, geofence.lng] 
    : [30.0444, 31.2357];

  return (
    <div style={{ height: "450px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
      <MapContainer 
        center={center as any} 
        zoom={14} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Company Geofence Circle */}
        {geofence?.lat && geofence?.lng && (
          <Circle 
            center={[geofence.lat, geofence.lng]}
            radius={geofence.radius || 500}
            pathOptions={{ 
              color: '#d4af37', 
              fillColor: '#d4af37', 
              fillOpacity: 0.08,
              weight: 2,
              dashArray: "6 4"
            }}
          >
            <Popup>
              <div style={{ textAlign: "right", fontFamily: "Cairo, Arial, sans-serif", direction: "rtl" }}>
                <strong style={{ color: "#d4af37" }}>🏢 نطاق الشركة</strong><br/>
                <span style={{ fontSize: "12px", color: "#666" }}>نصف القطر: {geofence.radius} متر</span>
              </div>
            </Popup>
          </Circle>
        )}

        {/* Employee Markers */}
        {employees.filter(e => e.lastLocation).map(emp => {
          const loc = emp.lastLocation;
          const att = emp.attendance;
          const isOut = loc.isOutOfRange;
          return (
            <Marker 
              key={emp.id} 
              position={[loc.latitude, loc.longitude]}
              icon={createCustomIcon(isOut)}
            >
              <Popup minWidth={230}>
                <div style={{ textAlign: "right", fontFamily: "Cairo, Arial, sans-serif", direction: "rtl", padding: "4px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: isOut ? "#fef2f2" : "#f0fdf4",
                      border: `2px solid ${isOut ? "#ef4444" : "#10b981"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 16, color: isOut ? "#ef4444" : "#10b981",
                      flexShrink: 0
                    }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{emp.department?.name || "غير محدد"}</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 20,
                    background: isOut ? "#fef2f2" : "#f0fdf4",
                    color: isOut ? "#dc2626" : "#16a34a",
                    fontSize: 12, fontWeight: 600, marginBottom: 10
                  }}>
                    {isOut ? "🔴 خارج النطاق" : "🟢 داخل النطاق"}
                  </div>

                  {/* Info rows */}
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "3px 0", color: "#666", whiteSpace: "nowrap" }}>⏰ وقت الحضور:</td>
                        <td style={{ padding: "3px 4px", fontWeight: 600, color: "#1a1a1a" }}>
                          {att?.checkIn || "لم يسجل"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 0", color: "#666", whiteSpace: "nowrap" }}>🚪 وقت الانصراف:</td>
                        <td style={{ padding: "3px 4px", fontWeight: 600, color: "#1a1a1a" }}>
                          {att?.checkOut || "لم ينصرف بعد"}
                        </td>
                      </tr>
                      {isOut && (
                        <tr>
                          <td style={{ padding: "3px 0", color: "#dc2626", whiteSpace: "nowrap" }}>📍 خرج النطاق:</td>
                          <td style={{ padding: "3px 4px", fontWeight: 600, color: "#dc2626" }}>
                            {new Date(loc.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: "3px 0", color: "#999", whiteSpace: "nowrap" }}>🕐 آخر تحديث:</td>
                        <td style={{ padding: "3px 4px", fontSize: 12, color: "#999" }}>
                          {new Date(loc.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
