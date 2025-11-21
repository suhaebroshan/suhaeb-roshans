
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const STORAGE_KEY = 'trust_firebase_config';

export const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    return null;
  }
  return null;
};

export const saveConfig = (config: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

// Configuration provided explicitly as default
const defaultConfig = {
  apiKey: "AIzaSyCxr36EvI2knSK8QEzvie-0wY5rVmco2fs",
  authDomain: "asdfgh-f76e8.firebaseapp.com",
  projectId: "asdfgh-f76e8",
  storageBucket: "asdfgh-f76e8.firebasestorage.app",
  messagingSenderId: "748961356884",
  appId: "1:748961356884:web:e2c71724e943ea9718e1c1",
  measurementId: "G-7C9083G7VH"
};

const configToUse = getStoredConfig() || defaultConfig;

let app: FirebaseApp;
let db: Firestore | null = null;

try {
  // Only initialize if we have a valid config object with at least a projectId or apiKey
  if (configToUse && (configToUse.apiKey || configToUse.projectId)) {
    if (!getApps().length) {
        app = initializeApp(configToUse);
    } else {
        app = getApp();
    }
    
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase", error);
  db = null;
}

export { db };
