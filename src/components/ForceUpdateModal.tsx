"use client";
import { useEffect, useState } from "react";

const DIRECT_APK_URL = "https://expo.dev/artifacts/eas/TtovW06xVgkrcqt08YBBddeZMGu0ww3bgIRTw9sDKnA.apk";
const INTENT_APK_URL = "intent://expo.dev/artifacts/eas/TtovW06xVgkrcqt08YBBddeZMGu0ww3bgIRTw9sDKnA.apk#Intent;scheme=https;type=application/vnd.android.package-archive;action=android.intent.action.VIEW;end";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [apkUrl, setApkUrl] = useState(DIRECT_APK_URL);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fetch latest APK URL from app-version.json in background
    fetch("/app-version.json?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.apkUrl) setApkUrl(data.apkUrl);
      })
      .catch(() => {});

    // Continuous detector for Old Mobile App / WebView
    const detectOldApp = () => {
      // 1. If this is the NEW updated app (1.2.0), do NOT show modal
      const isNewApp = Boolean(
        (window as any).__ARCO_APP_VERSION__ === "1.2.0" ||
        sessionStorage.getItem("arco_app_version") === "1.2.0"
      );

      if (isNewApp) {
        setShowModal(false);
        return;
      }

      // 2. Check if running inside ANY WebView (ReactNativeWebView, Android WebView, etc.)
      const userAgent = navigator.userAgent || "";
      const isReactNativeWebView = Boolean((window as any).ReactNativeWebView || (window as any).__REACT_WEB_VIEW__);
      const isAndroidWebView = Boolean(
        /;\s*wv|Android.*Version\/[0-9.]+|WebView/i.test(userAgent)
      );
      const isTestParam = Boolean(
        typeof window !== "undefined" && window.location.search.includes("update=true")
      );

      // If it's a mobile app WebView and NOT the new version (1.2.0), trigger force update immediately!
      if ((isReactNativeWebView || isAndroidWebView || isTestParam) && !isNewApp) {
        setShowModal(true);
      }
    };

    // Run check immediately on mount
    detectOldApp();

    // Run periodic checks every 100ms for 6 seconds to catch late bridge injection on Android
    const interval = setInterval(detectOldApp, 100);
    const timeout = setTimeout(() => clearInterval(interval), 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!showModal) return null;

  const handleDownload = () => {
    setDownloadStarted(true);
    const targetUrl = apkUrl || DIRECT_APK_URL;

    // 1. If inside React Native WebView, ask native bridge to open URL in external browser/installer
    try {
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "OPEN_URL", url: targetUrl })
        );
      }
    } catch {}

    // 2. Trigger direct APK download via DOM
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = "ARCO-HR-v1.2.0.apk";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 3. Trigger Android Package Installer Intent / Direct assign
    setTimeout(() => {
      try {
        window.location.href = INTENT_APK_URL;
      } catch {
        try {
          window.location.assign(targetUrl);
        } catch {
          window.location.href = targetUrl;
        }
      }
    }, 400);
  };

  return (
    <div
      id="force-update-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#ffffff",
        zIndex: 999999999,
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
        <div style={{ marginBottom: "24px" }}>
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
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            backgroundColor: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            marginBottom: "16px",
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
            marginBottom: "10px",
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
            marginBottom: "16px",
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
            marginBottom: "24px",
            padding: "0 10px",
          }}
        >
          يتوفر إصدار جديد وهام من تطبيق <strong>ARCO HR</strong>. يرجى تحديث التطبيق الآن للمتابعة والاستمرار في استخدام النظام.
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
          <span>{downloadStarted ? "إعادة تحميل ملف (APK)" : "تحميل وتثبيت التحديث (APK)"}</span>
        </button>

        {/* Post-Download Helper Box */}
        {downloadStarted && (
          <div
            style={{
              width: "100%",
              backgroundColor: "#f0fdf4",
              border: "1.5px solid #86efac",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "14px",
              textAlign: "right",
              fontSize: "13px",
              lineHeight: 1.8,
              color: "#166534",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🚀</span>
              <span>بدأ التحميل بنجاح! للتثبيت الفوري:</span>
            </div>
            <div>
              1. اسحب <strong>شريط الإشعارات</strong> من أعلى هاتفك واضغط على ملف <strong>(ARCO-HR-v1.2.0.apk)</strong>.
            </div>
            <div>
              2. أو افتح تطبيق <strong>"ملفاتي / التنزيلات"</strong> على هاتفك واضغط على الملف واضغط <strong>"تثبيت" (Install)</strong>.
            </div>
          </div>
        )}

        {/* Security Note */}
        <p
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            marginTop: "6px",
          }}
        >
          🔒 تحديث رسمي وموثق من شركة ARCO Tech
        </p>
      </div>
    </div>
  );
}
