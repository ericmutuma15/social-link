import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const config = { apiKey: "AIzaSyCAlIUfXGNCdDGDfVS9Sjxexxq6GScRkdc", authDomain: "projx-8adc8.firebaseapp.com", projectId: "projx-8adc8", storageBucket: "projx-8adc8.appspot.com", messagingSenderId: "779196128624", appId: "1:779196128624:web:637cc73c4e8ff2777843b5" };
export const firebaseAuth = getAuth(initializeApp(config));
