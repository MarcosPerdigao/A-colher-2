import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { TaskService, Task } from "../../src/services/tasks";
import { AuthService } from "../../src/services/auth";
import { CustomAlert } from "../../src/components/CustomAlert";
import { useTheme } from "../../src/context/ThemeContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isFemale, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [coupleCode, setCoupleCode] = useState("");
  const [streak, setStreak] = useState("0");
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [identityGender, setIdentityGender] = useState("masculino");

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const name = await AsyncStorage.getItem("@user_nickname");
      const code = await AsyncStorage.getItem("@couple_code");
      const streakVal = await AsyncStorage.getItem("@task_streak");
      const savedIdentity = await AsyncStorage.getItem("@user_identity");

      if (name) setNickname(name);
      if (code) setCoupleCode(code);
      if (streakVal) setStreak(streakVal);
      if (savedIdentity) setIdentityGender(savedIdentity);

      const unsubscribe = await TaskService.listen((tasks: Task[]) => {
        const myTasks = tasks.filter(
          (t) => t.completed && t.completedByNickname === name
        );
        setTasksCompleted(myTasks.length);
      });

      if (unsubscribe) setTimeout(() => unsubscribe(), 1000);
    } catch (e) {
      console.log("Erro perfil", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(coupleCode);
    showAlert("Copiado! 📋", "Código na área de transferência.", "success");
  };

  const handleSwitchTheme = async () => {
    await toggleTheme();
    const newThemeName = !isFemale ? "Claro" : "Escuro";
    showAlert("Tema Alterado", `Visual alterado.`, "success");
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace("/");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={isFemale ? "dark" : "light"} />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meu Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 45 }}>
              {identityGender === "feminino" ? "👩‍🦰" : "🧔"}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{nickname}</Text>

          <TouchableOpacity
            style={styles.codeContainer}
            onPress={handleCopyCode}
          >
            <Text style={[styles.codeLabel, { color: colors.sub }]}>
              Código do Casal:
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={[styles.code, { color: colors.text }]}>
                {coupleCode}
              </Text>
              <MaterialIcons
                name="content-copy"
                size={16}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.sub }]}>
          ESTATÍSTICAS
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <MaterialIcons
              name="local-fire-department"
              size={28}
              color="#FF5722"
            />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Sequência</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="checkbox-marked-circle-outline"
              size={28}
              color="#4CAF50"
            />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {tasksCompleted}
            </Text>
            <Text style={styles.statLabel}>Tarefas Feitas</Text>
          </View>
        </View>

        <Text
          style={[styles.sectionTitle, { color: colors.sub, marginTop: 20 }]}
        >
          CONFIGURAÇÕES
        </Text>

        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }]}
          onPress={handleSwitchTheme}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#E3F2FD" : "#37474F" },
              ]}
            >
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={isFemale ? "#2196F3" : "#FFF"}
              />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Alterar Tema
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.sub} />
        </TouchableOpacity>
        {/* ... Botão Alterar Tema acima ... */}

        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: colors.card, marginTop: 10 },
          ]}
          onPress={() => router.push("/onboarding")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#E3F2FD" : "#37474F" },
              ]}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={20}
                color={isFemale ? "#2196F3" : "#FFF"}
              />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Ver Tutorial
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.sub} />
        </TouchableOpacity>

        {/* ... Botão Logout abaixo ... */}
        <TouchableOpacity style={[styles.logoutBtn]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair do App</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: "bold" },
  content: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    marginBottom: 30,
    elevation: 4,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  name: { fontSize: 24, fontWeight: "bold", marginBottom: 15 },
  codeContainer: {
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    width: "100%",
  },
  codeLabel: { fontSize: 12, marginBottom: 4 },
  code: { fontSize: 18, fontWeight: "bold", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: {
    flex: 0.48,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 2,
  },
  statNumber: { fontSize: 24, fontWeight: "bold", marginTop: 8 },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: { fontSize: 16, fontWeight: "600" },
  logoutBtn: {
    marginTop: 40,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FF5252",
    alignItems: "center",
    backgroundColor: "rgba(255, 82, 82, 0.05)",
  },
  logoutText: { color: "#FF5252", fontWeight: "bold", fontSize: 16 },
});
