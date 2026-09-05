// Comprehensive Web Audio, System Permissions & Push Notification Engine

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Unlock AudioContext on first user interaction (touch/click)
export function unlockAudio() {
  if (isAudioUnlocked) return;
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        isAudioUnlocked = true;
      });
    } else {
      isAudioUnlocked = true;
    }
  } catch (err) {
    console.warn("Audio unlock error:", err);
  }
}

// Auto-register touch/click listeners to unlock audio immediately
if (typeof window !== "undefined") {
  const events = ["click", "touchstart", "touchend", "pointerdown", "keydown"];
  const handleUserGesture = () => {
    unlockAudio();
    events.forEach(e => window.removeEventListener(e, handleUserGesture));
  };
  events.forEach(e => window.addEventListener(e, handleUserGesture, { passive: true }));
}

// Play Harmonic Luxury Chime Sound
export function playNotificationSound() {
  try {
    unlockAudio();

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const ctx = audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic luxury bell chime: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz) -> E6 (1318.51Hz)
    const notes = [
      { freq: 659.25, start: 0, duration: 0.2 },
      { freq: 830.61, start: 0.07, duration: 0.25 },
      { freq: 987.77, start: 0.14, duration: 0.35 },
      { freq: 1318.51, start: 0.22, duration: 0.65 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn("Audio chime playback error:", err);
  }
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
  } catch (err) {
    console.warn("Notification permission request error:", err);
  }
  return false;
}

// Request Geolocation (GPS) Permission
export async function requestLocationPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return false;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Request Microphone (Audio) Permission
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // release mic immediately
    return true;
  } catch {
    return false;
  }
}

// Comprehensive Master Permission Requester (1-Click for all: Notifications + Location + Mic + Audio)
export async function requestAllSystemPermissions(): Promise<{
  notifications: boolean;
  location: boolean;
  microphone: boolean;
}> {
  unlockAudio();
  playNotificationSound();

  const [notifGranted, locGranted, micGranted] = await Promise.all([
    requestNotificationPermission(),
    requestLocationPermission(),
    requestMicrophonePermission(),
  ]);

  if (notifGranted) {
    showBrowserNotification("✅ تم تفعيل إشعارات النظام بنجاح", {
      body: "ستصلك الآن تنبيهات الحضور، الرواتب، المهام، وتسجيل الدخول مباشرة على شاشة هاتفك.",
      link: "/dashboard"
    });
  }

  return {
    notifications: notifGranted,
    location: locGranted,
    microphone: micGranted,
  };
}

// Display Rich Mobile Notification (Notification Shade, Lockscreen & Desktop)
export async function showBrowserNotification(title: string, options?: { body?: string; icon?: string; link?: string }) {
  try {
    if (typeof window === "undefined") return;

    const notifBody = options?.body || "لديك إشعار جديد في نظام الموارد البشرية";
    const notifLink = options?.link || "/dashboard";

    // 0. Trigger Native React Native System Notification for Home Screen & Lock Screen Banner
    if (typeof (window as any).sendMobileNotification === "function") {
      try {
        (window as any).sendMobileNotification(title, notifBody);
      } catch {}
    } else if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      try {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "SHOW_NOTIFICATION",
            title: title || "إشعار جديد من ARCO HR",
            message: notifBody,
          })
        );
      } catch {}
    }

    // Trigger device vibration on mobile
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([300, 150, 300]);
      } catch {}
    }

    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      } catch {}
    }

    if (Notification.permission === "granted") {
      const smsTitle = title?.startsWith("💬") ? title : `💬 رسالة: ${title}`;

      // 1. Try Service Worker showNotification (for Android/iOS PWA Notification Shade & Lockscreen)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready || await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(smsTitle, {
              body: notifBody,
              icon: "/arco-logo.png",
              badge: "/arco-logo.png",
              dir: "rtl",
              lang: "ar",
              tag: "sms-" + Date.now(),
              renotify: true,
              requireInteraction: true,
              vibrate: [250, 100, 250, 100, 250, 100, 400],
              data: { link: notifLink }
            } as any);
            return;
          }
        } catch (swErr) {
          console.warn("SW notification failed, falling back to Notification API:", swErr);
        }
      }

      // 2. Fallback to Window Notification API
      const notif = new Notification(smsTitle, {
        body: notifBody,
        icon: "/arco-logo.png",
        badge: "/arco-logo.png",
        dir: "rtl",
        lang: "ar",
        tag: "sms-" + Date.now(),
        requireInteraction: true,
      });

      notif.onclick = function () {
        window.focus();
        if (options?.link) {
          window.location.href = options.link;
        }
        notif.close();
      };
    }
  } catch (err) {
    console.warn("Browser notification popup error:", err);
  }
}
