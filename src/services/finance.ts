import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { AuthService } from "./auth";
// IMPORTA A CONFIGURAÇÃO CENTRALIZADA
import { db } from "../../firebaseConfig";

export type Transaction = {
  id: string;
  title: string;
  value: number;
  type: "expense" | "income";
  paidBy: string | null;
  status: "paid" | "pending";
  category: "home" | "food" | "transport" | "leisure" | "market" | "other";
  createdAt: string;
  coupleCode: string;
};

export const FinanceService = {
  listen: async (callback: (list: Transaction[]) => void) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    const userData = await AuthService.syncUserData(user.uid);
    if (!userData || !userData.coupleCode) return;

    const q = query(
      collection(db, "finance"),
      where("coupleCode", "==", userData.coupleCode)
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
      );
      data.sort((a, b) => {
        if (a.status === b.status)
          return b.createdAt.localeCompare(a.createdAt);
        return a.status === "pending" ? -1 : 1;
      });
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
      status: "pending",
      paidBy: null,
      createdAt: new Date().toISOString(),
    });
  },

  pay: async (id: string, payerNickname: string) => {
    await updateDoc(doc(db, "finance", id), {
      status: "paid",
      paidBy: payerNickname,
    });
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, "finance", id));
  },
};
