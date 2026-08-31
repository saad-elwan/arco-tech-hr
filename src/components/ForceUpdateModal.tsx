"use client";
import { useEffect, useState, useRef } from "react";

const DIRECT_APK_URL = "https://expo.dev/artifacts/eas/TtovW06xVgkrcqt08YBBddeZMGu0ww3bgIRTw9sDKnA.apk";
const INTENT_APK_URL = "intent://expo.dev/artifacts/eas/TtovW06xVgkrcqt08YBBddeZMGu0ww3bgIRTw9sDKnA.apk#Intent;scheme=https;type=application/vnd.android.package-archive;action=android.intent.action.VIEW;end";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [apkUrl, setApkUrl] = useState(DIRECT_APK_URL);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fetch latest APK URL from app-version.json
    fetch("/app-version.json?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.apkUrl) setApkUrl(data.apkUrl);
      })
      .catch(() => {});

    // Continuous detector for Old Mobile App / WebView
    const detectOldApp = () => {
      const isNewApp = Boolean(
        (window as any).__ARCO_APP_VERSION__ === "1.2.0" ||
        sessionStorage.getItem("arco_app_version") === "1.2.0"
      );

      if (isNewApp) {
        setShowModal(false);
        return;
      }

      const userAgent = navigator.userAgent || "";
      const isReactNativeWebView = Boolean((window as any).ReactNativeWebView || (window as any).__REACT_WEB_VIEW__);
      const isAndroidWebView = Boolean(
        /;\s*wv|Android.*Version\/[0-9.]+|WebView/i.test(userAgent)
      );
      const isTestParam = Boolean(
        typeof window !== "undefined" && window.location.search.includes("update=true")
      );

      if ((isReactNativeWebView || isAndroidWebView || isTestParam) && !isNewApp) {
        setShowModal(true);
      }
    };

    detectOldApp();
    const interval = setInterval(detectOldApp, 100);
    const timeout = setTimeout(() => clearInterval(interval), 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Auto-start download progress inside the screen when modal shows
  useEffect(() => {
    if (showModal && !isDownloading && !isCompleted) {
      startInAppDownload();
    }
  }, [showModal]);

  const startInAppDownload = () => {
    setIsDownloading(true);
    setProgress(5);

    // Simulate in-app download progress smoothly
    let current = 5;
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);

    downloadTimerRef.current = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 4;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        setIsCompleted(true);
        setIsDownloading(false);
        if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
        triggerInstallation();
      } else {
        setProgress(current);
      }
    }, 200);
  };

  const triggerInstallation = () => {
    const targetUrl = apkUrl || DIRECT_APK_URL;

    // 1. Tell WebView native layer to open URL
    try {
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "OPEN_URL", url: targetUrl })
        );
      }
    } catch {}

    // 2. Direct APK download trigger
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = "ARCO-HR-v1.2.0.apk";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 3. Android Intent Launch
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

  if (!showModal) return null;

  const currentMb = ((progress / 100) * 72.0).toFixed(1);

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
        padding: "20px",
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
        <div style={{ marginBottom: "20px" }}>
          <img
            src="/arco-logo.png"
            alt="ARCO Tech"
            style={{
              width: "200px",
              height: "auto",
              maxHeight: "75px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>

        {/* Status Icon */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: isCompleted ? "#dcfce7" : "#e0f2fe",
            color: isCompleted ? "#16a34a" : "#0284c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            marginBottom: "14px",
            boxShadow: isCompleted ? "0 8px 20px rgba(22, 163, 74, 0.2)" : "0 8px 20px rgba(2, 132, 199, 0.2)",
          }}
        >
          {isCompleted ? "✅" : "📲"}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "21px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "8px",
            lineHeight: 1.4,
          }}
        >
          {isCompleted ? "اكتمل تنزيل التحديث!" : "جاري تحديث النظام..."}
        </h1>

        {/* Version Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#f1f5f9",
            color: "#475569",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            marginBottom: "20px",
          }}
        >
          <span>الإصدار المطلوب:</span>
          <span style={{ color: "#0284c7" }}>v1.2.0 (Build 3)</span>
        </div>

        {/* In-App Progress Box */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "16px",
            padding: "16px 18px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "#334155" }}>
            <span>{isCompleted ? "جاهز للتثبيت الفوري" : "جاري تنزيل ملف التثبيت (APK)..."}</span>
            <span style={{ color: "#0284c7" }}>{progress}%</span>
          </div>

          {/* Progress Bar Container */}
          <div
            style={{
              width: "100%",
              height: "12px",
              backgroundColor: "#e2e8f0",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: isCompleted ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #0284c7, #38bdf8)",
                borderRadius: "10px",
                transition: "width 0.25s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
            <span>حجم التحديث: 72.0 ميجابايت</span>
            <span>{currentMb} MB / 72.0 MB</span>
          </div>
        </div>

        {/* Big Action Button */}
        <button
          onClick={triggerInstallation}
          id="force-update-action-btn"
          style={{
            width: "100%",
            padding: "15px 20px",
            backgroundColor: isCompleted ? "#16a34a" : "#0284c7",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: isCompleted ? "0 8px 24px rgba(22, 163, 74, 0.35)" : "0 8px 24px rgba(2, 132, 199, 0.35)",
            transition: "all 0.2s ease",
            marginBottom: "14px",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "18px" }}>{isCompleted ? "🚀" : "⬇️"}</span>
          <span>{isCompleted ? "تثبيت التحديث الآن (Install)" : "بدء التثبيت المباشر"}</span>
        </button>

        {/* Crucial Conflict Warning Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#fffbeb",
            border: "1.5px solid #fde68a",
            borderRadius: "14px",
            padding: "12px 14px",
            marginBottom: "12px",
            textAlign: "right",
            fontSize: "12px",
            lineHeight: 1.7,
            color: "#92400e",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>⚠️</span>
            <span>تنبيه هام عند التثبيت:</span>
          </div>
          <div>
            إذا ظهرت لك رسالة <strong>(Package conflicts / تعارض في الحزمة)</strong>:
            يرجى <strong>إلغاء تثبيت النسخة القديمة</strong> من هاتفك أولاً ثم الضغط على زر التثبيت أعلاه.
          </div>
        </div>

        {/* Security Note */}
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            margin: "0",
          }}
        >
          🔒 تحديث رسمي وموثق من شركة ARCO Tech
        </p>
      </div>
    </div>
  );
}
