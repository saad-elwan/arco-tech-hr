"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

function createAdminIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:38px; height:38px; border-radius:50% 50% 50% 0;
      background: linear-gradient(135deg, #d4af37, #f0c84a);
      transform:rotate(-45deg);
      border:3px solid #000;
      box-shadow:0 0 15px rgba(212, 175, 55, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
  });
}

export default function SuperAdminMap({ sessions }: { sessions: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height: "400px", background: "var(--bg-secondary)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        جاري تحميل خريطة الإدارة...
      </div>
    );
  }

  const validSessions = sessions.filter(s => s.lat && s.lng);
  const center = validSessions.length > 0
    ? [validSessions[0].lat, validSessions[0].lng]
    : [30.0444, 31.2357];

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-gold)" }}>
      <MapContainer
        center={center as any}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validSessions.map((s: any) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createAdminIcon()}
          >
            <Popup>
              <div style={{ textAlign: "right", direction: "rtl", fontFamily: "Cairo, Arial, sans-serif" }}>
                <strong style={{ color: "#d4af37", fontSize: "14px" }}>👑 {s.username}</strong><br/>
                <span style={{ fontSize: "12px", color: "#333" }}>الجهاز: {s.deviceName || "جهاز إدارة"}</span><br/>
                <span style={{ fontSize: "11px", color: "#666" }}>IP: {s.ipAddress}</span><br/>
                <span style={{ fontSize: "11px", color: "#666" }}>آخر ظهور: {new Date(s.lastSeen).toLocaleTimeString("ar-EG")}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
