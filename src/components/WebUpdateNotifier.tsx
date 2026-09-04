"use client";
import { useEffect, useState } from "react";

export default function WebUpdateNotifier() {
  const [showModal, setShowModal] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check version strictly for PWA / Web Users
    const checkWebVersion = async () => {
      try {
        const userAgent = navigator.userAgent || "";
        const isReactNativeWebView = Boolean(
          (window as any).ReactNativeWebView || 
          (window as any).__REACT_WEB_VIEW__ ||
          typeof (window as any).ReactNativeWebView !== "undefined"
        );
        const isAndroidWebView = Boolean(
          /;\s*wv|Android.*Version\/[0-9.]+|WebView/i.test(userAgent)
        );
        const isAndroidApp = Boolean(
          /Android/i.test(userAgent) && (isReactNativeWebView || isAndroidWebView || /Version\/[0-9.]+/i.test(userAgent))
        );

        // If the user is in the APK, let ForceUpdateModal handle updates, do not show Web notifier
        if (isAndroidApp || isReactNativeWebView) {
          return;
        }

        const res = await fetch("/app-version.json?t=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverVersion = String(data.latestVersion || "1.0.0");
        
        const localVersion = localStorage.getItem("arco_web_version");

        if (!localVersion) {
          // First time opening the app, just set the version
          localStorage.setItem("arco_web_version", serverVersion);
          return;
        }

        if (localVersion !== serverVersion) {
          // An update is available!
          setNewVersion(serverVersion);
          setUpdateMessage(data.message || "يتوفر تحديث جديد للمنظومة.");
          setFeatures(data.features || []);
          setShowModal(true);
        }
      } catch (err) {
        console.warn("Web version check error:", err);
      }
    };

    // Check on initial load
    checkWebVersion();
    
    // Also check when the user switches tabs back to the app
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkWebVersion();
      }
    });

  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Unregister Service Workers to force fresh fetch
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      // Update local storage version
      localStorage.setItem("arco_web_version", newVersion);
      
      // Hard reload
      window.location.reload();
    } catch (err) {
      window.location.reload();
    }
  };

  if (!showModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 5, 5, 0.96)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 999999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "center",
        direction: "rtl",
        color: "#f5f5f5",
        userSelect: "none",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#0d0d0d",
          border: "1.5px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "24px",
          padding: "28px 22px",
          boxShadow: "0 25px 60px rgba(var(--black-rgb),0.9), 0 0 35px rgba(212, 175, 55, 0.2)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <img
            src="/icon-192.png"
            alt="ARCO HR"
            style={{ width: "90px", height: "90px", borderRadius: "18px", marginBottom: "10px" }}
          />
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(212, 175, 55, 0.12)",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            color: "#D4AF37",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 800,
            marginBottom: "14px",
          }}
        >
          <span>تحديث جديد متاح للمنظومة</span>
          <span style={{ color: "#F0C84A" }}>v{newVersion}</span>
        </div>

        <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#ffffff", marginBottom: "10px", lineHeight: 1.4 }}>
          تم إصدار تحديث جديد!
        </h2>

        <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "20px" }}>
          {updateMessage}
        </p>

        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          style={{
            width: "100%",
            padding: "16px 20px",
            background: "linear-gradient(135deg, #D4AF37 0%, #b8860b 50%, #D4AF37 100%)",
            color: "#050505",
            fontWeight: 900,
            fontSize: "16px",
            border: "none",
            borderRadius: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 10px 30px rgba(212, 175, 55, 0.4)",
            transition: "all 0.2s ease",
            marginBottom: "12px",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "20px" }}>{isUpdating ? "⏳" : "⚡"}</span>
          <span>{isUpdating ? "جاري إعادة التحميل وتثبيت التحديث..." : "تحديث المنظومة الآن"}</span>
        </button>

        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
          يتم التحديث فورياً بدون الحاجة لإعادة تحميل التطبيق من المتجر.
        </p>
      </div>
    </div>
  );
}
