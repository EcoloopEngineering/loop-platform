import { boot } from 'quasar/wrappers';
import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

let firebaseApp: FirebaseApp;
let auth: Auth;

export default boot(() => {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
});

export function useFirebaseApp(): FirebaseApp {
  return firebaseApp ?? getApp();
}

export function useFirebaseAuth(): Auth {
  return auth ?? getAuth();
}
