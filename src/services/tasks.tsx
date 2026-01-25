import "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  query,
  getFirestore,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  createdBy?: string; // Quem criou (pode ser "Juiz")
  observation?: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  photo?: string;
  assignedToNickname?: string;
  completedByNickname?: string;
  completedAt?: string;
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

export const checkTaskStatus = (task: Task): "normal" | "late" | "expired" => {
  if (task.completed) return "normal";
  if (!task.createdAt) return "normal";
  const created = new Date(task.createdAt).getTime();
  const now = new Date().getTime();
  const diffHours = (now - created) / (1000 * 60 * 60);
  if (diffHours >= 26) return "expired";
  if (diffHours >= 24) return "late";
  return "normal";
};

export const TaskService = {
  listen: async (
    onUpdate: (tasks: Task[]) => void,
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
          // GARANTE QUE O ID SEJA O DO ARQUIVO REAL
          tasks.push({ ...data, id: doc.id });
        });
        tasks.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        onUpdate(tasks);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao iniciar listener:", error);
      return null;
    }
  },

  getToken: async (nickname: string) => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;
      const db = getDb();
      // O ID do documento na coleção 'tokens' é o nickname do usuário
      const tokenRef = doc(
        db,
        COUPLES_COLLECTION,
        coupleCode,
        "tokens",
        nickname,
      );
      const docSnap = await getDoc(tokenRef);

      if (docSnap.exists()) {
        return docSnap.data().token;
      }
      return null;
    } catch (error) {
      console.error("Erro ao pegar token específico:", error);
      return null;
    }
  },

  add: async (task: Task): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      // Força o ID ser o timestamp gerado no app
      const taskDocRef = doc(
        db,
        COUPLES_COLLECTION,
        coupleCode,
        "tasks",
        task.id,
      );

      const taskWithTimestamp = {
        ...task,
        createdAt: new Date().toISOString(),
      };

      await setDoc(taskDocRef, taskWithTimestamp);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;
      const db = getDb();
      if (!id) return;

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

      // Use setDoc com merge para evitar erro de "No document to update"
      await setDoc(taskDocRef, data, { merge: true });
    } catch (error) {
      console.error("Erro ao update:", error);
      throw error;
    }
  },

  uploadImage: async (uri: string): Promise<string | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          reject(new TypeError("Falha na conversão da imagem"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      const filename = `evidence_${Date.now()}.jpg`;
      const storage = getStorageInstance();
      const storageRef = ref(
        storage,
        `couples/${coupleCode}/tasks/${filename}`,
      );
      await uploadBytes(storageRef, blob);
      // @ts-ignore
      blob.close();
      return await getDownloadURL(storageRef);
    } catch (error) {
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
        nickname,
      );
      await setDoc(
        tokenRef,
        { token, updatedAt: new Date().toISOString() },
        { merge: true },
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
        "tokens",
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
        "tokens",
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
