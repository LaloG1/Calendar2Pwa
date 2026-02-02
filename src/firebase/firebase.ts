// src/firebase/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // 👈 Agrega esta línea
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDH3A6l6YaI4VEnHGW988nEJQhnANLpQYc",
  authDomain: "calendar2-628e3.firebaseapp.com",
  projectId: "calendar2-628e3",
  storageBucket: "calendar2-628e3.firebasestorage.app",
  appId: "1:891540603726:android:99d49b301b96c9e145941f",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta Firestore y Auth
export const db = getFirestore(app);
export const auth = getAuth(app); // 👈 ¡Esta línea es clave!
