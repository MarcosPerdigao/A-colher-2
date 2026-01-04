import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

// Imports do Firebase
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { saveUserProfile } from "../../src/services/user";
import { uploadImageToFirebase } from "../../src/services/storage";

export default function CreateScreen() {
  const router = useRouter();

  // Estados do Formulário
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("10"); // Valor padrão
  const [forWho, setForWho] = useState<"ME" | "PARTNER">("PARTNER"); // Por padrão, mandamos pro outro
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  // Carrega o ID do casal ao abrir a tela
  useEffect(() => {
    const loadData = async () => {
      if (auth.currentUser) {
        const profile = await saveUserProfile(auth.currentUser);
        if (profile?.coupleId) {
          setCoupleId(profile.coupleId);
        } else {
          Alert.alert("Ops", "Você precisa vincular um parceiro antes!");
          router.replace("/setup" as any);
        }
      }
    };
    loadData();
  }, []);

  // Função para pegar imagem da galeria
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Qualidade média para não pesar o upload
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Função de Salvar
  const handleCreate = async () => {
    if (!title) return Alert.alert("Faltou algo", "Dê um nome para a missão!");
    if (!coupleId) return Alert.alert("Erro", "Casal não identificado.");

    setLoading(true);
    try {
      let downloadUrl = null;

      // 1. Se tiver imagem, faz upload primeiro
      if (image && auth.currentUser) {
        downloadUrl = await uploadImageToFirebase(image, auth.currentUser.uid);
      }

      // 2. Define quem é o responsável
      // Se for 'ME', o assignedTo sou eu. Se for 'PARTNER', deixamos null ou o ID do parceiro (vamos simplificar e deixar a lógica visual na Home)
      const myUid = auth.currentUser?.uid;

      // Regra: Se é "Para Mim", assignedTo = eu. Se é "Para o Amor", assignedTo = null (qualquer um pega) ou lógica futura.
      // Vamos simplificar: Vamos salvar QUEM CRIOU e PARA QUEM É.

      await addDoc(collection(db, "tasks"), {
        coupleId: coupleId,
        title: title,
        points: parseInt(points) || 0,
        createdBy: myUid,
        assignedTo: forWho === "ME" ? myUid : "PARTNER", // Marcação simples
        status: "PENDING",
        proofPhotoUrl: downloadUrl,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Sucesso!", "Missão criada com sucesso! 🚀");

      // Limpa formulário
      setTitle("");
      setPoints("10");
      setImage(null);

      // Volta para a Home (Missões)
      router.push("/(tabs)/missoes" as any);
    } catch (error: any) {
      Alert.alert("Erro ao criar", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Nova Missão 🎯</Text>

      {/* Input Título */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>O QUE DEVE SER FEITO?</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Lavar a louça do jantar"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Input Pontos */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>VALE QUANTOS PONTOS?</Text>
        <View style={styles.pointsContainer}>
          <TouchableOpacity
            onPress={() => setPoints("10")}
            style={[styles.pointBadge, points === "10" && styles.pointSelected]}
          >
            <Text style={styles.pointText}>10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPoints("30")}
            style={[styles.pointBadge, points === "30" && styles.pointSelected]}
          >
            <Text style={styles.pointText}>30</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPoints("50")}
            style={[styles.pointBadge, points === "50" && styles.pointSelected]}
          >
            <Text style={styles.pointText}>50</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.pointInput}
            keyboardType="numeric"
            value={points}
            onChangeText={setPoints}
            placeholder="Outro"
          />
        </View>
      </View>

      {/* Seleção: Para Quem? */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>QUEM VAI FAZER?</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              forWho === "PARTNER" && styles.toggleSelected,
            ]}
            onPress={() => setForWho("PARTNER")}
          >
            <Text
              style={[
                styles.toggleText,
                forWho === "PARTNER" && styles.textSelected,
              ]}
            >
              Meu Amor ❤️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, forWho === "ME" && styles.toggleSelected]}
            onPress={() => setForWho("ME")}
          >
            <Text
              style={[
                styles.toggleText,
                forWho === "ME" && styles.textSelected,
              ]}
            >
              Eu Mesmo 🙋‍♂️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upload de Imagem */}
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={{ alignItems: "center" }}>
            <Ionicons name="camera-outline" size={40} color="#CCC" />
            <Text style={styles.imageText}>
              Adicionar foto de exemplo (Opcional)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Botão Salvar */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitText}>Criar Missão</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FDFBF7",
    padding: 25,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },

  inputGroup: { marginBottom: 25 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#AAA",
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
    elevation: 2,
  },

  pointsContainer: { flexDirection: "row", gap: 10 },
  pointBadge: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 10,
    minWidth: 50,
    alignItems: "center",
  },
  pointSelected: { backgroundColor: "#FF9AA2" },
  pointText: { fontWeight: "bold", color: "#555" },
  pointInput: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 10,
    minWidth: 60,
    textAlign: "center",
    elevation: 1,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#EEE",
    borderRadius: 15,
    padding: 5,
  },
  toggleBtn: { flex: 1, padding: 15, alignItems: "center", borderRadius: 12 },
  toggleSelected: { backgroundColor: "#FFF", elevation: 2 },
  toggleText: { fontWeight: "600", color: "#888" },
  textSelected: { color: "#FF9AA2", fontWeight: "bold" },

  imagePicker: {
    height: 150,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#DDD",
  },
  imageText: { color: "#AAA", marginTop: 10 },
  imagePreview: { width: "100%", height: "100%", borderRadius: 18 },

  submitBtn: {
    backgroundColor: "#FF9AA2",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#FF9AA2",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
  },
  submitText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
