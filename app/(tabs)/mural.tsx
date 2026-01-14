import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  StatusBar,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Stack } from "expo-router";
import {
  MaterialIcons,
  AntDesign,
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfettiCannon from "react-native-confetti-cannon";

import { useMural } from "../../src/hooks/useMural";
import TaskCard from "../../src/components/TaskCard";
import { TaskService } from "../../src/services/tasks";
import { useTheme } from "../../src/context/ThemeContext";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function MuralScreen() {
  const { colors, isFemale } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = Dimensions.get("window");
  const pagerRef = useRef<FlatList>(null);

  const mural = useMural(isFemale ? "feminino" : "masculino");

  const [newTask, setNewTask] = useState("");
  const [newObs, setNewObs] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [newPriority, setNewPriority] = useState<
    "high" | "medium" | "low" | null
  >(null);
  const [assignedTo, setAssignedTo] = useState<"me" | "partner" | "judge">(
    "partner"
  );
  const [errorTitle, setErrorTitle] = useState("");
  const [errorPriority, setErrorPriority] = useState(false);

  const checkImportantDates = async () => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;
      const db = getFirestore();
      const myRef = doc(db, "users", auth.currentUser.uid);
      const mySnap = await getDoc(myRef);
      if (!mySnap.exists()) return;
      const myData = mySnap.data();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formatDayMonth = (date: Date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}`;
      };
      const tomorrowStr = formatDayMonth(tomorrow);

      if (myData.anniversaryDate === tomorrowStr)
        mural.toggleModal("feedback", true);

      const coupleCode = myData.coupleCode;
      if (coupleCode) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("coupleCode", "==", coupleCode));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.id !== auth.currentUser?.uid) {
            const partnerData = doc.data();
            if (partnerData.birthDate === tomorrowStr)
              mural.toggleModal("feedback", true);
          }
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    checkImportantDates();
  }, []);

  const resetForm = () => {
    setNewTask("");
    setNewObs("");
    setNewPriority(null);
    setAssignedTo("partner");
    setErrorTitle("");
    setErrorPriority(false);
  };

  const openNewTask = () => {
    resetForm();
    setTaskDate(new Date().toLocaleDateString("pt-BR"));
    mural.toggleModal("new", true);
  };

  const submitTask = () => {
    let hasError = false;
    if (!newTask.trim()) {
      setErrorTitle("O que precisamos fazer?");
      hasError = true;
    }
    if (!newPriority) {
      setErrorPriority(true);
      hasError = true;
    }
    if (hasError) return;

    mural.handleAddTask(
      {
        title: newTask,
        obs: newObs,
        date: taskDate,
        priority: newPriority,
        assignedTo,
      },
      resetForm
    );
  };

  const handleTabPress = (tab: "pending" | "completed") => {
    mural.setActiveTab(tab);
    pagerRef.current?.scrollToIndex({
      index: tab === "pending" ? 0 : 1,
      animated: true,
    });
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    mural.setActiveTab(index === 0 ? "pending" : "completed");
  };

  const formatCompletedAt = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      {mural.showConfetti && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            autoStart={true}
            fadeOut={true}
            onAnimationEnd={() => mural.setShowConfetti(false)}
            fallSpeed={3000}
          />
        </View>
      )}

      <View style={[styles.headerRow, { marginTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mural de Tarefas
        </Text>
      </View>

      <View
        style={[
          styles.tabContainer,
          { backgroundColor: isFemale ? "#FCE4EC" : "#1A1A1A" },
        ]}
      >
        {(["pending", "completed"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              mural.activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleTabPress(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    mural.activeTab === tab
                      ? isFemale
                        ? colors.text
                        : "#fff"
                      : colors.sub,
                },
              ]}
            >
              {tab === "pending" ? "Pendentes" : "Feitas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={pagerRef}
        data={["pending", "completed"]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={{ width: windowWidth, paddingHorizontal: 20 }}>
            <FlatList
              data={
                item === "pending" ? mural.pendingTasks : mural.completedTasks
              }
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item: task }) => (
                <TaskCard
                  item={task}
                  theme={colors}
                  myNickname={mural.myNickname}
                  formatDate={formatCompletedAt}
                  onPress={() => mural.handleTaskPress(task)}
                  onLongPress={() => TaskService.delete(task.id)}
                />
              )}
              ListEmptyComponent={
                <View style={{ marginTop: 50, alignItems: "center" }}>
                  <Text style={{ color: colors.sub }}>
                    {item === "pending"
                      ? "Tudo limpo! 🎉"
                      : "Nenhuma tarefa concluída."}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      />

      {mural.activeTab === "pending" && (
        <TouchableOpacity
          style={[
            styles.fabBase,
            { backgroundColor: colors.primary, bottom: 40 + insets.bottom },
          ]}
          onPress={openNewTask}
        >
          <AntDesign
            name="plus"
            size={30}
            color={isFemale ? colors.text : "#fff"}
          />
        </TouchableOpacity>
      )}

      {/* --- MODAIS --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mural.modals.new}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalView, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Nova Tarefa
                </Text>
                <TouchableOpacity
                  onPress={() => mural.toggleModal("new", false)}
                >
                  <AntDesign name="close" size={24} color={colors.sub} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.label, { color: colors.sub }]}>
                  Descrição
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: errorTitle ? "#FF5252" : colors.border,
                    },
                    errorTitle ? { backgroundColor: "#FFEBEE" } : {},
                  ]}
                  placeholder="O que precisa ser feito?"
                  placeholderTextColor={colors.sub}
                  value={newTask}
                  onChangeText={(t) => {
                    setNewTask(t);
                    if (errorTitle) setErrorTitle("");
                  }}
                />

                <Text
                  style={[styles.label, { color: colors.sub, marginTop: 10 }]}
                >
                  Quem faz?
                </Text>
                <View style={styles.priorityRow}>
                  <OptionBtn
                    selected={assignedTo === "me"}
                    label="Eu"
                    color={colors.accent}
                    theme={colors}
                    onPress={() => setAssignedTo("me")}
                  />
                  <OptionBtn
                    selected={assignedTo === "partner"}
                    label={mural.partnerName}
                    color={colors.primary}
                    theme={colors}
                    onPress={() => setAssignedTo("partner")}
                  />
                  <OptionBtn
                    selected={assignedTo === "judge"}
                    label="Juiz"
                    color="#9C27B0"
                    theme={colors}
                    icon="gavel"
                    onPress={() => setAssignedTo("judge")}
                  />
                </View>

                <Text style={[styles.label, { color: colors.sub }]}>Data</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={taskDate}
                  onChangeText={setTaskDate}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Text style={[styles.label, { color: colors.sub }]}>
                  Detalhes
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Ex: Deixar secando"
                  placeholderTextColor={colors.sub}
                  value={newObs}
                  onChangeText={setNewObs}
                />

                <Text style={[styles.label, { color: colors.sub }]}>
                  Prioridade
                </Text>
                <View
                  style={[
                    styles.priorityRow,
                    errorPriority && {
                      borderColor: "#FF5252",
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderRadius: 10,
                      padding: 5,
                    },
                  ]}
                >
                  <OptionBtn
                    selected={newPriority === "low"}
                    label="Tranquilo"
                    color="#66BB6A"
                    theme={colors}
                    onPress={() => setNewPriority("low")}
                  />
                  <OptionBtn
                    selected={newPriority === "medium"}
                    label="Normal"
                    color="#FFCA28"
                    theme={colors}
                    onPress={() => setNewPriority("medium")}
                  />
                  <OptionBtn
                    selected={newPriority === "high"}
                    label="Urgente"
                    color="#EF5350"
                    theme={colors}
                    onPress={() => setNewPriority("high")}
                  />
                </View>
                <TouchableOpacity
                  onPress={submitTask}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text
                    style={{
                      color: isFemale ? colors.text : "#fff",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Lançar no Mural
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Modais genéricos reutilizando componentes locais */}
      <GenericModal
        visible={mural.modals.judge}
        onClose={() => mural.toggleModal("judge", false)}
        bg={colors.card}
        borderColor={mural.judgeResult?.color}
      >
        {mural.judgeResult && (
          <>
            <FontAwesome5
              name={mural.judgeResult.icon}
              size={50}
              color={mural.judgeResult.color}
              style={{ marginBottom: 15 }}
            />
            <Text
              style={[
                styles.modalTitle,
                { color: mural.judgeResult.color, marginBottom: 10 },
              ]}
            >
              {mural.judgeResult.title}
            </Text>
            <Text
              style={{
                color: colors.text,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {mural.judgeResult.message}
            </Text>
            <BtnAction
              label="ENTENDIDO"
              color={mural.judgeResult.color}
              onPress={() => mural.toggleModal("judge", false)}
            />
          </>
        )}
      </GenericModal>
      <GenericModal
        visible={mural.modals.congrats}
        onClose={() => mural.toggleModal("congrats", false)}
        bg={colors.card}
        borderColor={colors.success}
      >
        <MaterialCommunityIcons
          name="party-popper"
          size={60}
          color={colors.success}
          style={{ marginBottom: 10 }}
        />
        <Text style={[styles.modalTitle, { color: colors.success }]}>
          Mandou Bem!
        </Text>
        <Text
          style={{ color: colors.text, textAlign: "center", marginBottom: 20 }}
        >
          Tarefa concluída!
        </Text>
        <BtnAction
          label="FECHAR"
          color={colors.success}
          onPress={() => mural.toggleModal("congrats", false)}
        />
      </GenericModal>
      <GenericModal
        visible={mural.modals.feedback}
        onClose={() => mural.toggleModal("feedback", false)}
        bg={colors.card}
      >
        <MaterialCommunityIcons
          name={
            mural.feedbackData.type === "error" ? "alert-circle" : "information"
          }
          size={50}
          color={mural.feedbackData.type === "error" ? "#FF5252" : "#FFCA28"}
          style={{ marginBottom: 15 }}
        />
        <Text style={[styles.modalTitle, { color: colors.text }]}>
          {mural.feedbackData.title}
        </Text>
        <Text
          style={{ color: colors.text, textAlign: "center", marginBottom: 20 }}
        >
          {mural.feedbackData.message}
        </Text>
        <BtnAction
          label="OK"
          color={colors.primary}
          txtColor={isFemale ? colors.text : "#FFF"}
          onPress={() => mural.toggleModal("feedback", false)}
        />
      </GenericModal>
      <GenericModal
        visible={mural.modals.finish}
        onClose={() => mural.toggleModal("finish", false)}
        bg={colors.card}
      >
        <Text
          style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}
        >
          Tarefa Realizada?
        </Text>
        {mural.uploading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={{ width: "100%" }}>
            <BtnAction
              label="📸 Tirar Foto"
              color={colors.bg}
              txtColor={colors.text}
              onPress={() => mural.pickImage("camera")}
            />
            <View style={{ height: 10 }} />
            <BtnAction
              label="✅ Concluir sem Foto"
              color={colors.primary}
              txtColor={isFemale ? colors.text : "#FFF"}
              onPress={() => mural.completeTask(undefined)}
            />
            <TouchableOpacity
              onPress={() => mural.toggleModal("finish", false)}
              style={{ marginTop: 15, alignItems: "center" }}
            >
              <Text style={{ color: colors.sub }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </GenericModal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={mural.modals.preview}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 30 }}
            onPress={() => mural.toggleModal("preview", false)}
          >
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
          {mural.selectedPhotoToView && (
            <Image
              source={{ uri: mural.selectedPhotoToView }}
              style={{ width: "90%", height: "70%", borderRadius: 20 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const OptionBtn = ({ selected, label, color, theme, icon, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.priorityBtn,
      { borderColor: color, backgroundColor: selected ? color : "transparent" },
    ]}
  >
    {icon && (
      <FontAwesome5
        name={icon}
        size={14}
        color={selected ? "#fff" : color}
        style={{ marginRight: 6 }}
      />
    )}
    <Text
      style={{
        color: selected
          ? label === "Juiz"
            ? "#fff"
            : theme.text
          : label === "Juiz"
          ? color
          : theme.sub,
        fontWeight: "bold",
        fontSize: 12,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
const GenericModal = ({ visible, onClose, bg, borderColor, children }: any) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlayCenter}>
      <View
        style={[
          styles.modalAlert,
          {
            backgroundColor: bg,
            borderColor: borderColor || "transparent",
            borderWidth: borderColor ? 2 : 0,
          },
        ]}
      >
        {children}
      </View>
    </View>
  </Modal>
);
const BtnAction = ({ label, color, txtColor, onPress }: any) => (
  <TouchableOpacity
    style={[styles.saveBtn, { backgroundColor: color, width: "100%" }]}
    onPress={onPress}
  >
    <Text style={{ color: txtColor || "#FFF", fontWeight: "bold" }}>
      {label}
    </Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 0 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "900" },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 6,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  tabText: { fontWeight: "800", fontSize: 13, textTransform: "uppercase" },
  fabBase: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    position: "absolute",
    right: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalOverlayCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  modalAlert: {
    width: "90%",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
  },
  modalView: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#888",
  },
  input: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveBtn: { paddingVertical: 16, borderRadius: 15, alignItems: "center" },
  optionBtn: {
    padding: 15,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: -10,
    gap: 5,
  },
  errorText: { color: "#FF5252", fontWeight: "bold", fontSize: 12 },
});
