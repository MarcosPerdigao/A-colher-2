import "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const COUPLES_COLLECTION = "couples";

const getDb = () => {
  const app = getApp();
  return getFirestore(app);
};

const getCoupleCode = async () => {
  return await AsyncStorage.getItem("@couple_code");
};

export const HistoryService = {
  // Registra um evento no histórico
  logAction: async (
    userNickname: string,
    action: "criou" | "editou" | "excluiu" | "concluiu",
    taskTitle: string,
    details?: string
  ) => {
    try {
      const coupleCode = await getCoupleCode();
      if (!coupleCode) return;

      const db = getDb();
      const historyRef = collection(db, COUPLES_COLLECTION, coupleCode, "history");

      await addDoc(historyRef, {
        user: userNickname,
        action,
        taskTitle,
        details: details || "",
        timestamp: new Date().toISOString(),
      });
      
      console.log(`📜 Histórico registrado: ${userNickname} ${action} - ${taskTitle}`);
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
    }
  },
};