import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9359yrPLwhLNDM910kZdhs81-p3JNAko",
  authDomain: "myluxweb.firebaseapp.com",
  projectId: "myluxweb",
  storageBucket: "myluxweb.firebasestorage.app",
  messagingSenderId: "1072827930245",
  appId: "1:1072827930245:web:bb7ec4f9114485cbdf7bec",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
