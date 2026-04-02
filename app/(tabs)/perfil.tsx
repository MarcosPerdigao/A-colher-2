import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, updateProfile } from "firebase/auth";
import { doc, updateDoc, getFirestore } from "firebase/firestore";

import { TaskService, Task, checkTaskStatus } from "../../src/services/tasks";
import { AuthService } from "../../src/services/auth";
import { FinanceService } from "../../src/services/finance"; // <-- NOVO
import { CustomAlert } from "../../src/components/CustomAlert";
import { FinanceConfigModal } from "../../src/components/FinanceConfigModal"; // <-- NOVO
import { useTheme } from "../../src/context/ThemeContext";
import { Fonts } from "../../constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isFemale, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [nickname, setNickname] = useState("");
  const [coupleCode, setCoupleCode] = useState("");
  const [streak, setStreak] = useState("0");
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [tasksPendingCount, setTasksPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<Task[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [identityGender, setIdentityGender] = useState("masculino");

  // NOVO: Configurações de Finanças movidas pra cá
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [currentFinanceSettings, setCurrentFinanceSettings] =
    useState<any>(null);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  useEffect(() => {
    loadProfileData();
    loadFinanceSettings();
  }, []);

  const loadFinanceSettings = async () => {
    const settings = await FinanceService.getSettings();
    if (settings) setCurrentFinanceSettings(settings);
  };

  const loadProfileData = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const name = await AsyncStorage.getItem("@user_nickname");
      const code = await AsyncStorage.getItem("@couple_code");
      const streakVal = await AsyncStorage.getItem("@task_streak");
      const savedIdentity = await AsyncStorage.getItem("@user_identity");

      if (name) setNickname(name);
      if (code) setCoupleCode(code);
      if (streakVal) setStreak(streakVal);
      if (savedIdentity) setIdentityGender(savedIdentity);
      if (user?.photoURL) setProfileImage(user.photoURL);

      const unsubscribe = await TaskService.listen((tasks: Task[]) => {
        const myCompleted = tasks.filter(
          (t) => t.completed && t.completedByNickname === name,
        ).length;
        const expiredTasks = tasks.filter((t) => {
          if (t.completed) return false;
          return checkTaskStatus(t) === "expired";
        });
        setTasksCompleted(myCompleted);
        setPendingList(expiredTasks);
        setTasksPendingCount(expiredTasks.length);
      });
      if (unsubscribe) setTimeout(() => unsubscribe(), 1000);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets[0].uri)
        uploadImage(result.assets[0].uri);
    } catch (error) {
      showAlert("Erro", "Não foi possível abrir a galeria.", "error");
    }
  };

  const uploadImage = async (uri: string) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    setUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(
        getStorage(),
        `profile_photos/${user.uid}_${Date.now()}.jpg`,
      );
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: downloadUrl });
      await updateDoc(doc(getFirestore(), "users", user.uid), {
        photoURL: downloadUrl,
      });
      setProfileImage(downloadUrl);
      showAlert("Sucesso", "Foto de perfil atualizada!", "success");
    } catch (error: any) {
      showAlert("Erro no Upload", "Verifique o Storage.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(coupleCode);
    showAlert("Copiado! 📋", "Código na área de transferência.", "success");
  };
  const handleSwitchTheme = async () => {
    await toggleTheme();
    showAlert("Tema Alterado", `Visual alterado.`, "success");
  };
  const handleLogout = async () => {
    await AuthService.logout();
    router.replace("/");
  };

  if (loading)
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
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingImage}
            style={{ position: "relative" }}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {uploadingImage ? (
                <ActivityIndicator color="#FFF" />
              ) : profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={{ fontSize: 45 }}>
                  {identityGender === "feminino" ? "👩‍🦰" : "🧔"}
                </Text>
              )}
            </View>
            <View
              style={[styles.editIconBadge, { backgroundColor: colors.accent }]}
            >
              <MaterialIcons name="edit" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
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
            <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Dias Seguidos</Text>
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
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card }]}
            onPress={() => setShowHistory(true)}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={28}
              color="#D32F2F"
            />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {tasksPendingCount}
            </Text>
            <Text style={styles.statLabel}>Penalidades</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[styles.sectionTitle, { color: colors.sub, marginTop: 20 }]}
        >
          CONFIGURAÇÕES
        </Text>

        {/* NOVO: BOTÃO DE CONFIGURAR FINANÇAS */}
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: colors.card }]}
          onPress={() => setShowFinanceModal(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#E8F5E9" : "#37474F" },
              ]}
            >
              <MaterialCommunityIcons
                name="finance"
                size={20}
                color={isFemale ? "#4CAF50" : "#FFF"}
              />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Configurar Finanças
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.sub} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: colors.card, marginTop: 10 },
          ]}
          onPress={() => router.push("/vincular")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#FCE4EC" : "#37474F" },
              ]}
            >
              <MaterialCommunityIcons
                name="heart-plus"
                size={20}
                color={isFemale ? "#E91E63" : "#FF80AB"}
              />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Vincular Casal
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.sub} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: colors.card, marginTop: 10 },
          ]}
          onPress={handleSwitchTheme}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#E3F2FD" : "#37474F" },
              ]}
            >
              <MaterialCommunityIcons
                name="palette-outline"
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

        <TouchableOpacity style={[styles.logoutBtn]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair do App</Text>
        </TouchableOpacity>
        <View style={styles.footerContainer}>
          <Text style={styles.copyrightText}>
            Desenvolvido com ❤️ por Marcos & Mel
          </Text>
          <Text style={styles.copyrightSub}>
            © 2026 A Colher. Todos os direitos reservados.
          </Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showHistory} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Tarefas Perdidas (+26h)
              </Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <AntDesign name="close" size={24} color={colors.sub} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pendingList}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text
                    style={{ color: colors.sub, fontFamily: Fonts.regular }}
                  >
                    Tudo limpo! Nenhuma penalidade. 🎉
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.historyItem,
                    {
                      borderLeftColor: "#D32F2F",
                      backgroundColor: "rgba(211, 47, 47, 0.05)",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.historyDate, { color: "#EF5350" }]}>
                      Venceu em: {item.date || "Data desconhecida"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="emoticon-sad-outline"
                    size={28}
                    color="#D32F2F"
                  />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <FinanceConfigModal
        visible={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        onSave={loadFinanceSettings}
        initialIncome={currentFinanceSettings?.monthlyIncome || 0}
        initialMode={currentFinanceSettings?.mode || "unified"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontFamily: Fonts.black },
  content: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  editIconBadge: {
    position: "absolute",
    bottom: 15,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  name: { fontSize: 24, fontFamily: Fonts.bold, marginBottom: 15 },
  codeContainer: {
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    width: "100%",
  },
  codeLabel: { fontSize: 12, marginBottom: 4, fontFamily: Fonts.regular },
  code: { fontSize: 18, fontFamily: Fonts.bold, letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    elevation: 2,
  },
  statNumber: { fontSize: 22, fontFamily: Fonts.black, marginTop: 8 },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    textAlign: "center",
    fontFamily: Fonts.regular,
  },
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
  optionText: { fontSize: 16, fontFamily: Fonts.semiBold },
  logoutBtn: {
    marginTop: 40,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FF5252",
    alignItems: "center",
    backgroundColor: "rgba(255, 82, 82, 0.05)",
  },
  logoutText: { color: "#FF5252", fontFamily: Fonts.bold, fontSize: 16 },
  footerContainer: { marginTop: 40, alignItems: "center", opacity: 0.6 },
  copyrightText: { fontSize: 12, color: "#888", fontFamily: Fonts.bold },
  copyrightSub: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontFamily: Fonts.black },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  historyTitle: { fontSize: 16, fontFamily: Fonts.bold },
  historyDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontFamily: Fonts.bold,
  },
});
