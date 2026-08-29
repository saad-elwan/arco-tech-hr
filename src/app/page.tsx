"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      
      // Notify React Native WebView if it exists
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          Arco Tech
        </p>
      </div>
    </div>
  );
}
