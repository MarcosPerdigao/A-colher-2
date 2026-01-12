import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SetupScreen() {
  const router = useRouter();
  const { userName, sexo } = useLocalSearchParams();
  const isFemale = sexo === "feminino";

  const [loading, setLoading] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Novo estado para controlar a mensagem de erro visual
  const [errorMessage, setErrorMessage] = useState("");

  // PALETA DE CORES
  const theme = isFemale
    ? {
        bg: "#FFF5F7",
        primary: "#FFD1DC",
        card: "#FFFFFF",
        text: "#5D4037",
        sub: "#A1887F",
        btnText: "#5D4037",
        icon: "#FFB1C1",
        error: "#FF8A80", // Vermelho pastel
      }
    : {
        bg: "#121212",
        primary: "#37474F",
        card: "#1E1E1E",
        text: "#ECEFF1",
        sub: "#90A4AE",
        btnText: "#FFF",
        icon: "#546E7A",
        error: "#EF5350", // Vermelho suave dark
      };

  const defaultTasks = [
    {
      id: "1",
      title: "Dar um beijo de bom dia",
      completed: false,
      observation: "Tarefa prioritária!",
      date: "Hoje",
      priority: "high",
    },
    {
      id: "2",
      title: "Planejar o jantar",
      completed: false,
      observation: "Pizza ou Sushi?",
      date: "Hoje",
      priority: "medium",
    },
    {
      id: "3",
      title: "Assistir nossa série",
      completed: false,
      observation: "Sem dormir no meio!",
      date: "Amanhã",
      priority: "low",
    },
  ];

  const handleCreateCouple = async () => {
    setLoading(true);
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await AsyncStorage.setItem("@couple_code", newCode);
      await AsyncStorage.setItem("@user_name", String(userName));
      await AsyncStorage.setItem("@tasks_list", JSON.stringify(defaultTasks));

      setTimeout(() => {
        setLoading(false);
        setGeneratedCode(newCode);
      }, 1000);
    } catch (e) {
      setLoading(false);
      // Aqui mantemos o alert pois é erro de sistema, não de validação
    }
  };

  const handleJoinCouple = async () => {
    // 1. Validação de Campo Vazio
    if (!inputCode.trim()) {
      setErrorMessage("Ops! Você esqueceu de colar o código.");
      return;
    }

    // 2. Validação de Tamanho
    if (inputCode.length < 6) {
      setErrorMessage("O código precisa ter 6 letras.");
      return;
    }

    setLoading(true);

    try {
      await AsyncStorage.setItem("@couple_code", inputCode);
      const existing = await AsyncStorage.getItem("@tasks_list");
      if (!existing) {
        await AsyncStorage.setItem("@tasks_list", JSON.stringify(defaultTasks));
      }

      setTimeout(() => {
        setLoading(false);
        router.replace({
          pathname: "/mural",
          params: { userName, coupleCode: inputCode, sexo },
        });
      }, 1000);
    } catch (e) {
      setLoading(false);
      setErrorMessage("Erro ao salvar. Tente novamente.");
    }
  };

  const handleInputChange = (text: string) => {
    setInputCode(text.toUpperCase());
    if (errorMessage) setErrorMessage(""); // Limpa o erro ao digitar
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Amor, baixei o app A Colher! 🥄\nUse nosso código para vincular: *${generatedCode}*`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const goToHome = () => {
    router.replace({
      pathname: "/mural",
      params: { userName, coupleCode: generatedCode, sexo },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        {generatedCode ? (
          /* TELA DE SUCESSO */
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name="party-popper"
              size={50}
              color={theme.text}
            />
            <Text style={[styles.title, { color: theme.text, marginTop: 10 }]}>
              Vínculo Criado!
            </Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>
              Envie este código para seu amor:
            </Text>

            <View style={[styles.codeBox, { borderColor: theme.primary }]}>
              <Text style={[styles.codeText, { color: theme.text }]}>
                {generatedCode}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#25D366" }]}
              onPress={handleShare}
            >
              <FontAwesome5
                name="whatsapp"
                size={20}
                color="white"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.buttonText}>Enviar no WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.primary, marginTop: 15 },
              ]}
              onPress={goToHome}
            >
              <Text style={[styles.buttonText, { color: theme.btnText }]}>
                Entrar no App
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* TELA DE ESCOLHA */
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Quase lá, {userName}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>
              Como vamos conectar vocês?
            </Text>

            <View style={styles.cardsContainer}>
              {/* CARD 1 */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={handleCreateCouple}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name="star-plus"
                  size={40}
                  color={theme.icon}
                />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Criar novo vínculo
                </Text>
                <Text style={[styles.cardDescription, { color: theme.sub }]}>
                  Sou o primeiro a baixar o app.
                </Text>
                {loading && (
                  <ActivityIndicator
                    color={theme.text}
                    style={{ marginTop: 10 }}
                  />
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View
                  style={[styles.line, { backgroundColor: theme.sub + "40" }]}
                />
                <Text style={[styles.orText, { color: theme.sub }]}>OU</Text>
                <View
                  style={[styles.line, { backgroundColor: theme.sub + "40" }]}
                />
              </View>

              {/* CARD 2 - COM TRATAMENTO DE ERRO VISUAL */}
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <MaterialCommunityIcons
                  name="link-variant"
                  size={40}
                  color={theme.sub}
                />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Já tenho um código
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: errorMessage ? theme.error : theme.primary, // Borda vermelha se erro
                      borderWidth: errorMessage ? 2 : 1,
                    },
                  ]}
                  placeholder="Cole o código aqui"
                  placeholderTextColor={theme.sub}
                  value={inputCode}
                  onChangeText={handleInputChange}
                  maxLength={6}
                  autoCapitalize="characters"
                />

                {/* MENSAGEM DE ERRO PERSONALIZADA */}
                {errorMessage ? (
                  <Text
                    style={{
                      color: theme.error,
                      marginTop: 8,
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: theme.primary,
                      marginTop: errorMessage ? 10 : 20,
                    },
                  ]}
                  onPress={handleJoinCouple}
                >
                  <Text style={[styles.buttonText, { color: theme.btnText }]}>
                    Vincular Agora
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    marginTop: 5,
  },
  cardsContainer: { gap: 20, paddingBottom: 40 },
  card: {
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginTop: 15 },
  cardDescription: { fontSize: 13, textAlign: "center", marginTop: 5 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  line: { flex: 1, height: 1 },
  orText: { marginHorizontal: 10, fontWeight: "bold", fontSize: 12 },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    marginTop: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  buttonText: { fontWeight: "bold", fontSize: 16 },
  codeBox: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderRadius: 15,
    borderStyle: "dashed",
    marginVertical: 20,
  },
  codeText: { fontSize: 32, fontWeight: "900", letterSpacing: 6 },
});
