import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAVWhnEinWK6NwcjA7ihdakdedCuxIVkb0",
  authDomain: "hr-arco.firebaseapp.com",
  projectId: "hr-arco",
  storageBucket: "hr-arco.firebasestorage.app",
  messagingSenderId: "760930795870",
  appId: "1:760930795870:web:66700d684dd089c8134fcf",
  measurementId: "G-HJQ9F9MCPM"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const messaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

export const requestForToken = async () => {
  try {
    const msg = await messaging();
    if (!msg) return null;

    const currentToken = await getToken(msg);
    
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // Register token in backend
      await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: currentToken }),
      });
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};
