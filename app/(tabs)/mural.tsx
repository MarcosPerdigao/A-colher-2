import React, { useState, useCallback } from "react";
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
  Keyboard,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import {
  AntDesign,
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfettiCannon from "react-native-confetti-cannon";

// 🚀 IMPORTAÇÃO DO CALENDÁRIO
import DateTimePicker from "@react-native-community/datetimepicker";

import { useMural } from "../../src/hooks/useMural";
import TaskCard from "../../src/components/TaskCard";
import { TaskService, Task } from "../../src/services/tasks";
import { NotificationService } from "../../src/services/notifications";
import { HistoryService } from "../../src/services/history";
import { useTheme } from "../../src/context/ThemeContext";
import { Fonts } from "../../constants/theme";
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
  const mural = useMural(isFemale ? "feminino" : "masculino");

  const [newTask, setNewTask] = useState("");
  const [newObs, setNewObs] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [newPriority, setNewPriority] = useState<
    "high" | "medium" | "low" | undefined
  >(undefined);
  const [assignedTo, setAssignedTo] = useState<"me" | "partner" | "judge">(
    "partner",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorPriority, setErrorPriority] = useState(false);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);

  // 🚀 ESTADOS DO CALENDÁRIO
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  // Trava de Segurança contra duplo clique
  const [isSaving, setIsSaving] = useState(false);

  const loadUserDataAndDates = async () => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;
      const db = getFirestore();
      const myRef = doc(db, "users", auth.currentUser.uid);
      const mySnap = await getDoc(myRef);
      if (!mySnap.exists()) return;
      const myData = mySnap.data();
      if (myData.photoURL) setMyPhoto(myData.photoURL);

      const coupleCode = myData.coupleCode;
      if (coupleCode) {
        const q = query(
          collection(db, "users"),
          where("coupleCode", "==", coupleCode),
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.id !== auth.currentUser?.uid) {
            const partnerData = doc.data();
            if (partnerData.photoURL) setPartnerPhoto(partnerData.photoURL);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar fotos do casal:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserDataAndDates();
    }, []),
  );

  // 🚀 LÓGICA DO CALENDÁRIO
  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "set" && selectedDate) {
      setDateObj(selectedDate);
      setTaskDate(selectedDate.toLocaleDateString("pt-BR"));
    } else {
      setShowDatePicker(false);
    }
  };

  const resetForm = () => {
    setNewTask("");
    setNewObs("");
    setNewPriority(undefined);
    setAssignedTo("partner");
    setTaskDate("");
    setEditingId(null);
    setErrorTitle("");
    setErrorPriority(false);
    setIsSaving(false);
  };

  const openNewTask = () => {
    resetForm();
    const today = new Date();
    setDateObj(today); // Seta o objeto data para hoje
    setTaskDate(today.toLocaleDateString("pt-BR"));
    mural.toggleModal("new", true);
  };

  const handleLongPress = useCallback((task: Task) => {
    Keyboard.dismiss();
    setSelectedTask(task);
    setTimeout(() => setShowOptions(true), 50);
  }, []);

  const handleEditOption = async () => {
    if (!selectedTask) return;
    if (selectedTask.createdBy === "Juiz") {
      mural.showFeedback(
        "Veredito Final ⚖️",
        "O Juiz sentenciou essa tarefa! Não cabe recurso.",
        "error",
      );
      setShowOptions(false);
      return;
    }

    setNewTask(selectedTask.title || "");
    setNewObs(selectedTask.observation || "");
    setTaskDate(selectedTask.date || "");
    setNewPriority(selectedTask.priority || "medium");

    // 🚀 LÓGICA PARA CONVERTER "DD/MM/AAAA" DE VOLTA PARA OBJETO DATA (CALENDÁRIO)
    if (selectedTask.date) {
      const parts = selectedTask.date.split("/");
      if (parts.length === 3) {
        // Formato Date: ano, mes (0-11), dia
        setDateObj(
          new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])),
        );
      } else {
        setDateObj(new Date());
      }
    } else {
      setDateObj(new Date());
    }

    let assign = "partner";
    if (
      selectedTask.assignedToNickname === "me" ||
      selectedTask.assignedToNickname === mural.myNickname ||
      (selectedTask as any).assignedTo === "me"
    )
      assign = "me";
    else if (
      selectedTask.assignedToNickname === "judge" ||
      (selectedTask as any).assignedTo === "judge"
    )
      assign = "judge";

    setAssignedTo(assign as any);
    setEditingId(selectedTask.id || null);
    setShowOptions(false);
    mural.toggleModal("new", true);
  };

  const handleDeleteOption = () => {
    const taskToDelete = selectedTask;
    if (!taskToDelete) return;
    if (taskToDelete.createdBy === "Juiz") {
      mural.showFeedback(
        "Veredito Final ⚖️",
        "Ordem do Juiz não se discute!",
        "error",
      );
      setShowOptions(false);
      return;
    }

    if (taskToDelete.createdBy) {
      const isMyTask =
        taskToDelete.assignedToNickname === "me" ||
        taskToDelete.assignedToNickname === mural.myNickname;
      const createdByPartner = taskToDelete.createdBy !== mural.myNickname;
      if (createdByPartner && isMyTask) {
        mural.showFeedback(
          "Sem Trapaça! 🚫",
          "Tarefa dada pelo(a) parceiro(a). Só ele(a) pode tirar!",
          "warning",
        );
        setShowOptions(false);
        return;
      }
    }

    setShowOptions(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    const taskTitle = selectedTask.title;
    try {
      mural.removeTaskFromState(taskId);
      setShowDeleteModal(false);
      setSelectedTask(null);
      await TaskService.delete(taskId);
      await HistoryService.logAction(mural.myNickname, "excluiu", taskTitle);

      const isPartnerInvolved =
        selectedTask.assignedToNickname === mural.partnerName ||
        selectedTask.createdBy === mural.partnerName;
      if (isPartnerInvolved) {
        const pToken = await TaskService.getPartnerToken();
        if (pToken)
          await NotificationService.sendPushNotification(
            pToken,
            "Tarefa Removida 🗑️",
            `${mural.myNickname} excluiu: ${taskTitle}`,
          );
      }
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      mural.showFeedback("Erro", "Não foi possível excluir a tarefa.", "error");
    }
  };

  const submitTask = async () => {
    if (isSaving) return;

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

    setIsSaving(true);
    const pName = mural.partnerName || "Parceiro(a)";

    try {
      if (editingId) {
        const updates = {
          title: newTask,
          observation: newObs,
          date: taskDate,
          priority: newPriority,
          assignedToNickname:
            assignedTo === "me"
              ? mural.myNickname
              : assignedTo === "judge"
                ? "judge"
                : pName,
        };
        mural.updateTaskInState(editingId, updates);
        mural.toggleModal("new", false);
        resetForm();
        await TaskService.update(editingId, updates);
        await HistoryService.logAction(mural.myNickname, "editou", newTask);

        if (assignedTo !== "me") {
          const pToken = await TaskService.getPartnerToken();
          if (pToken)
            await NotificationService.sendPushNotification(
              pToken,
              "Tarefa Atualizada ✏️",
              `${mural.myNickname} alterou a tarefa: ${newTask}`,
            );
        }
      } else {
        await mural.handleAddTask(
          {
            title: newTask,
            obs: newObs,
            date: taskDate,
            priority: newPriority as any,
            assignedTo: assignedTo,
          },
          resetForm,
        );
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCompletedAt = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString("pt-BR", {
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
            autoStart
            fadeOut
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
            onPress={() => mural.setActiveTab(tab)}
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
        data={["pending", "completed"]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(e) =>
          mural.setActiveTab(
            Math.round(e.nativeEvent.contentOffset.x / windowWidth) === 0
              ? "pending"
              : "completed",
          )
        }
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={{ width: windowWidth, paddingHorizontal: 20 }}>
            <FlatList
              data={
                item === "pending" ? mural.pendingTasks : mural.completedTasks
              }
              keyExtractor={(t) => t.id || Math.random().toString()}
              contentContainerStyle={{ paddingBottom: 150 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: task }) => (
                <TaskCard
                  item={task}
                  theme={colors}
                  myNickname={mural.myNickname}
                  formatDate={formatCompletedAt}
                  onPress={() => mural.handleTaskPress(task)}
                  onLongPress={() => {
                    if (!task.completed) handleLongPress(task);
                  }}
                  myPhoto={myPhoto}
                  partnerPhoto={partnerPhoto}
                />
              )}
              ListEmptyComponent={
                <View style={{ marginTop: 50, alignItems: "center" }}>
                  <Text
                    style={{ color: colors.sub, fontFamily: Fonts.regular }}
                  >
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
            { backgroundColor: colors.primary, bottom: 50 + insets.bottom },
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

      <GenericModal
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        bg={colors.card}
      >
        <Text
          style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}
        >
          O que deseja fazer?
        </Text>
        <TouchableOpacity
          style={[styles.optionMenuBtn, { backgroundColor: colors.bg }]}
          onPress={handleEditOption}
        >
          <MaterialIcons name="edit" size={24} color={colors.primary} />
          <Text style={[styles.optionMenuText, { color: colors.text }]}>
            Editar Tarefa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionMenuBtn,
            { backgroundColor: colors.bg, marginTop: 10 },
          ]}
          onPress={handleDeleteOption}
        >
          <MaterialIcons name="delete" size={24} color="#FF5252" />
          <Text style={[styles.optionMenuText, { color: "#FF5252" }]}>
            Excluir Tarefa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowOptions(false)}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.sub, fontFamily: Fonts.regular }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </GenericModal>

      <GenericModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        bg={colors.card}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={50}
          color="#FF5252"
          style={{ marginBottom: 10 }}
        />
        <Text
          style={[styles.modalTitle, { color: "#FF5252", marginBottom: 5 }]}
        >
          Excluir Tarefa?
        </Text>
        <Text
          style={{
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
            fontFamily: Fonts.regular,
          }}
        >
          Tem certeza que deseja apagar &quot;{selectedTask?.title}&quot;?
        </Text>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: "#FF5252", width: "100%", marginBottom: 10 },
          ]}
          onPress={confirmDelete}
        >
          <Text style={{ color: "#FFF", fontFamily: Fonts.bold }}>
            Sim, Excluir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDeleteModal(false)}
          style={{ padding: 10 }}
        >
          <Text style={{ color: colors.text, fontFamily: Fonts.regular }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </GenericModal>

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
            <View
              style={[
                styles.modalView,
                {
                  backgroundColor: colors.card,
                  paddingBottom: insets.bottom + 20,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingId ? "Editar Tarefa" : "Nova Tarefa"}
                </Text>
                <TouchableOpacity
                  onPress={() => mural.toggleModal("new", false)}
                >
                  <AntDesign name="close" size={24} color={colors.sub} />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
                    onPress={() => setAssignedTo("judge")}
                  />
                </View>

                {/* 🚀 BOTÃO QUE ABRE O CALENDÁRIO */}
                <Text style={[styles.label, { color: colors.sub }]}>Data</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      justifyContent: "center",
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={{ color: colors.text, fontFamily: Fonts.regular }}
                  >
                    {taskDate || "Selecionar data"}
                  </Text>
                </TouchableOpacity>

                {/* 🚀 RENDERIZADOR DO CALENDÁRIO NATIVO */}
                {showDatePicker && (
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )}

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
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      color={isFemale ? colors.text : "#fff"}
                    />
                  ) : (
                    <Text
                      style={{
                        color: isFemale ? colors.text : "#fff",
                        fontFamily: Fonts.bold,
                        fontSize: 16,
                      }}
                    >
                      {editingId ? "Salvar Alterações" : "Lançar no Mural"}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                fontFamily: Fonts.regular,
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
          style={{
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
            fontFamily: Fonts.regular,
          }}
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
          style={{
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
            fontFamily: Fonts.regular,
          }}
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
              <Text style={{ color: colors.sub, fontFamily: Fonts.regular }}>
                Cancelar
              </Text>
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
      {
        borderColor: color,
        backgroundColor: selected ? color : "transparent",
        flex: 1,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
      },
    ]}
  >
    {icon && (
      <FontAwesome5
        name={icon}
        size={14}
        color={selected ? "#fff" : color}
        style={label ? { marginRight: 6 } : { marginRight: 0 }}
      />
    )}
    {label ? (
      <Text
        style={{
          color: selected
            ? label === "Juiz"
              ? "#fff"
              : theme.text
            : label === "Juiz"
              ? color
              : theme.sub,
          fontFamily: Fonts.bold,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    ) : null}
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
    <Text style={{ color: txtColor || "#FFF", fontFamily: Fonts.bold }}>
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
  headerTitle: { fontSize: 24, fontFamily: Fonts.black },
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
  tabText: {
    fontFamily: Fonts.black,
    fontSize: 13,
    textTransform: "uppercase",
  },
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
  modalTitle: { fontSize: 22, fontFamily: Fonts.black },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.regular,
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
  optionMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    width: "100%",
    gap: 15,
  },
  optionMenuText: { fontSize: 16, fontFamily: Fonts.bold },
});
