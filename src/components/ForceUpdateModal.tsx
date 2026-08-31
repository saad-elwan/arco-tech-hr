"use client";
import { useEffect, useState, useRef } from "react";

const DOWNLOAD_ENDPOINT = "/api/download";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [targetVersion, setTargetVersion] = useState("1.3.2");
  const [targetBuild, setTargetBuild] = useState(8);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkServerVersion = async () => {
      try {
        const res = await fetch("/app-version.json?t=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;
        const data = await res.json();

        const serverVersionCode = Number(data.versionCode || 8);
        const serverVersionName = String(data.latestVersion || "1.3.2");
        setTargetVersion(serverVersionName);
        setTargetBuild(serverVersionCode);

        // Check mobile app environment
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

        // Check if installed build is older
        const installedBuild = Number((window as any).__ARCO_VERSION_CODE__ || 0);
        const isUpToDate = installedBuild >= serverVersionCode;

        if ((isReactNativeWebView || isAndroidWebView || isAndroidApp) && !isUpToDate) {
          setShowModal(true);
        } else {
          setShowModal(false);
        }
      } catch (err) {
        console.warn("Version check error:", err);
      }
    };

    checkServerVersion();
  }, []);

  const handle1ClickUpdate = () => {
    setIsDownloading(true);
    setProgress(30);

    setTimeout(() => {
      setProgress(75);
    }, 400);

    setTimeout(() => {
      setProgress(100);
      setIsDownloading(false);
      // Trigger download immediately
      try {
        window.location.href = DOWNLOAD_ENDPOINT;
      } catch {
        try {
          window.location.assign(DOWNLOAD_ENDPOINT);
        } catch {}
      }
    }, 900);
  };

  if (!showModal || isDismissed) return null;

  return (
    <div
      id="force-update-modal"
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
          boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(212, 175, 55, 0.2)",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "18px" }}>
          <img
            src="/arco-logo.png"
            alt="ARCO Tech"
            style={{
              width: "180px",
              height: "auto",
              maxHeight: "70px",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>

        {/* Badge */}
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
          <span>تحديث جديد متاح</span>
          <span style={{ color: "#F0C84A" }}>v{targetVersion}</span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "19px",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "10px",
            lineHeight: 1.4,
          }}
        >
          تحديث تطبيق ARCO HR
        </h2>

        <p
          style={{
            fontSize: "13px",
            color: "#cbd5e1",
            lineHeight: 1.6,
            marginBottom: "20px",
          }}
        >
          يتوفر إصدار محسن يدعم ظهور الإشعارات على شاشة القفل ومسافة الأمان العلوية.
        </p>

        {/* 1-Click Golden Action Button */}
        <button
          onClick={handle1ClickUpdate}
          disabled={isDownloading}
          style={{
            width: "100%",
            padding: "16px 20px",
            background: isDownloading
              ? "linear-gradient(135deg, #16a34a, #22c55e)"
              : "linear-gradient(135deg, #D4AF37 0%, #b8860b 50%, #D4AF37 100%)",
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
          <span style={{ fontSize: "20px" }}>{isDownloading ? "⏳" : "⚡"}</span>
          <span>{isDownloading ? "جاري بدء التحميل..." : "تحديث التطبيق الآن (ضغطة واحدة)"}</span>
        </button>

        {/* Super simple progress bar if clicked */}
        {isDownloading && (
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #D4AF37, #22c55e)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}

        {/* Secondary: Skip / Continue to work */}
        <button
          onClick={() => setIsDismissed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 16px",
            fontFamily: "inherit",
            textDecoration: "underline",
          }}
        >
          متابعة استخدام التطبيق مؤقتاً ➔
        </button>
      </div>
    </div>
  );
}
