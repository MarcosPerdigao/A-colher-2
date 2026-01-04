import { doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// 1. Cria ou Atualiza o perfil do usuário ao logar
export const saveUserProfile = async (user: any) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  // Se o usuário ainda não existe no banco, cria
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.email?.split('@')[0], // Nome provisório
      coupleId: null, // Começa solteiro
      createdAt: serverTimestamp(),
    });
    return null; // Retorna null indicando que não tem coupleId
  } else {
    // Se já existe, retorna os dados (para sabermos se tem coupleId)
    return userSnap.data();
  }
};

// 2. Lógica para vincular o casal
export const linkCouple = async (myUid: string, partnerUid: string) => {
  try {
    // Verifica se o parceiro existe
    const partnerRef = doc(db, "users", partnerUid);
    const partnerSnap = await getDoc(partnerRef);

    if (!partnerSnap.exists()) {
      throw new Error("Código inválido (Usuário não encontrado).");
    }

    if (partnerSnap.data()?.coupleId) {
      throw new Error("Este usuário já tem um parceiro vinculado!");
    }

    // Cria o documento do CASAL
    const coupleData = {
      users: [myUid, partnerUid],
      createdAt: serverTimestamp(),
      coupleName: "Novo Casal"
    };
    
    const coupleRef = await addDoc(collection(db, "couples"), coupleData);

    // Atualiza o perfil dos DOIS usuários com o ID do casal
    await updateDoc(doc(db, "users", myUid), { coupleId: coupleRef.id });
    await updateDoc(doc(db, "users", partnerUid), { coupleId: coupleRef.id });

    return true;

  } catch (error) {
    throw error;
  }
};