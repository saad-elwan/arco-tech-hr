"use client";
import { useEffect, useState, useRef } from "react";

const DOWNLOAD_ENDPOINT = "/api/download";

export default function ForceUpdateModal() {
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedMb, setDownloadedMb] = useState("0.0");
  const [totalMb, setTotalMb] = useState("68.7");
  const [downloadSpeed, setDownloadSpeed] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastLoadedRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectOldApp = () => {
      // Verified updated v1.2.0 app
      const isNewApp = Boolean(
        (window as any).__ARCO_APP_VERSION__ === "1.2.0" ||
        (window as any).__ARCO_IS_LATEST_BUILD__ === true ||
        Number((window as any).__ARCO_VERSION_CODE__ || 0) >= 3
      );

      if (isNewApp) {
        setShowModal(false);
        return;
      }

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
      const isTestParam = Boolean(
        typeof window !== "undefined" && (window.location.search.includes("update=true") || window.location.hash.includes("update"))
      );

      // If in mobile WebView or Android app and NOT running v1.2.0:
      if ((isReactNativeWebView || isAndroidWebView || isAndroidApp || isTestParam) && !isNewApp) {
        setShowModal(true);
      }
    };

    detectOldApp();
    const interval = setInterval(detectOldApp, 100);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Auto-start real in-app download when modal appears
  useEffect(() => {
    if (showModal && !isDownloading && !isCompleted) {
      startRealDownload();
    }
  }, [showModal]);

  const startRealDownload = () => {
    setIsDownloading(true);
    setDownloadError(false);
    setProgress(0);
    setDownloadedMb("0.0");
    lastLoadedRef.current = 0;
    lastTimeRef.current = Date.now();

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("GET", DOWNLOAD_ENDPOINT, true);
    xhr.responseType = "blob";

    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const percent = Math.min(99, Math.floor((e.loaded / e.total) * 100));
        setProgress(percent);
        setDownloadedMb((e.loaded / (1024 * 1024)).toFixed(1));
        setTotalMb((e.total / (1024 * 1024)).toFixed(1));

        // Speed calculation
        const now = Date.now();
        const timeDiff = (now - lastTimeRef.current) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = e.loaded - lastLoadedRef.current;
          const speedMb = (bytesDiff / (1024 * 1024) / timeDiff).toFixed(1);
          setDownloadSpeed(`${speedMb} MB/s`);
          lastLoadedRef.current = e.loaded;
          lastTimeRef.current = now;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setProgress(100);
        setIsCompleted(true);
        setIsDownloading(false);
        setDownloadSpeed("");
        
        // Auto-trigger package download/install prompt
        triggerInstallAction();
      } else {
        handleDownloadFallback();
      }
    };

    xhr.onerror = () => {
      handleDownloadFallback();
    };

    xhr.send();
  };

  const handleDownloadFallback = () => {
    setIsDownloading(false);
    setDownloadError(true);
  };

  const triggerInstallAction = () => {
    // 1. Direct standard navigation to /api/download
    try {
      window.location.href = DOWNLOAD_ENDPOINT;
    } catch {
      try {
        window.location.assign(DOWNLOAD_ENDPOINT);
      } catch {}
    }

    // 2. Direct Anchor trigger
    try {
      const a = document.createElement("a");
      a.href = DOWNLOAD_ENDPOINT;
      a.download = "ARCO-HR-v1.2.0.apk";
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  };

  if (!showModal) return null;

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
          {isCompleted ? "اكتمل تنزيل التحديث!" : "جاري تنزيل التحديث..."}
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
          <span style={{ color: "#0284c7" }}>v1.2.0</span>
        </div>

        {/* In-App Real-time Progress Box */}
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
            <span>{isCompleted ? "جاهز للتثبيت الفوري" : "جاري تنزيل ملف التثبيت المباشر..."}</span>
            <span style={{ color: "#0284c7", direction: "ltr" }}>{progress}%</span>
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
                transition: "width 0.2s ease-out",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
            <span>{downloadSpeed ? `السرعة: ${downloadSpeed}` : "حجم التحديث"}</span>
            <span style={{ direction: "ltr" }}>{downloadedMb} MB / {totalMb} MB</span>
          </div>
        </div>

        {/* Action Button */}
        {isCompleted ? (
          <a
            href={DOWNLOAD_ENDPOINT}
            download="ARCO-HR-v1.2.0.apk"
            onClick={(e) => {
              triggerInstallAction();
            }}
            id="force-update-action-btn"
            style={{
              width: "100%",
              padding: "15px 20px",
              backgroundColor: "#16a34a",
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
              boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)",
              transition: "all 0.2s ease",
              marginBottom: "14px",
              fontFamily: "inherit",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "18px" }}>🚀</span>
            <span>تثبيت التحديث الآن (Install)</span>
          </a>
        ) : downloadError ? (
          <button
            onClick={startRealDownload}
            style={{
              width: "100%",
              padding: "15px 20px",
              backgroundColor: "#ef4444",
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
              marginBottom: "14px",
              fontFamily: "inherit",
            }}
          >
            <span>🔄</span>
            <span>إعادة محاولة التنزيل</span>
          </button>
        ) : (
          <div
            style={{
              width: "100%",
              padding: "15px 20px",
              backgroundColor: "#f1f5f9",
              color: "#64748b",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
            <span>جاري التنزيل المباشر إلى هاتفك...</span>
          </div>
        )}

        {/* Guidance Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "14px",
            padding: "12px 14px",
            marginBottom: "12px",
            textAlign: "right",
            fontSize: "12px",
            lineHeight: 1.7,
            color: "#166534",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>✨</span>
            <span>تحديث مباشر متوافق مع نسختك:</span>
          </div>
          <div>
            اضغط على زر <strong>"تثبيت التحديث الآن"</strong> بالأعلى وسيفتح مثبت حزم أندرويد لتحديث التطبيق مباشرة.
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
