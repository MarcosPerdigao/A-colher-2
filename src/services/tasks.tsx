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
  getDocs,
  getDoc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  createdBy?: string;
  observation?: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  photo?: string;
  assignedToNickname?: string;
  completedByNickname?: string;
  completedAt?: string;
}

const COUPLES_COLLECTION = "couples";

const getDb = () => getFirestore(getApp());
const getStorageInstance = () => getStorage(getApp());
const getCoupleCode = async () => await AsyncStorage.getItem("@couple_code");

export const checkTaskStatus = (task: Task): "normal" | "late" | "expired" => {
  if (task.completed) return "normal";
  if (!task.createdAt) return "normal";
  const diffHours =
    (new Date().getTime() - new Date(task.createdAt).getTime()) /
    (1000 * 60 * 60);
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
      const q = query(
        collection(getDb(), COUPLES_COLLECTION, coupleCode, "tasks"),
      );
      return onSnapshot(q, (snapshot) => {
        const tasks: Task[] = [];
        snapshot.forEach((doc) =>
          tasks.push({ ...(doc.data() as Omit<Task, "id">), id: doc.id }),
        );
        tasks.sort((a, b) =>
          a.completed === b.completed ? 0 : a.completed ? 1 : -1,
        );
        onUpdate(tasks);
      });
    } catch (error) {
      return null;
    }
  },

  add: async (task: Task): Promise<void> => {
    const coupleCode = await getCoupleCode();
    if (!coupleCode) return;
    await setDoc(
      doc(getDb(), COUPLES_COLLECTION, coupleCode, "tasks", task.id),
      { ...task, createdAt: new Date().toISOString() },
    );
  },

  delete: async (id: string): Promise<void> => {
    const coupleCode = await getCoupleCode();
    if (id && coupleCode)
      await deleteDoc(
        doc(getDb(), COUPLES_COLLECTION, coupleCode, "tasks", id),
      );
  },

  update: async (id: string, data: Partial<Task>): Promise<void> => {
    const coupleCode = await getCoupleCode();
    if (coupleCode)
      await setDoc(
        doc(getDb(), COUPLES_COLLECTION, coupleCode, "tasks", id),
        data,
        { merge: true },
      );
  },

  uploadImage: async (uri: string): Promise<string | null> => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return null;
      const blob: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError("Falha na conversão"));
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      const storageRef = ref(
        getStorageInstance(),
        `couples/${coupleCode}/tasks/evidence_${Date.now()}.jpg`,
      );
      await uploadBytes(storageRef, blob);
      blob.close();
      return await getDownloadURL(storageRef);
    } catch (error) {
      return null;
    }
  },

  // 🚀 NOVA LÓGICA INFALÍVEL PARA BUSCAR O PARCEIRO REAL
  getPartnerInfo: async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) return null;
      const db = getDb();
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const coupleCode = userDoc.data()?.coupleCode;
      if (!coupleCode) return null;

      const coupleDoc = await getDoc(doc(db, "couples", coupleCode));
      const uids = coupleDoc.data()?.users || [];
      const partnerUid = uids.find((id: string) => id !== user.uid);

      if (!partnerUid) return null;
      const partnerDoc = await getDoc(doc(db, "users", partnerUid));
      return partnerDoc.exists() ? partnerDoc.data() : null;
    } catch (e) {
      return null;
    }
  },

  getPartnerNickname: async () => {
    const info = await TaskService.getPartnerInfo();
    return info?.nickname || null;
  },

  getPartnerToken: async () => {
    const info = await TaskService.getPartnerInfo();
    return info?.pushToken || null; // Garante que pega o token real atrelado à conta
  },

  // Mantido para não quebrar compatibilidade
  saveUserToken: async (token: string, nickname: string) => {},
  getToken: async (nickname: string) => {
    return null;
  },
};
