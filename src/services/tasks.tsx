import "../../firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  getFirestore,
  onSnapshot,
  setDoc, // <--- Importante para salvar o token
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  observation?: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  photo?: string;
}

const COUPLES_COLLECTION = "couples";

const getDb = () => {
  const app = getApp();
  return getFirestore(app);
};

const getStorageInstance = () => {
  const app = getApp();
  return getStorage(app);
};

const getCoupleCode = async () => {
  const code = await AsyncStorage.getItem("@couple_code");
  return code;
};

export const TaskService = {
  // --- TEMPO REAL ---
  listen: async (
    onUpdate: (tasks: Task[]) => void
  ): Promise<(() => void) | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;

      const db = getDb();
      const tasksRef = collection(db, COUPLES_COLLECTION, coupleCode, "tasks");
      const q = query(tasksRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const tasks: Task[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Omit<Task, "id">;
            tasks.push({ id: doc.id, ...data });
          });
          onUpdate(tasks);
        },
        (error) => {
          console.error("Erro no listener:", error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Erro ao iniciar listener:", error);
      return null;
    }
  },

  getAll: async (): Promise<Task[]> => {
    return []; // Não usado mais, pois usamos o listen
  },

  add: async (currentList: Task[], task: Task): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const tasksRef = collection(db, COUPLES_COLLECTION, coupleCode, "tasks");
      const { id, ...taskData } = task;
      await addDoc(tasksRef, taskData);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  },

  delete: async (currentList: Task[], id: string): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const taskDocRef = doc(db, COUPLES_COLLECTION, coupleCode, "tasks", id);
      await deleteDoc(taskDocRef);
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  },

  toggle: async (currentList: Task[], id: string): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const taskToToggle = currentList.find((t) => t.id === id);
      if (!taskToToggle) return;
      const taskDocRef = doc(db, COUPLES_COLLECTION, coupleCode, "tasks", id);
      await updateDoc(taskDocRef, { completed: !taskToToggle.completed });
    } catch (error) {
      console.error("Erro ao toggle:", error);
    }
  },

  update: async (id: string, data: Partial<Task>): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const taskDocRef = doc(db, COUPLES_COLLECTION, coupleCode, "tasks", id);
      await updateDoc(taskDocRef, data);
    } catch (error) {
      console.error("Erro ao update:", error);
    }
  },

  uploadImage: async (uri: string): Promise<string | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.substring(uri.lastIndexOf("/") + 1);
      const storage = getStorageInstance();
      const storageRef = ref(
        storage,
        `couples/${coupleCode}/${Date.now()}_${filename}`
      );
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      return null;
    }
  },

  // --- NOTIFICAÇÕES: SALVAR TOKEN ---
  saveUserToken: async (token: string, userName: string) => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;

      const db = getDb();
      // Salva em: couples/CODIGO/tokens/NOME_DO_USUARIO
      const tokenRef = doc(
        db,
        COUPLES_COLLECTION,
        coupleCode,
        "tokens",
        userName
      );

      await setDoc(
        tokenRef,
        {
          token: token,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ); // merge garante que não apaga outros campos se houver

      console.log("Token salvo para:", userName);
    } catch (error) {
      console.error("Erro ao salvar token:", error);
    }
  },

  // --- NOTIFICAÇÕES: PEGAR TOKEN DO PARCEIRO ---
  getPartnerToken: async (myUserName: string) => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;

      const db = getDb();
      const tokensRef = collection(
        db,
        COUPLES_COLLECTION,
        coupleCode,
        "tokens"
      );
      const snapshot = await getDocs(tokensRef);

      let partnerToken = null;

      snapshot.forEach((doc) => {
        // Se o ID do documento (nome) não for o meu, deve ser o do parceiro
        if (doc.id !== myUserName) {
          const data = doc.data();
          partnerToken = data.token;
        }
      });

      return partnerToken;
    } catch (error) {
      console.error("Erro ao buscar token do parceiro:", error);
      return null;
    }
  },
};
