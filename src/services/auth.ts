import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail, // <--- Importação para o Esqueci a Senha
  User,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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
        pass,
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
        pass,
      );
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.code);
    }
  },

  // --- FUNÇÃO NOVA: RECUPERAR SENHA ---
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
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
    anniversaryDate: string,
    relationshipStatus: "namorando" | "casados", // <--- 1. O 8º PARÂMETRO ADICIONADO AQUI!
  ) => {
    // 1. Salva dados do Usuário
    await setDoc(
      doc(db, "users", uid),
      {
        email: auth.currentUser?.email,
        nickname,
        sexo,
        coupleCode,
        birthDate,
        anniversaryDate,
        relationshipStatus, // <--- 2. SALVANDO NO FIREBASE AQUI!
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // 2. Atualiza ou Cria o Casal
    const coupleRef = doc(db, "couples", coupleCode);
    const coupleSnap = await getDoc(coupleRef);

    if (mode === "create" && !coupleSnap.exists()) {
      await setDoc(coupleRef, {
        users: [uid],
        createdAt: new Date().toISOString(),
        anniversaryDate: anniversaryDate,
        createdBy: uid,
      });
    } else if (mode === "join") {
      // 🚀 NOVA VALIDAÇÃO AQUI
      if (coupleSnap.exists()) {
        const coupleData = coupleSnap.data();

        // Verifica se o casal já tem 2 pessoas (evita trisais não intencionais)
        if (coupleData.users && coupleData.users.length >= 2) {
          throw new Error("Este código de casal já está lotado.");
        }

        await updateDoc(coupleRef, {
          users: arrayUnion(uid),
        });
      } else {
        // Bloqueia se o código digitado não existir no banco
        throw new Error("Código de casal inválido ou não encontrado.");
      }
    }

    // 3. Salva Localmente
    await AsyncStorage.setItem("@user_nickname", nickname);
    await AsyncStorage.setItem("@user_identity", sexo);
    await AsyncStorage.setItem("@app_theme", sexo);
    await AsyncStorage.setItem("@couple_code", coupleCode);
  },

  updatePushToken: async (uid: string, token: string) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        pushToken: token,
        lastLogin: new Date().toISOString(),
      });
      console.log("🔥 Token salvo no Firestore!");
    } catch (error) {
      console.log("Erro ao salvar token:", error);
    }
  },

  getCoupleDetails: async (coupleCode: string) => {
    try {
      const coupleRef = doc(db, "couples", coupleCode);
      const coupleSnap = await getDoc(coupleRef);

      if (coupleSnap.exists()) {
        const data = coupleSnap.data();
        const userIds = data.users || [];

        const names = [];
        for (const uid of userIds) {
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            names.push(uDoc.data().nickname);
          }
        }
        return { users: userIds, names };
      }
      return null;
    } catch {
      return null;
    }
  },

  leaveCouple: async (uid: string, coupleCode: string) => {
    const coupleRef = doc(db, "couples", coupleCode);
    await updateDoc(coupleRef, {
      users: arrayRemove(uid),
    });
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      coupleCode: null,
    });
    await AsyncStorage.removeItem("@couple_code");
  },
};
