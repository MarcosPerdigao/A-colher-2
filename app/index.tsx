import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthService } from "../src/services/auth";
import { CustomAlert } from "../src/components/CustomAlert";
import { useTheme } from "../src/context/ThemeContext";
import { registerForPushNotificationsAsync } from "../src/services/notifications";
import { agendarLembretesAniversario } from "../src/services/notifications";

export default function LoginScreen() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<"auth" | "setup">("auth");
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nickname, setNickname] = useState("");
  const [sexo, setSexo] = useState<"masculino" | "feminino">("masculino");
  const [setupMode, setSetupMode] = useState<"create" | "join">("create");
  const [partnerCode, setPartnerCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  // Adiciona este estado
  const [relationshipStatus, setRelationshipStatus] = useState<
    "namorando" | "casados"
  >("namorando");

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // --- TRADUTOR DE ERROS DO FIREBASE ---
  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "O formato do e-mail está inválido.";
      case "auth/user-disabled":
        return "Este usuário foi desativado.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-mail ou senha incorretos."; // Mensagem genérica para segurança
      case "auth/email-already-in-use":
        return "Este e-mail já está sendo usado.";
      case "auth/weak-password":
        return "A senha precisa ter pelo menos 6 caracteres.";
      case "auth/missing-password":
        return "Você esqueceu de digitar a senha.";
      default:
        return "Ocorreu um erro inesperado. Tente novamente.";
    }
  };

  const handleDateChange = (text: string, setter: (val: string) => void) => {
    let cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 8) cleaned = cleaned.substring(0, 8); // Limita a 8 dígitos (DDMMAAAA)

    if (cleaned.length >= 5) {
      setter(
        `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}/${cleaned.substring(4)}`,
      );
    } else if (cleaned.length >= 3) {
      setter(`${cleaned.substring(0, 2)}/${cleaned.substring(2)}`);
    } else {
      setter(cleaned);
    }
  };

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    const checkFlow = async () => {
      try {
        const hasSeenTutorial = await AsyncStorage.getItem(
          "@app_has_seen_tutorial",
        );

        if (!hasSeenTutorial) {
          setLoading(false);
          router.replace("/onboarding");
          return;
        }

        unsubscribeAuth = AuthService.onStateChanged(async (user) => {
          if (user) {
            const userData = await AuthService.syncUserData(user.uid);
            const forceSetup = await AsyncStorage.getItem("@force_setup");

            if (userData && userData.coupleCode && !forceSetup) {
              const savedTheme = await AsyncStorage.getItem("@app_theme");
              const themeToUse = savedTheme || userData.sexo || "masculino";
              await setTheme(themeToUse as any);

              if (
                userData.anniversaryDate &&
                userData.birthDate &&
                userData.relationshipStatus
              ) {
                agendarLembretesAniversario(
                  userData.anniversaryDate,
                  userData.birthDate,
                  userData.relationshipStatus,
                );
              }

              registerForPushNotificationsAsync().then((token) => {
                if (token && user.uid) {
                  AuthService.updatePushToken(user.uid, token);
                }
              });

              router.replace("/mural");
            } else {
              // Se tiver a flag @force_setup, a gente consome ela (apaga) e mostra a tela de setup
              if (forceSetup) await AsyncStorage.removeItem("@force_setup");

              setViewState("setup");
              setLoading(false);
            }
          } else {
            setViewState("auth");
            setLoading(false);
          }
        });
      } catch (e) {
        console.log("Erro inicialização:", e);
        setLoading(false);
      }
    };

    checkFlow();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const handleAuth = async () => {
    if (!email || !password)
      return showAlert("Ops", "Preencha email e senha.", "error");

    setLoading(true);
    try {
      // Pedimos permissão de notificação ANTES de tentar logar/criar
      // Isso garante que o popup apareça no momento de ação do usuário
      await registerForPushNotificationsAsync();

      if (isRegistering) await AuthService.register(email, password);
      else await AuthService.login(email, password);
    } catch (error: any) {
      // Aqui usamos nosso tradutor
      const friendlyMsg = getFriendlyErrorMessage(error.code || error.message);
      showAlert("Atenção", friendlyMsg, "error");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      return showAlert(
        "Atenção",
        "Digite seu e-mail no campo acima para recuperar a senha.",
        "info",
      );
    }
    setLoading(true);
    try {
      await AuthService.resetPassword(email);
      showAlert(
        "Sucesso!",
        "E-mail de recuperação enviado. Verifique sua caixa de entrada (e o spam!).",
        "success",
      );
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(error.code || error.message);
      showAlert("Erro", friendlyMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Amor, instalei o nosso app "A Colher"! 🥄\n\nUse este código para entrar: *${code}*`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleCoupleSetup = async () => {
    if (!nickname) return showAlert("Ops", "Escolha um apelido!", "error");
    if (birthDate.length !== 10)
      return showAlert(
        "Ops",
        "Preencha o nascimento completo (DD/MM/AAAA)",
        "error",
      );
    if (anniversaryDate.length !== 10)
      return showAlert(
        "Ops",
        "Preencha a data de relacionamento (DD/MM/AAAA)",
        "error",
      );
    if (setupMode === "join" && !partnerCode)
      return showAlert("Ops", "Digite o código!", "error");

    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      let finalCode = "";

      if (setupMode === "create") {
        // Gera um código aleatório de 6 dígitos
        finalCode = Math.floor(100000 + Math.random() * 900000).toString();
      } else {
        // MODO JOIN: Vamos verificar se o código é válido E SE NÃO É O SEU PRÓPRIO
        const db = getFirestore();
        const coupleRef = await getDoc(doc(db, "couples", partnerCode));

        if (!coupleRef.exists()) throw new Error("Código não encontrado!");

        const coupleData = coupleRef.data();

        // --- 🛡️ O IF QUE SALVA O DIA 🛡️ ---
        // Se a lista de parceiros já tem o seu ID, você está tentando entrar no seu próprio código.
        if (coupleData?.partners && coupleData.partners.includes(user.uid)) {
          setLoading(false);
          return showAlert(
            "Eita!",
            "Você não pode entrar com seu próprio código. Peça o código do seu amor!",
            "error",
          );
        }

        // Verifica se o casal já está cheio (opcional, mas bom ter)
        if (coupleData?.partners && coupleData.partners.length >= 2) {
          setLoading(false);
          return showAlert(
            "Lotado",
            "Este código já tem um casal formado.",
            "error",
          );
        }

        finalCode = partnerCode;
      }

      await AuthService.saveUserProfile(
        user.uid,
        nickname,
        sexo,
        finalCode,
        setupMode,
        birthDate,
        anniversaryDate,
        relationshipStatus,
      );

      await setTheme(sexo);

      if (setupMode === "create") {
        setLoading(false);
        showAlert("Sucesso!", "Código criado.", "success");
        setTimeout(() => handleShareCode(finalCode), 1000);
        router.replace("/mural");
      } else {
        router.replace("/mural");
      }
    } catch (error: any) {
      console.log(error);
      showAlert("Erro", error.message || "Erro ao configurar perfil.", "error");
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD1DC" />
      </View>
    );

  const isFemaleTheme = sexo === "feminino";
  const inputStyle: TextStyle = {
    borderColor: isFemaleTheme ? "#FFD1DC" : "#333",
    color: isFemaleTheme ? "#000" : "#fff",
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {viewState === "auth" && (
          <View style={[styles.container, { backgroundColor: "#121212" }]}>
            <StatusBar style="light" />
            <View style={styles.content}>
              <MaterialCommunityIcons name="lock" size={80} color="#FFD1DC" />
              <Text style={styles.title}>A Colher</Text>
              <Text style={styles.subtitle}>
                {isRegistering
                  ? "Crie sua conta"
                  : "Entre para ver suas tarefas"}
              </Text>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#666"
                style={styles.inputDark}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                placeholder="Senha"
                placeholderTextColor="#666"
                style={styles.inputDark}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none" // <--- AQUI ESTÁ A CORREÇÃO DO TECLADO
              />
              <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
                <Text style={styles.btnText}>
                  {isRegistering ? "Criar Conta" : "Entrar"}
                </Text>
              </TouchableOpacity>

              {/* --- NOVO BOTÃO DE ESQUECI A SENHA --- */}
              {!isRegistering && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={{ marginBottom: 15 }}
                >
                  <Text
                    style={[styles.linkText, { marginBottom: 0, marginTop: 0 }]}
                  >
                    Esqueci minha senha
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsRegistering(!isRegistering)}
              >
                <Text style={styles.linkText}>
                  {isRegistering ? "Já tem conta? Login" : "Criar conta nova"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {viewState === "setup" && (
          <View
            style={[
              styles.container,
              { backgroundColor: isFemaleTheme ? "#FFF5F7" : "#121212" },
            ]}
          >
            <StatusBar style={isFemaleTheme ? "dark" : "light"} />
            <View style={styles.content}>
              <MaterialCommunityIcons
                name="spoon-sugar"
                size={60}
                color={isFemaleTheme ? "#FFD1DC" : "#546E7A"}
              />
              <Text
                style={[
                  styles.title,
                  { color: isFemaleTheme ? "#5D4037" : "#ECEFF1" },
                ]}
              >
                Quase lá!
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: isFemaleTheme ? "#A1887F" : "#90A4AE" },
                ]}
              >
                Configure seu perfil
              </Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  onPress={() => setSexo("masculino")}
                  style={[
                    styles.switchButton,
                    sexo === "masculino" && { backgroundColor: "#37474F" },
                  ]}
                >
                  <Text
                    style={[
                      styles.switchText,
                      sexo === "masculino"
                        ? { color: "#fff" }
                        : { color: "#888" },
                    ]}
                  >
                    Ele
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSexo("feminino")}
                  style={[
                    styles.switchButton,
                    sexo === "feminino" && { backgroundColor: "#FFD1DC" },
                  ]}
                >
                  <Text
                    style={[
                      styles.switchText,
                      sexo === "feminino"
                        ? { color: "#5D4037" }
                        : { color: "#888" },
                    ]}
                  >
                    Ela
                  </Text>
                </TouchableOpacity>
              </View>
              {/* --- NOVO SELETOR DE STATUS --- */}
              <View
                style={[
                  styles.switchContainer,
                  { width: "100%", marginTop: -5, marginBottom: 15 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setRelationshipStatus("namorando")}
                  style={[
                    styles.switchButton,
                    { flex: 1, alignItems: "center" },
                    relationshipStatus === "namorando" && {
                      backgroundColor: isFemaleTheme ? "#FFD1DC" : "#37474F",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.switchText,
                      relationshipStatus === "namorando"
                        ? { color: isFemaleTheme ? "#5D4037" : "#fff" }
                        : { color: "#888" },
                    ]}
                  >
                    Namorando
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRelationshipStatus("casados")}
                  style={[
                    styles.switchButton,
                    { flex: 1, alignItems: "center" },
                    relationshipStatus === "casados" && {
                      backgroundColor: isFemaleTheme ? "#FFD1DC" : "#37474F",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.switchText,
                      relationshipStatus === "casados"
                        ? { color: isFemaleTheme ? "#5D4037" : "#fff" }
                        : { color: "#888" },
                    ]}
                  >
                    Casados
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="Seu Apelido"
                placeholderTextColor="#999"
                style={[styles.inputBase, inputStyle]}
                value={nickname}
                onChangeText={setNickname}
              />
              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <TextInput
                  placeholder="Nasc. (DD/MM/AAAA)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                  style={[styles.inputBase, inputStyle, { flex: 1 }]}
                  value={birthDate}
                  onChangeText={(t) => handleDateChange(t, setBirthDate)}
                />
                <TextInput
                  placeholder="Data (DD/MM/AAAA)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                  style={[styles.inputBase, inputStyle, { flex: 1 }]}
                  value={anniversaryDate}
                  onChangeText={(t) => handleDateChange(t, setAnniversaryDate)}
                />
              </View>
              {setupMode === "join" && (
                <TextInput
                  placeholder="Código do Parceiro(a)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={[styles.inputBase, inputStyle]}
                  value={partnerCode}
                  onChangeText={setPartnerCode}
                />
              )}
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  { backgroundColor: isFemaleTheme ? "#FFD1DC" : "#37474F" },
                ]}
                onPress={handleCoupleSetup}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: isFemaleTheme ? "#5D4037" : "#fff" },
                  ]}
                >
                  {setupMode === "create"
                    ? "Gerar e Compartilhar"
                    : "Entrar com Código"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setSetupMode(setupMode === "create" ? "join" : "create")
                }
              >
                <Text
                  style={[
                    styles.linkText,
                    { color: isFemaleTheme ? "#A1887F" : "#90A4AE" },
                  ]}
                >
                  {setupMode === "create"
                    ? "Já tem um código? Entrar"
                    : "Criar um novo código"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    minHeight: "100%",
  },
  content: {
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#ECEFF1",
  },
  subtitle: { fontSize: 16, marginBottom: 40, color: "#90A4AE" },
  inputDark: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#1E1E1E",
    color: "#FFF",
    marginBottom: 15,
    fontSize: 16,
  },
  inputBase: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    fontSize: 16,
  },
  mainButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FFD1DC",
  },
  btnText: { fontWeight: "bold", fontSize: 16, color: "#5D4037" },
  linkText: {
    marginTop: 10,
    textDecorationLine: "underline",
    color: "#90A4AE",
    marginBottom: 20, // Aumentei um pouco aqui para dar margem embaixo no scroll
  },
  switchContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    padding: 4,
  },
  switchButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  switchText: { fontWeight: "bold" },
});
