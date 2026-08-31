"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, SkipForward, LogIn, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("hr_token");
    if (token) router.replace("/dashboard");
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ في تسجيل الدخول");
        return;
      }
      localStorage.setItem("hr_token", data.token);
      localStorage.setItem("hr_user", JSON.stringify(data.employee));
      
      if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "LOGIN_SUCCESS", token: data.token, user: data.employee })
        );
      }
      
      if (data.employee?.role === "employee") {
        router.replace("/me");
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  // Auto-finish intro splash after 2.6s
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => setShowIntro(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  // If intro is active, show the clean pure white pulsing logo splash
  if (showIntro) {
    return (
      <div 
        onClick={() => setShowIntro(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          cursor: "pointer",
          userSelect: "none",
          padding: "20px"
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "480px",
          width: "90%",
          animation: "arcoLogoPulse 2.4s ease-in-out infinite"
        }}>
          <img 
            src="/arco-logo.svg" 
            alt="Arco Tech For Management Sys" 
            style={{ 
              width: "100%", 
              height: "auto", 
              maxHeight: "180px",
              objectFit: "contain",
              filter: "drop-shadow(0 10px 25px rgba(2, 132, 199, 0.15))"
            }} 
          />
        </div>

        {/* Subtle pulsing indicator */}
        <div style={{
          marginTop: "32px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7", animation: "pulse 1.2s infinite" }}></div>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.2s infinite 0.2s" }}></div>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0f2b48", animation: "pulse 1.2s infinite 0.4s" }}></div>
        </div>

        <style jsx>{`
          @keyframes arcoLogoPulse {
            0% { transform: scale(0.96); filter: drop-shadow(0 8px 18px rgba(2,132,199,0.12)); }
            50% { transform: scale(1.02); filter: drop-shadow(0 16px 36px rgba(2,132,199,0.22)); }
            100% { transform: scale(0.96); filter: drop-shadow(0 8px 18px rgba(2,132,199,0.12)); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ animation: "slideIn 0.4s ease" }}>
        <div className="login-logo" style={{ marginBottom: "20px" }}>
          <img 
            src="/arco-logo.svg" 
            alt="Arco Tech For Management Sys" 
            style={{ width: "220px", height: "auto", margin: "0 auto 12px", display: "block" }} 
          />
          <p className="login-subtitle">نظام إدارة الموارد البشرية والعمليات المتكامل</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني أو اسم المستخدم</label>
            <input
              type="text"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="مثال: Arco أو admin@company.com"
              required
              id="login-email"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              id="login-password"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="login-btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                جاري تسجيل الدخول...
              </>
            ) : (
              <>
                <LogIn size={18} />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        <div className="gold-divider" style={{ margin: "24px 0 16px" }} />
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => {
              const isAndroid = /Android/.test(navigator.userAgent);
              if (isAndroid) {
                document.getElementById('androidHint')!.style.display = 'block';
                document.getElementById('iosHint')!.style.display = 'none';
              } else {
                document.getElementById('androidHint')!.style.display = 'none';
                document.getElementById('iosHint')!.style.display = 'none';
                const event = new Event('beforeinstallprompt');
                window.dispatchEvent(event);
              }
            }}
            className="btn btn-primary"
            style={{ 
              flex: 1, 
              justifyContent: 'center', 
              background: '#3ddc84', 
              borderColor: '#3ddc84', 
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.96.96 0 0 0-.953.958c0 .529.427.958.953.958a.96.96 0 0 0 .954-.958.96.96 0 0 0-.954-.958zm-11.046 0a.96.96 0 0 0-.954.958c0 .529.427.958.954.958a.96.96 0 0 0 .953-.958.96.96 0 0 0-.953-.958zm11.4-5.772 1.997-3.466a.416.416 0 0 0-.152-.567.416.416 0 0 0-.566.152l-2.024 3.513A12.26 12.26 0 0 0 12 8.07c-1.862 0-3.618.406-5.132 1.131L4.844 5.688a.416.416 0 0 0-.566-.152.416.416 0 0 0-.152.567l1.997 3.466C2.688 11.667.463 15.473.463 19.745h23.074c0-4.272-2.225-8.078-5.66-10.176z"/></svg>
            تطبيق Android
          </button>
          <button
            onClick={() => {
              document.getElementById('iosHint')!.style.display = 'block';
              document.getElementById('androidHint')!.style.display = 'none';
            }}
            className="btn btn-primary"
            style={{ 
              flex: 1, 
              justifyContent: 'center', 
              background: '#000', 
              borderColor: 'rgba(255,255,255,0.2)', 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            تطبيق iOS
          </button>
        </div>

        <div id="androidHint" style={{ display: 'none', background: 'rgba(61, 220, 132, 0.1)', border: '1px solid rgba(61, 220, 132, 0.3)', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 13, lineHeight: 1.8, textAlign: 'right' }}>
          <strong>📱 لتثبيت التطبيق على أجهزة Android:</strong><br />
          1. اضغط على القائمة <strong>(⋮)</strong> في أعلى المتصفح<br />
          2. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> أو <strong>"Install app"</strong><br />
          3. اضغط <strong>"إضافة"</strong>
        </div>

        <div id="iosHint" style={{ display: 'none', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 13, lineHeight: 1.8, textAlign: 'right' }}>
          <strong>🍎 لتثبيت التطبيق على iPhone / iPad:</strong><br />
          1. اضغط على زر <strong>مشاركة (Share)</strong> في أسفل متصفح Safari<br />
          2. مرر واختر <strong>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</strong><br />
          3. اضغط <strong>"إضافة (Add)"</strong>
        </div>

        <div className="gold-divider" style={{ margin: "24px 0 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            نظام آركو تك لإدارة المؤسسات
          </p>
          <button 
            onClick={() => setShowIntro(true)} 
            style={{ background: "none", border: "none", color: "var(--gold-primary)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            <Play size={12} /> إعادة تشغيل المقدمة
          </button>
        </div>
      </div>
    </div>
  );
}
