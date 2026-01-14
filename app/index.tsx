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
import { AuthService } from "../src/services/auth";
import { CustomAlert } from "../src/components/CustomAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../src/context/ThemeContext";

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

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleDateChange = (text: string, setter: (val: string) => void) => {
    let cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 4) cleaned = cleaned.substring(0, 4);
    if (cleaned.length >= 3)
      setter(`${cleaned.substring(0, 2)}/${cleaned.substring(2)}`);
    else setter(cleaned);
  };

  useEffect(() => {
    const unsubscribe = AuthService.onStateChanged(async (user) => {
      if (user) {
        const userData = await AuthService.syncUserData(user.uid);
        if (userData && userData.coupleCode) {
          const savedTheme = await AsyncStorage.getItem("@app_theme");
          const themeToUse = savedTheme || userData.sexo || "masculino";
          await setTheme(themeToUse as any);
          router.replace("/mural");
        } else {
          setViewState("setup");
          setLoading(false);
        }
      } else {
        setViewState("auth");
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleAuth = async () => {
    if (!email || !password)
      return showAlert("Ops", "Preencha email e senha.", "error");
    setLoading(true);
    try {
      if (isRegistering) await AuthService.register(email, password);
      else await AuthService.login(email, password);
    } catch (error: any) {
      showAlert("Erro", error.message, "error");
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
    if (birthDate.length !== 5)
      return showAlert("Ops", "Preencha seu nascimento (Dia/Mês)", "error");
    if (anniversaryDate.length !== 5)
      return showAlert("Ops", "Preencha o niver de namoro (Dia/Mês)", "error");
    if (setupMode === "join" && !partnerCode)
      return showAlert("Ops", "Digite o código do parceiro!", "error");

    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("Usuário não autenticado.");

      let finalCode = "";
      if (setupMode === "create") {
        finalCode = Math.floor(100000 + Math.random() * 900000).toString();
      } else {
        const db = getFirestore();
        const coupleRef = await getDoc(doc(db, "couples", partnerCode));
        if (!coupleRef.exists()) throw new Error("Código não encontrado!");
        finalCode = partnerCode;
      }

      await AuthService.saveUserProfile(
        user.uid,
        nickname,
        sexo,
        finalCode,
        setupMode,
        birthDate,
        anniversaryDate
      );
      await setTheme(sexo);

      if (setupMode === "create") {
        setLoading(false);
        showAlert("Sucesso!", "Código criado com sucesso.", "success");
        setTimeout(() => handleShareCode(finalCode), 1000);
        router.replace("/mural");
      } else {
        router.replace("/mural");
      }
    } catch (error: any) {
      showAlert("Erro", error.message, "error");
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
              />
              <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
                <Text style={styles.btnText}>
                  {isRegistering ? "Criar Conta" : "Entrar"}
                </Text>
              </TouchableOpacity>
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

              <TextInput
                placeholder="Seu Apelido"
                placeholderTextColor="#999"
                style={[styles.inputBase, inputStyle]}
                value={nickname}
                onChangeText={setNickname}
              />

              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <TextInput
                  placeholder="Nasc. (DD/MM)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                  style={[styles.inputBase, inputStyle, { flex: 1 }]}
                  value={birthDate}
                  onChangeText={(t) => handleDateChange(t, setBirthDate)}
                />
                <TextInput
                  placeholder="Namoro (DD/MM)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
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
