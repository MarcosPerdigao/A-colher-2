import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard"; // Se der erro aqui, use Clipboard do react-native, mas expo-clipboard é o padrão novo
import { auth } from "../firebaseConfig";
import { linkCouple } from "../src/services/user";
import { useRouter } from "expo-router";

export default function SetupScreen() {
  const [partnerCode, setPartnerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;

  // Função para copiar o código
  const copyToClipboard = async () => {
    if (user?.uid) {
      await Clipboard.setStringAsync(user.uid);
      Alert.alert("Copiado!", "Mande este código para seu amor.");
    }
  };

  const handleLink = async () => {
    if (!partnerCode) return Alert.alert("Ops", "Digite o código do parceiro.");
    if (partnerCode === user?.uid)
      return Alert.alert("Ops", "Você não pode se vincular a si mesmo.");

    setLoading(true);
    try {
      await linkCouple(user!.uid, partnerCode);
      Alert.alert("Sucesso!", "Casal formado com sucesso! ❤️");
     router.replace('/(tabs)' as any); // Manda para a Home
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quase lá! ❤️</Text>
      <Text style={styles.description}>
        Para o app funcionar, precisamos conectar você ao seu parceiro(a).
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>SEU CÓDIGO:</Text>
        <TouchableOpacity onPress={copyToClipboard} style={styles.codeBox}>
          <Text style={styles.codeText}>{user?.uid}</Text>
          <Text style={styles.copyText}>(Toque para copiar)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.separator}>
        <Text style={styles.orText}>OU</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>DIGITE O CÓDIGO DELE(A):</Text>
        <TextInput
          style={styles.input}
          placeholder="Cole o código aqui..."
          value={partnerCode}
          onChangeText={setPartnerCode}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Vincular Agora</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF9AA2",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    elevation: 2,
    width: "100%",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  codeBox: {
    backgroundColor: "#F0F0F0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  codeText: { fontSize: 14, fontWeight: "bold", color: "#333" },
  copyText: { fontSize: 12, color: "#FF9AA2", marginTop: 5 },
  input: {
    backgroundColor: "#F0F0F0",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#FF9AA2",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  separator: { alignItems: "center", marginVertical: 15 },
  orText: { color: "#CCC", fontWeight: "bold" },
});
