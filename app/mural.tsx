import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions, // <--- Necessário para calcular a largura da tela
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  MaterialIcons,
  AntDesign,
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";

import { TaskService, Task } from "../src/services/tasks";
import { NotificationService } from "../src/services/notifications";

interface TaskWithPhoto extends Task {
  photo?: string;
}

export default function MuralScreen() {
  const { sexo } = useLocalSearchParams();
  const isFemale = sexo === "feminino";
  const insets = useSafeAreaInsets();

  // Dimensões para o Slide
  const { width: windowWidth } = Dimensions.get("window");
  const pagerRef = useRef<FlatList>(null); // Referência para controlar o slide

  const [tasks, setTasks] = useState<TaskWithPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );
  const [partnerName, setPartnerName] = useState("Parceiro");
  const [myNickname, setMyNickname] = useState("");

  // Modais e Estados
  const [modalVisible, setModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [judgeModalVisible, setJudgeModalVisible] = useState(false);
  const [congratsVisible, setCongratsVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [feedbackData, setFeedbackData] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "warning" | "error",
  });

  const [uploading, setUploading] = useState(false);
  const [selectedTaskToFinish, setSelectedTaskToFinish] = useState<
    string | null
  >(null);
  const [selectedPhotoToView, setSelectedPhotoToView] = useState<string | null>(
    null
  );

  const confettiRef = useRef<ConfettiCannon>(null);

  const [judgeResult, setJudgeResult] = useState<{
    title: string;
    message: string;
    icon: string;
    color: string;
  } | null>(null);

  // Form
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

  const theme = isFemale
    ? {
        bg: "#FFF5F7",
        primary: "#FFD1DC",
        accent: "#B2E2F2",
        card: "#FFFFFF",
        text: "#5D4037",
        sub: "#A1887F",
        border: "#FFECF1",
        success: "#81C784",
      }
    : {
        bg: "#121212",
        primary: "#37474F",
        accent: "#546E7A",
        card: "#1E1E1E",
        text: "#ECEFF1",
        sub: "#90A4AE",
        border: "#333",
        success: "#66BB6A",
      };

  const priorityColors = {
    high: "#EF5350",
    medium: "#FFCA28",
    low: "#66BB6A",
  };

  const priorityLabels = {
    high: "Urgente",
    medium: "Normal",
    low: "Tranquilo",
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const setup = async () => {
      unsubscribe = await TaskService.listen((updatedTasks) => {
        setTasks(updatedTasks);
      });

      const token =
        await NotificationService.registerForPushNotificationsAsync();
      const storedNickname = await AsyncStorage.getItem("@user_nickname");

      if (storedNickname) {
        setMyNickname(storedNickname);
        if (token) {
          await TaskService.saveUserToken(token, storedNickname);
          const pNickname = await TaskService.getPartnerNickname(
            storedNickname
          );
          if (pNickname) setPartnerName(pNickname);
        }
      }
    };
    setup();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // --- FUNÇÕES DE SLIDE ---
  const handleTabPress = (tab: "pending" | "completed") => {
    setActiveTab(tab);
    // Rola a lista horizontal para a página certa
    pagerRef.current?.scrollToIndex({
      index: tab === "pending" ? 0 : 1,
      animated: true,
    });
  };

  const handleScroll = (event: any) => {
    // Detecta em qual página estamos baseada na rolagem
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / windowWidth);
    const newTab = index === 0 ? "pending" : "completed";
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };
  // ------------------------

  const showFeedback = (
    title: string,
    message: string,
    type: "success" | "warning" | "error"
  ) => {
    setFeedbackData({ title, message, type });
    setFeedbackVisible(true);
  };

  const openNewTaskModal = () => {
    setErrorTitle("");
    setErrorPriority(false);
    setNewTask("");
    setNewObs("");
    setTaskDate(new Date().toLocaleDateString("pt-BR"));
    setNewPriority(null);
    setAssignedTo("partner");
    setModalVisible(true);
  };

  const handleAddTask = async () => {
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

    let finalRecipient = assignedTo;
    let displayTitle = newTask;
    let notificationTitle = "Nova tarefa no Mural! 🥄";
    let notificationBody = `${myNickname} adicionou: ${newTask}`;

    if (assignedTo === "judge") {
      const isMe = Math.random() > 0.5;
      finalRecipient = isMe ? "me" : "partner";
      displayTitle = `⚖️ [JUIZ] ${newTask}`;

      if (isMe) {
        setJudgeResult({
          title: "O JUIZ TE PEGOU!",
          message: `Azar o seu, ${myNickname}! Essa tarefa é SUA.`,
          icon: "gavel",
          color: "#EF5350",
        });
        notificationTitle = "O JUIZ TE SALVOU! 😂";
        notificationBody = `O juiz mandou o(a) ${myNickname} fazer: ${newTask}`;
      } else {
        setJudgeResult({
          title: "VITÓRIA! 🎉",
          message: `Boa! A tarefa ficou para o(a) ${partnerName}.`,
          icon: "trophy",
          color: theme.success,
        });
        notificationTitle = "VEREDITO DO JUIZ! ⚖️";
        notificationBody = `Sinto muito, ${partnerName}, você perdeu no sorteio: ${newTask}`;
      }
      setJudgeModalVisible(true);
    } else if (assignedTo === "me") {
      displayTitle = `👤 [EU] ${newTask}`;
    }

    const task: TaskWithPhoto = {
      id: Date.now().toString(),
      title: displayTitle,
      completed: false,
      observation: newObs,
      date: taskDate,
      priority: newPriority!,
    };

    await TaskService.add(task);

    if (finalRecipient === "partner") {
      const partnerToken = await TaskService.getPartnerToken(myNickname);
      if (partnerToken) {
        await NotificationService.sendPushNotification(
          partnerToken,
          notificationTitle,
          notificationBody
        );
      }
    }
    setModalVisible(false);
  };

  const checkStreakAndCelebrate = async () => {
    try {
      const streakString = await AsyncStorage.getItem("@task_streak");
      let currentStreak = streakString ? parseInt(streakString) : 0;
      currentStreak += 1;
      await AsyncStorage.setItem("@task_streak", currentStreak.toString());
      if (currentStreak % 3 === 0) {
        setTimeout(() => {
          if (confettiRef.current) {
            confettiRef.current.start();
          }
        }, 500);
      }
    } catch (e) {
      console.log("Erro streak", e);
    }
  };

  const completeTaskWithPhoto = async (id: string, localUri?: string) => {
    setUploading(true);
    try {
      const taskToFinish = tasks.find((t) => t.id === id);
      const taskTitle = taskToFinish ? taskToFinish.title : "uma tarefa";

      let publicPhotoUrl = null;
      let warningMessage = "";

      if (localUri) {
        publicPhotoUrl = await TaskService.uploadImage(localUri);
        if (!publicPhotoUrl) {
          warningMessage = "A foto não subiu, mas a tarefa foi concluída!";
        }
      }

      const updates: any = { completed: true };
      if (publicPhotoUrl) updates.photo = publicPhotoUrl;

      await TaskService.update(id, updates);

      const partnerToken = await TaskService.getPartnerToken(myNickname);
      if (partnerToken) {
        await NotificationService.sendPushNotification(
          partnerToken,
          "Tarefa Concluída! 🎉",
          `${myNickname} finalizou: ${taskTitle}`
        );
      }

      if (warningMessage) {
        showFeedback("Atenção", warningMessage, "warning");
      } else {
        setCongratsVisible(true);
        await checkStreakAndCelebrate();
      }
    } catch (error: any) {
      showFeedback("Erro", "Falha ao concluir tarefa.", "error");
    } finally {
      setUploading(false);
      setFinishModalVisible(false);
      setSelectedTaskToFinish(null);
    }
  };

  const pickImage = async (source: "camera" | "gallery") => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.5,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && selectedTaskToFinish) {
      completeTaskWithPhoto(selectedTaskToFinish, result.assets[0].uri);
    }
  };

  // Componente de Renderização da Tarefa (Reutilizável para as duas listas)
  const renderTaskItem = ({ item }: { item: TaskWithPhoto }) => (
    <TouchableOpacity
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.card,
          borderLeftColor: priorityColors[item.priority || "medium"],
          borderLeftWidth: 6,
        },
      ]}
      onPress={() =>
        item.completed
          ? (item.photo && setSelectedPhotoToView(item.photo),
            setPhotoPreviewVisible(!!item.photo))
          : (setSelectedTaskToFinish(item.id), setFinishModalVisible(true))
      }
      onLongPress={() => TaskService.delete(item.id)}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskText,
            { color: theme.text },
            item.completed && styles.taskTextDone,
          ]}
        >
          {item.title}
        </Text>
        <Text style={{ color: theme.sub, fontSize: 12, marginLeft: 15 }}>
          {item.date} {item.observation ? `• ${item.observation}` : ""}
        </Text>
      </View>
      {item.photo ? (
        <Image
          source={{ uri: item.photo }}
          style={{ width: 45, height: 45, borderRadius: 10 }}
        />
      ) : (
        <MaterialIcons
          name={item.completed ? "check-circle" : "panorama-fish-eye"}
          size={28}
          color={item.completed ? "#81C784" : theme.sub}
        />
      )}
    </TouchableOpacity>
  );

  // Filtragem
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      <ConfettiCannon
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        ref={confettiRef}
        fadeOut={true}
        fallSpeed={3000}
      />

      <View style={[styles.headerRow, { marginTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Mural de Tarefas
        </Text>
      </View>

      <View
        style={[
          styles.tabContainer,
          { backgroundColor: isFemale ? "#FCE4EC" : "#1A1A1A" },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "pending" && { backgroundColor: theme.primary },
          ]}
          onPress={() => handleTabPress("pending")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "pending"
                    ? isFemale
                      ? theme.text
                      : "#fff"
                    : theme.sub,
              },
            ]}
          >
            Pendentes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "completed" && { backgroundColor: theme.primary },
          ]}
          onPress={() => handleTabPress("completed")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "completed"
                    ? isFemale
                      ? theme.text
                      : "#fff"
                    : theme.sub,
              },
            ]}
          >
            Feitas
          </Text>
        </TouchableOpacity>
      </View>

      {/* ÁREA DE SLIDE PRINCIPAL */}
      <FlatList
        ref={pagerRef}
        data={["pending", "completed"]} // Duas "páginas"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll} // Sincroniza abas ao terminar o slide
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={{ width: windowWidth, paddingHorizontal: 20 }}>
            {/* Lista interna de tarefas */}
            <FlatList
              data={item === "pending" ? pendingTasks : completedTasks}
              keyExtractor={(task) => task.id}
              renderItem={renderTaskItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ marginTop: 50, alignItems: "center" }}>
                  <Text style={{ color: theme.sub, textAlign: "center" }}>
                    {item === "pending"
                      ? "Tudo limpo! 🎉"
                      : "Nenhuma tarefa concluída ainda."}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      />

      {activeTab === "pending" && (
        <TouchableOpacity
          style={[
            styles.fabBase,
            {
              backgroundColor: theme.primary,
              position: "absolute",
              bottom: 40 + insets.bottom,
              right: 20,
            },
          ]}
          onPress={openNewTaskModal}
        >
          <AntDesign
            name="plus"
            size={30}
            color={isFemale ? theme.text : "#fff"}
          />
        </TouchableOpacity>
      )}

      {/* --- MODAIS (Mantidos exatamente iguais) --- */}

      {/* MODAL 1: NOVA TAREFA */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalView, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Nova Tarefa
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <AntDesign name="close" size={24} color={theme.sub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.label, { color: theme.sub }]}>
                  Descrição
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: errorTitle ? "#FF5252" : theme.border,
                      borderWidth: errorTitle ? 1.5 : 1,
                    },
                    errorTitle ? { backgroundColor: "#FFEBEE" } : {},
                  ]}
                  placeholder="O que precisa ser feito?"
                  placeholderTextColor={errorTitle ? "#FF5252" : theme.sub}
                  value={newTask}
                  onChangeText={(t) => {
                    setNewTask(t);
                    if (errorTitle) setErrorTitle("");
                  }}
                />
                {errorTitle ? (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color="#FF5252"
                    />
                    <Text style={styles.errorText}>{errorTitle}</Text>
                  </View>
                ) : null}

                <Text
                  style={[styles.label, { color: theme.sub, marginTop: 10 }]}
                >
                  Quem faz?
                </Text>
                <View style={styles.priorityRow}>
                  <TouchableOpacity
                    style={[
                      styles.priorityBtn,
                      {
                        borderColor: theme.accent,
                        backgroundColor:
                          assignedTo === "me" ? theme.accent : "transparent",
                      },
                    ]}
                    onPress={() => setAssignedTo("me")}
                  >
                    <Text
                      style={{
                        color: assignedTo === "me" ? theme.text : theme.sub,
                        fontWeight: "bold",
                      }}
                    >
                      Eu
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.priorityBtn,
                      {
                        borderColor: theme.primary,
                        backgroundColor:
                          assignedTo === "partner"
                            ? theme.primary
                            : "transparent",
                      },
                    ]}
                    onPress={() => setAssignedTo("partner")}
                  >
                    <Text
                      style={{
                        color:
                          assignedTo === "partner"
                            ? isFemale
                              ? theme.text
                              : "#fff"
                            : theme.sub,
                        fontWeight: "bold",
                      }}
                    >
                      {partnerName}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.priorityBtn,
                      {
                        borderColor: "#9C27B0",
                        backgroundColor:
                          assignedTo === "judge" ? "#9C27B0" : "transparent",
                      },
                    ]}
                    onPress={() => setAssignedTo("judge")}
                  >
                    <FontAwesome5
                      name="gavel"
                      size={14}
                      color={assignedTo === "judge" ? "#fff" : "#9C27B0"}
                    />
                    <Text
                      style={{
                        color: assignedTo === "judge" ? "#fff" : "#9C27B0",
                        fontWeight: "bold",
                        marginLeft: 6,
                      }}
                    >
                      Juiz
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: theme.sub }]}>Data</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={theme.sub}
                  value={taskDate}
                  onChangeText={setTaskDate}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <Text style={[styles.label, { color: theme.sub }]}>
                  Detalhes
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Ex: Deixar secando no escorredor"
                  placeholderTextColor={theme.sub}
                  value={newObs}
                  onChangeText={setNewObs}
                />

                <Text style={[styles.label, { color: theme.sub }]}>
                  Prioridade (Obrigatório)
                </Text>
                <View
                  style={[
                    styles.priorityRow,
                    errorPriority && {
                      borderColor: "#FF5252",
                      borderWidth: 1.5,
                      borderRadius: 15,
                      padding: 5,
                      borderStyle: "dashed",
                    },
                  ]}
                >
                  {(["low", "medium", "high"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        {
                          borderColor: priorityColors[p],
                          backgroundColor:
                            newPriority === p
                              ? priorityColors[p]
                              : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setNewPriority(p);
                        if (errorPriority) setErrorPriority(false);
                      }}
                    >
                      <Text
                        style={{
                          color: newPriority === p ? "#fff" : priorityColors[p],
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {priorityLabels[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errorPriority && (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color="#FF5252"
                    />
                    <Text style={styles.errorText}>Selecione a urgência!</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleAddTask}
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                >
                  <Text
                    style={{
                      color: isFemale ? theme.text : "#fff",
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

      {/* MODAL 2: RESULTADO DO JUIZ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={judgeModalVisible}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalAlert,
              {
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: judgeResult?.color,
              },
            ]}
          >
            {judgeResult && (
              <>
                <FontAwesome5
                  name={judgeResult.icon}
                  size={50}
                  color={judgeResult.color}
                  style={{ marginBottom: 15 }}
                />
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: judgeResult.color,
                      marginBottom: 10,
                      fontSize: 24,
                    },
                  ]}
                >
                  {judgeResult.title}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    textAlign: "center",
                    fontSize: 16,
                    marginBottom: 25,
                    lineHeight: 24,
                  }}
                >
                  {judgeResult.message}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: judgeResult.color, width: "100%" },
                  ]}
                  onPress={() => setJudgeModalVisible(false)}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                    ENTENDIDO
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: FEEDBACK GENÉRICO */}
      <Modal animationType="fade" transparent={true} visible={feedbackVisible}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalAlert, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name={
                feedbackData.type === "error" ? "alert-circle" : "information"
              }
              size={50}
              color={feedbackData.type === "error" ? "#FF5252" : "#FFCA28"}
              style={{ marginBottom: 15 }}
            />
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text, marginBottom: 10 },
              ]}
            >
              {feedbackData.title}
            </Text>
            <Text
              style={{
                color: theme.text,
                textAlign: "center",
                fontSize: 15,
                marginBottom: 25,
              }}
            >
              {feedbackData.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: theme.primary, width: "100%" },
              ]}
              onPress={() => setFeedbackVisible(false)}
            >
              <Text
                style={{
                  color: isFemale ? theme.text : "#FFF",
                  fontWeight: "bold",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: PARABÉNS */}
      <Modal animationType="fade" transparent={true} visible={congratsVisible}>
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalAlert,
              {
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: theme.success,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="party-popper"
              size={60}
              color={theme.success}
              style={{ marginBottom: 10 }}
            />
            <Text
              style={[
                styles.modalTitle,
                { color: theme.success, marginBottom: 5 },
              ]}
            >
              Mandou Bem!
            </Text>
            <Text
              style={{
                color: theme.text,
                textAlign: "center",
                fontSize: 16,
                marginBottom: 20,
              }}
            >
              Tarefa concluída com sucesso!
            </Text>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: theme.success, width: "100%" },
              ]}
              onPress={() => setCongratsVisible(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: CONCLUIR COM FOTO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={finishModalVisible}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalAlert, { backgroundColor: theme.card }]}>
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text, marginBottom: 15 },
              ]}
            >
              Tarefa Realizada?
            </Text>
            {uploading ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: theme.bg }]}
                  onPress={() => pickImage("camera")}
                >
                  <Text style={{ color: theme.text, fontWeight: "bold" }}>
                    📸 Tirar Foto (Prova)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.primary, marginTop: 10 },
                  ]}
                  onPress={() =>
                    completeTaskWithPhoto(selectedTaskToFinish!, undefined)
                  }
                >
                  <Text
                    style={{
                      color: isFemale ? theme.text : "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    ✅ Concluir sem Foto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFinishModalVisible(false)}
                  style={{ marginTop: 20, alignItems: "center" }}
                >
                  <Text style={{ color: theme.sub }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 6: PREVIEW FOTO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={photoPreviewVisible}
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
            onPress={() => setPhotoPreviewVisible(false)}
          >
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
          {selectedPhotoToView && (
            <Image
              source={{ uri: selectedPhotoToView }}
              style={{ width: "90%", height: "70%", borderRadius: 20 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 0 }, // Zerei o padding para o slide pegar a largura toda
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
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  taskText: { fontSize: 16, fontWeight: "700", marginLeft: 15 },
  taskTextDone: { textDecorationLine: "line-through", opacity: 0.4 },
  fabBase: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: -10,
    gap: 5,
  },
  errorText: { color: "#FF5252", fontWeight: "bold", fontSize: 12 },
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
});
