// Web Audio API & Native Browser Notification Utility

let audioCtx: AudioContext | null = null;

export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic Luxury Chime: D5 (587.33Hz) -> A5 (880Hz) -> D6 (1174.66Hz)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.25 },
      { freq: 880.00, start: 0.08, duration: 0.35 },
      { freq: 1174.66, start: 0.16, duration: 0.60 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(audioCtx!.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn("Audio chime error:", err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export async function showBrowserNotification(title: string, options?: { body?: string; icon?: string; link?: string }) {
  try {
    if (typeof window === "undefined") return;

    // Trigger device vibration on mobile
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([250, 100, 250]);
      } catch {}
    }

    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      // If service worker registration is available, use it for persistent mobile drawer notifications
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.showNotification(title, {
              body: options?.body || "",
              icon: options?.icon || "/favicon.ico",
              badge: "/favicon.ico",
              dir: "rtl",
              lang: "ar",
              tag: "hr-notif-" + Date.now(),
              renotify: true,
              data: { link: options?.link || "/dashboard" }
            } as any);
            return;
          }
        } catch {}
      }

      // Standard desktop / browser notification
      const notif = new Notification(title, {
        body: options?.body || "",
        icon: options?.icon || "/favicon.ico",
        badge: "/favicon.ico",
        dir: "rtl",
        lang: "ar",
        tag: "hr-notif-" + Date.now(),
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
