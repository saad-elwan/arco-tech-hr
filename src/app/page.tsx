"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
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
        setError(data.error || "حدث خطأ");
        return;
      }
      localStorage.setItem("hr_token", data.token);
      localStorage.setItem("hr_user", JSON.stringify(data.employee));
      
      if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: "LOGIN_SUCCESS", token: data.token, user: data.employee })
        );
      }
      
      router.replace("/dashboard");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="login-title">Arco Tech</h1>
          <p className="login-subtitle">قم بتسجيل الدخول للمتابعة</p>
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
            <label className="form-label">البريد الإلكتروني</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
              id="login-email"
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
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
                // Try to trigger install
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
            Android
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
              borderColor: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            iOS
          </button>
        </div>

        <div id="androidHint" style={{ display: 'none', background: '#f0f4ff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 14, lineHeight: 1.8, textAlign: 'right' }}>
          <strong>لتحميل التطبيق على Android:</strong><br />
          1. اضغط على القائمة <strong>(⋮)</strong> في أعلى المتصفح<br />
          2. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> أو <strong>"Install app"</strong><br />
          3. اضغط <strong>"إضافة"</strong>
        </div>

        <div id="iosHint" style={{ display: 'none', background: '#f0f4ff', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 14, lineHeight: 1.8, textAlign: 'right' }}>
          <strong>لتحميل التطبيق على iOS:</strong><br />
          1. اضغط على زر <strong>مشاركة</strong> في أسفل الشاشة<br />
          2. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong><br />
          3. اضغط <strong>"إضافة"</strong>
        </div>

        <div className="gold-divider" style={{ margin: "24px 0 16px" }} />
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          Arco Tech
        </p>
      </div>
    </div>
  );
}
