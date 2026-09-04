importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// We use self.firebaseConfig injected from the main app or define it here
// Usually, it's better to define it here if possible. Wait, SW needs the config.
// The user will add these placeholders later.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icons/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.log('Firebase messaging not initialized (waiting for config)', error);
}
