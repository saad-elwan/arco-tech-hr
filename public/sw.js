const CACHE_NAME = 'arco-hr-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
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
    icon: "/icon-192.png",
    badge: "/favicon.ico",
    vibrate: [300, 150, 300],
    data: { link: data.link || "/dashboard" },
    tag: "arco-hr-" + Date.now(),
    renotify: true,
    requireInteraction: false,
    dir: "rtl",
    lang: "ar"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click notification to focus or open web app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || '/dashboard';

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
