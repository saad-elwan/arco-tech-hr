"use client";

import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export default function FirebaseInitializer() {
  useEffect(() => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) return; // Skip if config is not filled

    try {
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Request permission
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          // Get FCM Token
          getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }).then((currentToken) => {
            if (currentToken) {
              // Send token to server
              fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: currentToken })
              }).catch(console.error);
            }
          }).catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
          });
        }
      });

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // We could also show a toast notification here if desired
      });
    } catch (error) {
      console.error('Firebase initialization error', error);
    }
  }, []);

  return null;
}
