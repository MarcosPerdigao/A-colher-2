import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// IMPORTA A CONFIGURAÇÃO CENTRALIZADA (Aqui está a correção!)
import { auth, db } from "../../firebaseConfig";

export const AuthService = {
  getCurrentUser: () => auth.currentUser,

  onStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  login: async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        pass
      );
      await AuthService.syncUserData(userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.code);
    }
  },

  register: async (email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        pass
      );
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.code);
    }
  },

  logout: async () => {
    await AsyncStorage.clear();
    return await signOut(auth);
  },

  syncUserData: async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.nickname)
        await AsyncStorage.setItem("@user_nickname", data.nickname);
      if (data.coupleCode)
        await AsyncStorage.setItem("@couple_code", data.coupleCode);
      if (data.sexo) {
        await AsyncStorage.setItem("@user_identity", data.sexo);
        const currentTheme = await AsyncStorage.getItem("@app_theme");
        if (!currentTheme) await AsyncStorage.setItem("@app_theme", data.sexo);
      }
      return data;
    }
    return null;
  },

  saveUserProfile: async (
    uid: string,
    nickname: string,
    sexo: string,
    coupleCode: string,
    mode: "create" | "join",
    birthDate: string,
    anniversaryDate: string
  ) => {
    await setDoc(doc(db, "users", uid), {
      email: auth.currentUser?.email,
      nickname,
      sexo,
      coupleCode,
      birthDate,
      anniversaryDate,
      createdAt: new Date().toISOString(),
    });

    const coupleRef = doc(db, "couples", coupleCode);
    const coupleData: any = {
      users: mode === "create" ? [uid] : arrayUnion(uid),
    };

    if (mode === "create") {
      coupleData.createdAt = new Date().toISOString();
      coupleData.anniversaryDate = anniversaryDate;
      await setDoc(coupleRef, coupleData);
    } else {
      await updateDoc(coupleRef, coupleData);
    }

    await AsyncStorage.setItem("@user_nickname", nickname);
    await AsyncStorage.setItem("@user_identity", sexo);
    await AsyncStorage.setItem("@app_theme", sexo);
    await AsyncStorage.setItem("@couple_code", coupleCode);
  },
};
