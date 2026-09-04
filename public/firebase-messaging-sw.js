importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAVWhnEinWK6NwcjA7ihdakdedCuxIVkb0",
  authDomain: "hr-arco.firebaseapp.com",
  projectId: "hr-arco",
  storageBucket: "hr-arco.firebasestorage.app",
  messagingSenderId: "760930795870",
  appId: "1:760930795870:web:66700d684dd089c8134fcf",
  measurementId: "G-HJQ9F9MCPM"
};

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
  console.log('Firebase messaging not initialized', error);
}
