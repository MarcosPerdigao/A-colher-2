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
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthService } from "./auth";
import { db } from "../../firebaseConfig";

export type CategoryType =
  | "home"
  | "market"
  | "food"
  | "transport"
  | "leisure"
  | "health"
  | "pets"
  | "invest"
  | "loan"
  | "other";

export type SplitType = "shared" | "loan";

// NOVO: Quem usufruiu do dinheiro?
export type BeneficiaryType = "me" | "partner" | "couple";

export type Transaction = {
  id: string;
  title: string;
  value: number;
  type: "expense" | "income";
  paidBy: string; // Quem passou o cartão/pix
  beneficiary: BeneficiaryType; // Para quem foi? (Eu, Ela, Casa)
  status: "paid" | "pending";
  category: CategoryType;
  split: SplitType;
  isFixed: boolean;
  createdAt: string;
  date: string;
  coupleCode: string;
};

export const FinanceService = {
  // --- CONFIGURAÇÕES DO CASAL (RENDA E MODO) ---
  saveSettings: async (settings: {
    mode: "unified" | "split";
    monthlyIncome: number;
  }) => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const userData = await AuthService.syncUserData(user.uid);
    if (!userData?.coupleCode) return;

    // Salva na coleção do casal
    await setDoc(
      doc(db, "couples", userData.coupleCode),
      {
        financeSettings: settings,
      },
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
      data.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        return dateB - dateA;
      });
      callback(data);
    });
  },

  add: async (transaction: Partial<Transaction>) => {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error("Sem usuário");

    const userData = await AuthService.syncUserData(user.uid);
    const myNickname = await getMyNickname();

    await addDoc(collection(db, "finance"), {
      ...transaction,
      coupleCode: userData?.coupleCode,
      paidBy: transaction.paidBy || myNickname || "Alguém",
      // Se não vier beneficiário, assume que é para o casal (Casa)
      beneficiary: transaction.beneficiary || "couple",
      status: "pending",
      createdAt: new Date().toISOString(),
      date: transaction.date || new Date().toISOString().split("T")[0],
    });
  },
  // ... dentro do FinanceService em src/services/finance.ts

  update: async (id: string, data: Partial<Transaction>) => {
    // Apenas atualiza os campos enviados
    await updateDoc(doc(db, "finance", id), data);
  },

  // ... (o resto: settle, delete, etc)
  settle: async (id: string) => {
    await updateDoc(doc(db, "finance", id), { status: "paid" });
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, "finance", id));
  },

  // Lógica Antiga (Split)
  calculateSplitBalance: (transactions: Transaction[], myNickname: string) => {
    let toReceive = 0;
    let toPay = 0;
    transactions.forEach((t) => {
      if (t.status === "paid") return;
      const isMe = t.paidBy === myNickname;
      const val = t.value;
      if (t.split === "loan") {
        isMe ? (toReceive += val) : (toPay += val);
      } else {
        const half = val / 2;
        isMe ? (toReceive += half) : (toPay += half);
      }
    });
    return { toReceive, toPay, net: toReceive - toPay };
  },

  // Lógica Nova (Unificado)
  calculateUnifiedStats: (transactions: Transaction[], income: number) => {
    const totalSpent = transactions.reduce((acc, t) => acc + t.value, 0);
    const remaining = income - totalSpent;
    const progress = income > 0 ? totalSpent / income : 0;

    // Gastos por Beneficiário
    let spentMe = 0;
    let spentPartner = 0;
    let spentCouple = 0;

    transactions.forEach((t) => {
      if (t.beneficiary === "me") spentMe += t.value;
      else if (t.beneficiary === "partner") spentPartner += t.value;
      else spentCouple += t.value;
    });

    return {
      totalSpent,
      remaining,
      progress,
      spentMe,
      spentPartner,
      spentCouple,
    };
  },
};

const getMyNickname = async () => {
  try {
    const name = await AsyncStorage.getItem("@user_nickname");
    return name || "Eu";
  } catch (e) {
    return "Eu";
  }
};
