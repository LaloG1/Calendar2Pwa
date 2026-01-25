// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBAgJRzE81RgKv1LOkO0yLH_ikCfUzgwLA",
  authDomain: "calendar2pwa.firebaseapp.com",
  projectId: "calendar2pwa",
  storageBucket: "calendar2pwa.firebasestorage.app",
  messagingSenderId: "647981191870",
  appId: "1:647981191870:web:7e2e6ae0fb1ad252fe04ef",
  measurementId: "G-NQZRZJX9SP",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
