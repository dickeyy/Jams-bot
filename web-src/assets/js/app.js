// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-analytics.js";
const firebaseConfig = {
    apiKey: "AIzaSyDNQrr0sE6JHczpQwTo-QL4e9_BkTnGn9k",
    authDomain: "jams-bot.firebaseapp.com",
    projectId: "jams-bot",
    storageBucket: "jams-bot.appspot.com",
    messagingSenderId: "975763003499",
    appId: "1:975763003499:web:2c52fbe0a59b0c1476f92e",
    measurementId: "G-91R8DS4RSH"
};
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);