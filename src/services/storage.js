// Exemplo de função para enviar foto (Helper)
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

export const uploadImageToFirebase = async (uri, userUid) => {
  try {
    // 1. Transforma o caminho da foto (URI) em Blob (Arquivo binário)
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Cria uma referência (Nome do arquivo no servidor)
    // Ex: images/joao123/167890000.jpg
    const filename = new Date().getTime() + ".jpg";
    const storageRef = ref(storage, `evidence/${userUid}/${filename}`);

    // 3. Faz o upload
    await uploadBytes(storageRef, blob);

    // 4. Pega o link público para salvar no Banco de Dados
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;

  } catch (error) {
    console.error("Erro no upload:", error);
    throw error;
  }
};