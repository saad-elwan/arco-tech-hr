const CACHE_NAME = 'arco-hr-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

let lastSeenId = 0;
let isPollerRunning = false;

// Background notification poller to keep notifications alive on Lock Screen & Mobile Background
function runBackgroundNotificationChecker() {
  if (isPollerRunning) return;
  isPollerRunning = true;

  setInterval(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const notifs = data.notifications || [];
      if (notifs.length > 0) {
        const latest = notifs[0];
        const numId = typeof latest.id === 'string' ? parseInt(latest.id.replace(/\D/g, '')) || 0 : latest.id;

        if (lastSeenId === 0) {
          lastSeenId = numId;
        } else if (numId > lastSeenId && !latest.isRead) {
          lastSeenId = numId;

          // Dispatch native SMS-style notification to Mobile Lock Screen & Status Bar
          const smsTitle = latest.title?.startsWith("💬") ? latest.title : `💬 رسالة: ${latest.title}`;
          const smsBody = latest.desc || latest.body || latest.message || "لديك رسالة جديدة في النظام";

          self.registration.showNotification(smsTitle, {
            body: smsBody,
            icon: "/arco-logo.png",
            badge: "/arco-logo.png",
            vibrate: [250, 100, 250, 100, 250, 100, 400],
            data: { link: latest.link || "/dashboard", id: latest.id },
            tag: "sms-msg-" + numId,
            renotify: true,
            requireInteraction: true,
            dir: "rtl",
            lang: "ar",
            actions: [
              { action: "open", title: "📩 فتح الرسالة" }
            ]
          });
        }
      }
    } catch {}
  }, 4000);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      runBackgroundNotificationChecker();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'START_BG_POLL') {
    runBackgroundNotificationChecker();
  }
});

// Push & Mobile Lockscreen Notification Handler
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "إشعار جديد", body: event.data.text() };
    }
  }
  const title = data.title || "نظام الموارد البشرية - Arco Tech";
  const options = {
    body: data.body || data.message || data.desc || "لديك إشعار جديد في النظام",
    icon: "/arco-logo.png",
    badge: "/arco-logo.png",
    vibrate: [300, 150, 300],
    data: { link: data.link || "/dashboard", id: data.id },
    tag: "arco-hr-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    dir: "rtl",
    lang: "ar"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click notification to focus, mark as read, and open target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || '/dashboard';
  const notifId = event.notification.data?.id;

  // Mark as read in background
  if (notifId) {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notifId }),
      credentials: 'include'
    }).catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
