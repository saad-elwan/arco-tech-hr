"use client";
import { useEffect, useState } from "react";

const APK_URL = "https://expo.dev/accounts/arcotechcos-team/projects/arco/builds/d058fc3c-a16a-405c-9f52-2e811de72422";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if running inside React Native WebView
    if (typeof window !== "undefined") {
      const isWebView = Boolean(
        (window as any).ReactNativeWebView ||
        (window as any).__REACT_WEB_VIEW__ ||
        /arco-app-webview/i.test(navigator.userAgent)
      );

      // Check if not yet running the new updated version (1.1.0)
      const isUpdated = Boolean(
        (window as any).__ARCO_APP_VERSION__ === "1.1.0" ||
        navigator.userAgent.includes("ArcoApp/1.1.0") ||
        sessionStorage.getItem("arco_app_version") === "1.1.0"
      );

      if (isWebView && !isUpdated) {
        setShowModal(true);
      }
    }
  }, []);

  if (!showModal) return null;

  const handleDownload = () => {
    // Attempt postMessage to React Native to open URL in native browser if supported
    try {
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "OPEN_URL", url: APK_URL })
        );
      }
    } catch {}

    // Direct redirect to APK download page
    window.location.href = APK_URL;
  };

  return (
    <div
      id="force-update-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#ffffff",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "center",
        direction: "rtl",
        color: "#1e293b",
        userSelect: "none",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Company Logo */}
        <div style={{ marginBottom: "28px" }}>
          <img
            src="/arco-logo.png"
            alt="ARCO Tech"
            style={{
              width: "220px",
              height: "auto",
              maxHeight: "80px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>

        {/* Warning Icon Badge */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "34px",
            marginBottom: "20px",
            boxShadow: "0 8px 20px rgba(217, 119, 6, 0.15)",
          }}
        >
          ⚠️
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "12px",
            lineHeight: 1.4,
          }}
        >
          تحديث إجباري للنظام (v1.1.0)
        </h1>

        {/* Version Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#e0f2fe",
            color: "#0284c7",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
            marginBottom: "20px",
          }}
        >
          <span>الإصدار الجديد:</span>
          <span>1.1.0 (Build 2)</span>
        </div>

        {/* Message */}
        <p
          style={{
            fontSize: "15px",
            lineHeight: "1.7",
            color: "#475569",
            marginBottom: "32px",
            padding: "0 10px",
          }}
        >
          يتوفر إصدار جديد وهام من تطبيق <strong>ARCO HR</strong>. يتضمن دعماً للإشعارات، واستمرار العمل في الخلفية، وتحسينات في الأداء. يرجى تحديث التطبيق للمتابعة.
        </p>

        {/* Big Blue Download Button */}
        <button
          onClick={handleDownload}
          id="force-update-download-btn"
          style={{
            width: "100%",
            padding: "16px 24px",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            border: "none",
            borderRadius: "16px",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.35)",
            transition: "transform 0.2s ease, background-color 0.2s ease",
            marginBottom: "16px",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "20px" }}>⬇️</span>
          <span>تحميل التحديث المباشر (APK)</span>
        </button>

        {/* Security & Authenticity Note */}
        <p
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            marginTop: "10px",
          }}
        >
          🔒 تحديث رسمي وموثق من شركة ARCO Tech
        </p>
      </div>
    </div>
  );
}
