import { initializeApp } from "firebase/app";
// @ts-ignore: Erro de tipagem conhecido do Firebase no Expo
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB8iIRPLrfR0zBqoHfMlYXUrh_UL8mIAa4",
  authDomain: "acolher-3e8ec.firebaseapp.com",
  projectId: "acolher-3e8ec",
  storageBucket: "acolher-3e8ec.firebasestorage.app",
  messagingSenderId: "211835036142",
  appId: "1:211835036142:web:d56e15e2e95bab7ecf2eff",
  measurementId: "G-VB4LMXR641",
};

const app = initializeApp(firebaseConfig);

// Inicializa o Auth forçando o uso do AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
