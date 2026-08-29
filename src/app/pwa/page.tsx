<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#1a365d">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="HR System">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <title>نظام إدارة الموارد البشرية</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-container {
      background: #fff;
      border-radius: 20px;
      padding: 40px 30px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-icon {
      width: 80px;
      height: 80px;
      background: #1a365d;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
    }
    .logo-icon svg { width: 40px; height: 40px; fill: #c9a227; }
    .logo h1 { color: #1a365d; font-size: 22px; margin-bottom: 5px; }
    .logo p { color: #666; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 600;
      font-size: 14px;
    }
    .form-group input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #1a365d;
    }
    .btn-login {
      width: 100%;
      padding: 14px;
      background: #1a365d;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
      margin-bottom: 20px;
    }
    .btn-login:hover { background: #2d3748; }
    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: #999;
      font-size: 13px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .divider span { padding: 0 15px; }
    .download-buttons {
      display: flex;
      gap: 12px;
    }
    .btn-download {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    }
    .btn-android {
      background: #3ddc84;
      color: #000;
    }
    .btn-ios {
      background: #000;
      color: #fff;
    }
    .btn-download svg { width: 20px; height: 20px; }
    .error-msg {
      background: #fee;
      color: #c33;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }
    .install-hint {
      background: #f0f4ff;
      padding: 12px;
      border-radius: 8px;
      margin-top: 15px;
      font-size: 13px;
      color: #333;
      display: none;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </div>
      <h1>نظام إدارة الموارد البشرية</h1>
      <p>سجل دخولك أو حمّل التطبيق</p>
    </div>

    <div class="error-msg" id="errorMsg"></div>

    <form id="loginForm">
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" id="email" placeholder="example@company.com" required>
      </div>
      <div class="form-group">
        <label>كلمة المرور</label>
        <input type="password" id="password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn-login">تسجيل الدخول</button>
    </form>

    <div class="divider"><span>أو حمّل التطبيق</span></div>

    <div class="download-buttons">
      <a href="https://expo.dev/artifacts/eas/b8kzkVIm_51o1cSXyXshsJIYz806tkz08Kjg7j2AKD8.apk" class="btn-download btn-android" id="androidBtn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.96.96 0 0 0-.953.958c0 .529.427.958.953.958a.96.96 0 0 0 .954-.958.96.96 0 0 0-.954-.958zm-11.046 0a.96.96 0 0 0-.954.958c0 .529.427.958.954.958a.96.96 0 0 0 .953-.958.96.96 0 0 0-.953-.958zm11.4-5.772 1.997-3.466a.416.416 0 0 0-.152-.567.416.416 0 0 0-.566.152l-2.024 3.513A12.26 12.26 0 0 0 12 8.07c-1.862 0-3.618.406-5.132 1.131L4.844 5.688a.416.416 0 0 0-.566-.152.416.416 0 0 0-.152.567l1.997 3.466C2.688 11.667.463 15.473.463 19.745h23.074c0-4.272-2.225-8.078-5.66-10.176z"/></svg>
        Android
      </a>
      <button class="btn-download btn-ios" id="iosBtn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        iOS
      </button>
    </div>

    <div class="install-hint" id="installHint"></div>
  </div>

  <script>
    const API_URL = 'https://hr-amr.vercel.app/api';
    const APK_URL = 'https://expo.dev/artifacts/eas/b8kzkVIm_51o1cSXyXshsJIYz806tkz08Kjg7j2AKD8.apk';

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorMsg = document.getElementById('errorMsg');

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('hr_token', data.token);
          localStorage.setItem('hr_user', JSON.stringify(data.employee));
          window.location.href = '/dashboard';
        } else {
          errorMsg.textContent = data.error || 'بيانات الدخول غير صحيحة';
          errorMsg.style.display = 'block';
        }
      } catch (err) {
        errorMsg.textContent = 'تعذر الاتصال بالخادم';
        errorMsg.style.display = 'block';
      }
    });

    // Android download - direct APK install
    document.getElementById('androidBtn').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = APK_URL;
    });

    // iOS - Add to home screen guide
    document.getElementById('iosBtn').addEventListener('click', () => {
      const hint = document.getElementById('installHint');
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        hint.innerHTML = `
          <strong>لتثبيت التطبيق على iOS:</strong><br>
          1. اضغط على زر <strong>مشاركة</strong> في أسفل الشاشة<br>
          2. اختر <strong>إضافة إلى الشاشة الرئيسية</strong><br>
          3. اضغط <strong>إضافة</strong>
        `;
      } else {
        hint.innerHTML = `
          <strong>لتثبيت التطبيق:</strong><br>
          1. افتح القائمة (⋮) في أعلى المتصفح<br>
          2. اختر <strong>إضافة إلى الشاشة الرئيسية</strong><br>
          3. اضغط <strong>إضافة</strong>
        `;
      }
      hint.style.display = 'block';
    });

    // Auto-detect platform and show hint
    window.addEventListener('load', () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isAndroid) {
        document.getElementById('installHint').innerHTML = 'اضغط على زر Android لتحميل التطبيق وتثبيته مباشرة';
        document.getElementById('installHint').style.display = 'block';
      }
    });

    // Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  </script>
</body>
</html>
