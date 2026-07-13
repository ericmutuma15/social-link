// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCAlIUfXGNCdDGDfVS9Sjxexxq6GScRkdc",
    authDomain: "projx-8adc8.firebaseapp.com",
    projectId: "projx-8adc8",
    storageBucket: "projx-8adc8.firebasestorage.app",
    messagingSenderId: "779196128624",
    appId: "1:779196128624:web:637cc73c4e8ff2777843b5",
    measurementId: "G-QL43M84DR6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
