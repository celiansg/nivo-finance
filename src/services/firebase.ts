import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCFyLg-QcYn-5UMeHGcbeuznMVDmM7tm0w',
  authDomain: 'finances-f5c06.firebaseapp.com',
  projectId: 'finances-f5c06',
  storageBucket: 'finances-f5c06.firebasestorage.app',
  messagingSenderId: '342202836723',
  appId: '1:342202836723:web:6a02197a766a3f5ed83986',
  measurementId: 'G-6JFQ6005HY',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

if (import.meta.env.PROD && typeof window !== 'undefined') {
  const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();
  if (appCheckSiteKey)
    void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) =>
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      }),
    );
  void import('firebase/analytics').then(async ({ getAnalytics, isSupported }) => {
    if (await isSupported()) getAnalytics(firebaseApp);
  });
}
