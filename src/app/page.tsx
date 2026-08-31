"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, SkipForward, LogIn, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      
      if (data.employee?.role === "employee" || data.employee?.role === "delegate") {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#050505",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(212, 175, 55, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(212, 175, 55, 0.05) 0%, transparent 50%)",
        padding: "16px",
        direction: "rtl",
        fontFamily: "'Tajawal', 'Cairo', sans-serif",
        position: "relative",
        overflowX: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >

      {/* Main Login Card */}
      <div
        className="login-card"
        style={{
          width: "100%",
          maxWidth: "430px",
          backgroundColor: "rgba(18, 18, 18, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.1)",
          boxSizing: "border-box",
        }}
      >
        {/* Logo and Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ marginBottom: "16px" }}>
            <img
              src="/arco-logo.png"
              alt="ARCO Tech"
              style={{
                width: "100%",
                maxWidth: "210px",
                height: "auto",
                maxHeight: "70px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#F5F5F5",
              margin: "0 0 6px",
            }}
          >
            نظام إدارة الموارد البشرية
          </h1>
          <p style={{ fontSize: "13px", color: "#A3A3A3", margin: 0 }}>
            سجّل دخولك للوصول إلى لوحة التحكم والمهام
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#EF4444",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#D4AF37",
                marginBottom: "8px",
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@arco.com"
              className="form-control"
              style={{
                width: "100%",
                padding: "13px 16px",
                backgroundColor: "rgba(10, 10, 10, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#F5F5F5",
                fontSize: "14px",
                outline: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#D4AF37",
                marginBottom: "8px",
              }}
            >
              كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-control"
                style={{
                  width: "100%",
                  padding: "13px 44px 13px 16px",
                  backgroundColor: "rgba(10, 10, 10, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  color: "#F5F5F5",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#666666",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #D4AF37, #F0C84A)",
              color: "#000000",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(212, 175, 55, 0.3)",
              transition: "all 0.2s ease",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>جاري تسجيل الدخول...</span>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div className="gold-divider" style={{ margin: "24px 0 18px" }} />
        
        {/* App Download Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <a
            href="/api/download"
            download="ARCO-HR-v1.3.0.apk"
            onClick={() => {
              if (document.getElementById('androidHint')) {
                document.getElementById('androidHint')!.style.display = 'block';
              }
              if (document.getElementById('iosHint')) {
                document.getElementById('iosHint')!.style.display = 'none';
              }
            }}
            className="btn btn-primary"
            style={{ 
              flex: '1 1 180px', 
              justifyContent: 'center', 
              background: '#3ddc84', 
              borderColor: '#3ddc84', 
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.96.96 0 0 0-.953.958c0 .529.427.958.953.958a.96.96 0 0 0 .954-.958.96.96 0 0 0-.954-.958zm-11.046 0a.96.96 0 0 0-.954.958c0 .529.427.958.954.958a.96.96 0 0 0 .953-.958.96.96 0 0 0-.953-.958zm11.4-5.772 1.997-3.466a.416.416 0 0 0-.152-.567.416.416 0 0 0-.566.152l-2.024 3.513A12.26 12.26 0 0 0 12 8.07c-1.862 0-3.618.406-5.132 1.131L4.844 5.688a.416.416 0 0 0-.566-.152.416.416 0 0 0-.152.567l1.997 3.466C2.688 11.667.463 15.473.463 19.745h23.074c0-4.272-2.225-8.078-5.66-10.176z"/></svg>
            تحميل تطبيق Android (APK)
          </a>
          <button
            type="button"
            onClick={() => {
              if (document.getElementById('iosHint')) {
                document.getElementById('iosHint')!.style.display = 'block';
              }
              if (document.getElementById('androidHint')) {
                document.getElementById('androidHint')!.style.display = 'none';
              }
            }}
            className="btn btn-primary"
            style={{ 
              flex: '1 1 120px', 
              justifyContent: 'center', 
              background: '#000', 
              borderColor: 'rgba(255,255,255,0.2)', 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.87.94-2.97-1 .04-2.19.67-2.88 1.48-.59.69-1.12 1.8-1 2.89 1.12.09 2.31-.62 2.94-1.4z"/></svg>
            تطبيق iOS
          </button>
        </div>

        {/* Hints */}
        <div id="androidHint" style={{ display: 'none', background: 'rgba(61,220,132,0.1)', border: '1px solid rgba(61,220,132,0.3)', padding: '12px', borderRadius: '12px', fontSize: '12px', color: '#3ddc84', marginBottom: '14px', lineHeight: 1.6 }}>
          <strong>🚀 خطوات التثبيت:</strong><br/>
          1. افتح الملف المحمل <strong>ARCO-HR-v1.3.0.apk</strong> واضغط تثبيت.<br/>
          2. اسمح بتثبيت التطبيقات إذا طلب هاتفك ذلك.
        </div>

        <div id="iosHint" style={{ display: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', fontSize: '12px', color: '#ccc', marginBottom: '14px', lineHeight: 1.6 }}>
          <strong>📱 لمستخدمي iPhone (PWA):</strong><br/>
          1. افتح الرابط في متصفح <strong>Safari</strong>.<br/>
          2. اضغط على زر <strong>مشاركة (Share)</strong> بالأسفل.<br/>
          3. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <p style={{ fontSize: "11px", color: "#666666", margin: 0 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} ARCO Tech
          </p>
        </div>
      </div>
    </div>
  );
}
