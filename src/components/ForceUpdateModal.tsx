"use client";
import { useEffect, useState } from "react";

const DEFAULT_APK_URL = "https://expo.dev/accounts/arcotechcos-team/projects/arco/builds/940ec600-de05-4dfa-88fd-709f83832b87";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [apkUrl, setApkUrl] = useState(DEFAULT_APK_URL);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if running inside ANY React Native WebView
      const isWebView = Boolean(
        (window as any).ReactNativeWebView
      );

      if (!isWebView) return;

      // Check if the new updated app injected its version
      // The new app sets window.__ARCO_APP_VERSION__ before page load
      const checkVersion = () => {
        const appVersion = (window as any).__ARCO_APP_VERSION__;
        const sessionVersion = sessionStorage.getItem("arco_app_version");
        
        // If no version is set, this is the OLD app that doesn't inject version
        if (!appVersion && !sessionVersion) {
          // Fetch the latest APK URL
          fetch("/app-version.json?t=" + Date.now(), { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
              if (data.apkUrl) setApkUrl(data.apkUrl);
            })
            .catch(() => {});
          setShowModal(true);
          return;
        }

        // If version IS set, check if it meets minimum
        const currentVersion = appVersion || sessionVersion || "0.0.0";
        fetch("/app-version.json?t=" + Date.now(), { cache: "no-store" })
          .then(r => r.json())
          .then(data => {
            if (data.apkUrl) setApkUrl(data.apkUrl);
            if (data.forceUpdate && data.minRequiredVersion) {
              const isOutdated = compareVersions(currentVersion, data.minRequiredVersion);
              if (isOutdated) {
                setShowModal(true);
              }
            }
          })
          .catch(() => {});
      };

      // Small delay to allow injected JS to run first
      setTimeout(checkVersion, 400);
    }
  }, []);

  const compareVersions = (current: string, target: string): boolean => {
    const cParts = current.split(".").map(p => parseInt(p, 10) || 0);
    const tParts = target.split(".").map(p => parseInt(p, 10) || 0);
    for (let i = 0; i < Math.max(cParts.length, tParts.length); i++) {
      const c = cParts[i] || 0;
      const t = tParts[i] || 0;
      if (c < t) return true;
      if (c > t) return false;
    }
    return false;
  };

  if (!showModal) return null;

  const handleDownload = () => {
    const targetUrl = apkUrl || DEFAULT_APK_URL;
    try {
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "OPEN_URL", url: targetUrl })
        );
      }
    } catch {}
    window.location.href = targetUrl;
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
          تحديث إجباري للنظام
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
          <span>1.2.0 (Build 3)</span>
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
          يتوفر إصدار جديد وهام من تطبيق <strong>ARCO HR</strong>. يتضمن دعماً للإشعارات، واستمرار العمل في الخلفية، وتحديث الموقع تلقائياً كل 5 دقائق. يرجى تحديث التطبيق للمتابعة.
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

        {/* Security Note */}
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
