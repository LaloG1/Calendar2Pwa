// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDH3A6l6YaI4VEnHGW988nEJQhnANLpQYc",
  authDomain: "calendar2-628e3.firebaseapp.com",
  projectId: "calendar2-628e3",
  storageBucket: "calendar2-628e3.firebasestorage.app",
  appId: "1:891540603726:android:99d49b301b96c9e145941f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
