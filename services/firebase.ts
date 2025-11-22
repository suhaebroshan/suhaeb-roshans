
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const STORAGE_KEY = 'trust_firebase_config';

// Config provided by user
const firebaseConfig = {
  apiKey: "AIzaSyCxr36EvI2knSK8QEzvie-0wY5rVmco2fs",
  authDomain: "asdfgh-f76e8.firebaseapp.com",
  projectId: "asdfgh-f76e8",
  storageBucket: "asdfgh-f76e8.firebasestorage.app",
  messagingSenderId: "748961356884",
  appId: "1:748961356884:web:e2c71724e943ea9718e1c1",
  measurementId: "G-7C9083G7VH"
};

let app: FirebaseApp;
let db: Firestore | null = null;
let analytics;

try {
  if (!getApps().length) {
      app = initializeApp(firebaseConfig);
  } else {
      app = getApp();
  }
  
  db = getFirestore(app);
  
  if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
  }
  
  console.log("✅ Firebase Backend Connected Successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Backend", error);
  db = null;
}

export { db };

export const getStoredConfig = () => firebaseConfig;

export const saveConfig = (config: any) => {
  // Keeps interface for DatabaseConfig component, but config is hardcoded
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};
