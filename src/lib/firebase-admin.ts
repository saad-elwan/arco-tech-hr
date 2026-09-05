import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'dummy-project-id';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'dummy@dummy.com';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----';

    // Only initialize if we have at least a hint of real config, or just initialize with dummy
    if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const messaging = getApps().length ? getMessaging() : null;
