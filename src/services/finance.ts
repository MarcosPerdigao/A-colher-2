import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { AuthService } from "./auth";
import { db } from "../../firebaseConfig";

export type Transaction = {
  id?: string;
  title: string;
  value: number;
  type: "expense" | "income";
  paidBy: string;
  beneficiary: string;
  status: "paid" | "pending";
  category: string;
  paymentMethod: string;
  split: string;
  isFixed: boolean;
  createdAt: string;
  date: string;
  month: string;
  coupleCode: string;
};

export const FinanceService = {
  saveSettings: async (settings: {
    mode: "unified" | "split";
    monthlyIncome: number;
  }) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData?.coupleCode) return;
    await setDoc(
      doc(db, "couples", userData.coupleCode),
      { financeSettings: settings },
      { merge: true },
    );
  },

  getSettings: async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return null;
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData?.coupleCode) return null;
    const snap = await getDoc(doc(db, "couples", userData.coupleCode));
    if (snap.exists()) {
      return snap.data().financeSettings || null;
    }
    return null;
  },

  // 🚀 Salva nova categoria customizada na nuvem
  saveCustomCategory: async (category: string) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData?.coupleCode) return;
    await setDoc(
      doc(db, "couples", userData.coupleCode),
      { customCategories: arrayUnion(category) },
      { merge: true },
    );
  },

  getCustomCategories: async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData?.coupleCode) return [];
    const snap = await getDoc(doc(db, "couples", userData.coupleCode));
    if (snap.exists() && snap.data().customCategories) {
      return snap.data().customCategories;
    }
    return [];
  },

  // 🚀 Listener em Tempo Real (igual ao Mural)
  listen: async (callback: (list: Transaction[]) => void) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData || !userData.coupleCode) return;

    const q = query(
      collection(db, "finance"),
      where("coupleCode", "==", userData.coupleCode),
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Transaction,
      );
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      callback(data);
    });
  },

  add: async (transaction: Partial<Transaction>) => {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error("Sem usuário");
    const userData = await AuthService.syncUserData(user.uid);

    await addDoc(collection(db, "finance"), {
      ...transaction,
      coupleCode: userData?.coupleCode,
      status: "paid",
      createdAt: new Date().toISOString(),
    });
  },

  update: async (id: string, data: Partial<Transaction>) => {
    await updateDoc(doc(db, "finance", id), data);
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, "finance", id));
  },
};
