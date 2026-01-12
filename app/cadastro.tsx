import React, { useState } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CadastroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estados dos campos
  const [nome, setNome] = useState(String(params.name || ""));
  const [apelido, setApelido] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<"masculino" | "feminino" | "neutro" | null>(
    null
  );
  const [temaEscolhido, setTemaEscolhido] = useState<"light" | "dark" | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Máscara para Data
  const handleDataChange = (text: string) => {
    let v = text.replace(/\D/g, "");
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, "$1/$2");
    if (v.length > 5) v = v.replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
    if (v.length > 10) v = v.substring(0, 10);
    setDataNascimento(v);
    if (error) setError("");
  };

  const handleInputChange = (setter: any, value: string) => {
    setter(value);
    if (error) setError("");
  };

  const handleSexoSelect = (s: "masculino" | "feminino" | "neutro") => {
    setSexo(s);
    if (error) setError("");

    // Sugere um tema padrão, mas deixa o usuário trocar depois
    if (s === "masculino") setTemaEscolhido("dark");
    else if (s === "feminino") setTemaEscolhido("light");
    else setTemaEscolhido(null); // Neutro força a escolha
  };

  const salvarEContinuar = async () => {
    if (!nome.trim()) {
      setError("Como devemos te chamar no documento?");
      return;
    }
    if (!apelido.trim()) {
      setError("Escolha um apelido carinhoso.");
      return;
    }
    if (dataNascimento.length < 10) {
      setError("Data de nascimento inválida.");
      return;
    }
    if (!sexo) {
      setError("Selecione uma opção de gênero.");
      return;
    }
    if (!temaEscolhido) {
      setError("Escolha a vibe visual do seu aplicativo.");
      return;
    }

    setLoading(true);

    try {
      // 1. Salva os dados REAIS
      await AsyncStorage.setItem("@user_name", nome);
      await AsyncStorage.setItem("@user_nickname", apelido);
      await AsyncStorage.setItem("@user_birth", dataNascimento);
      await AsyncStorage.setItem("@user_sexo", sexo);
      await AsyncStorage.setItem("@user_theme_preference", temaEscolhido);

      // 2. Define o "sexo visual" para a engine de cores do App
      // O app usa a lógica: "feminino" = Pastel/Rosa, "masculino" = Dark/Tech
      // Aqui fazemos a tradução do TEMA ESCOLHIDO para essa lógica
      const visualEngine = temaEscolhido === "light" ? "feminino" : "masculino";

      setTimeout(() => {
        setLoading(false);
        router.replace({
          pathname: "/setup",
          params: { userName: apelido, sexo: visualEngine },
        });
      }, 800);
    } catch (e) {
      setLoading(false);
      setError("Erro ao salvar. Tente novamente.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.titulo}>Seu Perfil 🥄</Text>
          <Text style={styles.subtitulo}>Dados para configurar seu ninho.</Text>

          {/* NOME */}
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            style={[styles.input, error && !nome.trim() && styles.inputError]}
            value={nome}
            onChangeText={(t) => handleInputChange(setNome, t)}
            placeholder="Como está no documento"
            placeholderTextColor="#999"
          />

          {/* APELIDO */}
          <Text style={styles.label}>Como seu amor te chama?</Text>
          <TextInput
            style={[
              styles.input,
              error && !apelido.trim() && styles.inputError,
            ]}
            value={apelido}
            onChangeText={(t) => handleInputChange(setApelido, t)}
            placeholder="Ex: Vida, Mô, Lindo..."
            placeholderTextColor="#999"
          />

          {/* DATA */}
          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            style={[
              styles.input,
              error && dataNascimento.length < 10 && styles.inputError,
            ]}
            value={dataNascimento}
            onChangeText={handleDataChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={10}
          />

          {/* GÊNERO */}
          <Text style={styles.label}>Gênero</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                sexo === "masculino" && styles.selMasc,
              ]}
              onPress={() => handleSexoSelect("masculino")}
            >
              <FontAwesome5
                name="mars"
                size={20}
                color={sexo === "masculino" ? "#FFF" : "#263238"}
              />
              <Text
                style={[
                  styles.genderText,
                  sexo === "masculino" && { color: "#FFF" },
                ]}
              >
                Masc.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderOption,
                sexo === "feminino" && styles.selFem,
              ]}
              onPress={() => handleSexoSelect("feminino")}
            >
              <FontAwesome5
                name="venus"
                size={20}
                color={sexo === "feminino" ? "#5D4037" : "#FFB1C1"}
              />
              <Text
                style={[
                  styles.genderText,
                  sexo === "feminino" && { color: "#5D4037" },
                ]}
              >
                Fem.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderOption,
                sexo === "neutro" && styles.selNeutro,
              ]}
              onPress={() => handleSexoSelect("neutro")}
            >
              <Ionicons
                name="person"
                size={20}
                color={sexo === "neutro" ? "#FFF" : "#64748B"}
              />
              <Text
                style={[
                  styles.genderText,
                  sexo === "neutro" && { color: "#FFF" },
                ]}
              >
                Outro
              </Text>
            </TouchableOpacity>
          </View>

          {/* SELEÇÃO DE TEMA - AGORA APARECE PARA TODOS SE TIVER GÊNERO SELECIONADO */}
          {sexo && (
            <View style={styles.themeSection}>
              <Text style={styles.label}>Qual Vibe você prefere?</Text>
              <View style={styles.themeRow}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    temaEscolhido === "light" && styles.selThemeLight,
                  ]}
                  onPress={() => setTemaEscolhido("light")}
                >
                  <MaterialCommunityIcons
                    name="white-balance-sunny"
                    size={24}
                    color="#FFB1C1"
                  />
                  <Text style={styles.themeText}>Pastel (Claro)</Text>
                  {/* Ícone de check se estiver selecionado */}
                  {temaEscolhido === "light" && (
                    <View style={styles.checkBadge}>
                      <FontAwesome5 name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    temaEscolhido === "dark" && styles.selThemeDark,
                  ]}
                  onPress={() => setTemaEscolhido("dark")}
                >
                  <MaterialCommunityIcons
                    name="weather-night"
                    size={24}
                    color="#4FC3F7"
                  />
                  <Text style={styles.themeText}>Tech (Escuro)</Text>
                  {temaEscolhido === "dark" && (
                    <View style={styles.checkBadge}>
                      <FontAwesome5 name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ERRO */}
          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color="#FF5252"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )}

          <TouchableOpacity
            style={styles.botao}
            onPress={salvarEContinuar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.textoBotao}>Salvar Perfil</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 30,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    marginLeft: 5,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputError: {
    borderColor: "#FF5252",
    borderWidth: 1.5,
    backgroundColor: "#FFEBEE",
  },

  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  genderOption: {
    flex: 0.31,
    backgroundColor: "#F8FAFC",
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  selMasc: { backgroundColor: "#263238", borderColor: "#263238" },
  selFem: { backgroundColor: "#FFD1DC", borderColor: "#FFB1C1" },
  selNeutro: { backgroundColor: "#6366F1", borderColor: "#6366F1" },

  genderText: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 10,
    textTransform: "uppercase",
  },

  // Estilos de Tema
  themeSection: {
    marginBottom: 20,
    marginTop: 15,
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  themeRow: { flexDirection: "row", gap: 15 },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#FFF",
    gap: 10,
    elevation: 1,
  },

  selThemeLight: { backgroundColor: "#FFF0F5", borderColor: "#FFB1C1" },
  selThemeDark: { backgroundColor: "#263238", borderColor: "#4FC3F7" }, // Fundo escuro quando selecionado

  themeText: { fontWeight: "700", fontSize: 12, color: "#333" },
  checkBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#4CAF50",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Erro
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    gap: 5,
  },
  errorText: { color: "#FF5252", fontWeight: "bold", fontSize: 13 },

  botao: {
    backgroundColor: "#6366F1",
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
