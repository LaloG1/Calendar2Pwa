// src/firebase/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 👈 Agrega esta línea
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAgJRzE81RgKv1LOkO0yLH_ikCfUzgwLA",
  authDomain: "calendar2pwa.firebaseapp.com",
  projectId: "calendar2pwa",
  storageBucket: "calendar2pwa.firebasestorage.app",
  messagingSenderId: "647981191870",
  appId: "1:647981191870:web:77f1971b435f53abfe04ef",
  measurementId: "G-M6TVB7NF7Z",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta Firestore y Auth
export const db = getFirestore(app);
export const auth = getAuth(app); // 👈 ¡Esta línea es clave!
