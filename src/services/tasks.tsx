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
  setDoc,
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
  return await AsyncStorage.getItem("@couple_code");
};

export const TaskService = {
  listen: async (
    onUpdate: (tasks: Task[]) => void
  ): Promise<(() => void) | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;

      const db = getDb();
      const tasksRef = collection(db, COUPLES_COLLECTION, coupleCode, "tasks");
      const q = query(tasksRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Task, "id">;
          tasks.push({ id: doc.id, ...data });
        });
        onUpdate(tasks);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao iniciar listener:", error);
      return null;
    }
  },

  add: async (task: Task): Promise<void> => {
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

  delete: async (id: string): Promise<void> => {
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

  update: async (id: string, data: Partial<Task>): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const taskDocRef = doc(db, COUPLES_COLLECTION, coupleCode, "tasks", id);
      await updateDoc(taskDocRef, data);
    } catch (error) {
      console.error("Erro ao update:", error);
      throw error; // Lança o erro para o Mural pegar
    }
  },

  // UPLOAD BLINDADO (USANDO XMLHttpRequest)
  uploadImage: async (uri: string): Promise<string | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;

      // 1. Converte URI para Blob de forma robusta
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.log("XHR Error:", e);
          reject(new TypeError("Falha na conversão da imagem"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      // 2. Define caminho
      const filename = `evidence_${Date.now()}.jpg`;
      const storage = getStorageInstance();
      const storageRef = ref(
        storage,
        `couples/${coupleCode}/tasks/${filename}`
      );

      // 3. Upload
      await uploadBytes(storageRef, blob);

      // 4. Libera memória do blob (importante!)
      // @ts-ignore
      blob.close();

      // 5. URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error("Erro crítico no upload:", error);
      return null;
    }
  },

  saveUserToken: async (token: string, nickname: string) => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      const tokenRef = doc(
        db,
        COUPLES_COLLECTION,
        coupleCode,
        "tokens",
        nickname
      );
      await setDoc(
        tokenRef,
        { token, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (error) {
      console.error("Erro token:", error);
    }
  },

  getPartnerNickname: async (myNickname: string) => {
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
      let partnerNickname = null;
      snapshot.forEach((doc) => {
        if (doc.id !== myNickname) partnerNickname = doc.id;
      });
      return partnerNickname;
    } catch (error) {
      return null;
    }
  },

  getPartnerToken: async (myNickname: string) => {
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
        if (doc.id !== myNickname) partnerToken = doc.data().token;
      });
      return partnerToken;
    } catch (error) {
      return null;
    }
  },
};
