import { initializeApp } from "firebase/app";
// Voltamos para o getAuth padrão, que é mais estável com TypeScript
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Importamos o AsyncStorage apenas para garantir que o pacote está linkado no projeto
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

// O getAuth detecta o @react-native-async-storage/async-storage automaticamente
// se ele estiver instalado no package.json (e você já instalou!)
export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
