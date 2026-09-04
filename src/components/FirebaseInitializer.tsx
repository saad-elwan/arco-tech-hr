"use client";

import { useEffect } from 'react';
import { requestForToken, messaging } from '@/lib/firebase';
import { onMessage } from 'firebase/messaging';

export default function FirebaseInitializer() {
  useEffect(() => {
    // Request permission
    Notification.requestPermission().then(async (permission) => {
      if (permission === 'granted') {
        // requestForToken handles getting the token and sending to server
        await requestForToken();
        
        // Handle foreground messages
        const msg = await messaging();
        if (msg) {
          onMessage(msg, (payload) => {
            console.log('Message received. ', payload);
            // Optional: show a toast notification here if desired
            if (payload.notification) {
               new Notification(payload.notification.title || 'New Message', {
                  body: payload.notification.body,
                  icon: '/icons/icon-192x192.png'
               });
            }
          });
        }
      }
    });
  }, []);

  return null;
}
