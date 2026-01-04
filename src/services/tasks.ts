import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// 1. OUVIR AS TAREFAS EM TEMPO REAL
export const subscribeToTasks = (coupleId: string, callback: (tasks: any[]) => void) => {
  if (!coupleId) return () => {};

  // Busca na coleção 'tasks', filtrando pelo ID do Casal
  const q = query(
    collection(db, "tasks"),
    where("coupleId", "==", coupleId),
    orderBy("createdAt", "desc") // As mais novas primeiro
  );

  // O onSnapshot fica "escutando" mudanças. Se mudar no banco, ele roda o callback.
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  });

  return unsubscribe; // Retorna a função para parar de escutar quando sair da tela
};

// 2. ALTERAR STATUS (Feito/Pendente)
export const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status: newStatus });
};