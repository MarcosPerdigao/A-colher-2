import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { MaterialIcons, AntDesign, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage"; // <--- Importado

import { TaskService, Task } from "../src/services/tasks";
import { NotificationService } from "../src/services/notifications"; // <--- Importado

interface TaskWithPhoto extends Task {
  photo?: string;
}

export default function MuralScreen() {
  const { sexo } = useLocalSearchParams();
  const isFemale = sexo === "feminino";
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<TaskWithPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );

  // Modais
  const [modalVisible, setModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);

  // Estados de Controle
  const [uploading, setUploading] = useState(false);
  const [selectedTaskToFinish, setSelectedTaskToFinish] = useState<
    string | null
  >(null);
  const [selectedPhotoToView, setSelectedPhotoToView] = useState<string | null>(
    null
  );

  // Formulário
  const [newTask, setNewTask] = useState("");
  const [newObs, setNewObs] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">(
    "medium"
  );

  const theme = isFemale
    ? {
        bg: "#FFF5F7",
        primary: "#FFD1DC",
        accent: "#B2E2F2",
        card: "#FFFFFF",
        text: "#5D4037",
        sub: "#A1887F",
        border: "#FFECF1",
      }
    : {
        bg: "#121212",
        primary: "#37474F",
        accent: "#546E7A",
        card: "#1E1E1E",
        text: "#ECEFF1",
        sub: "#90A4AE",
        border: "#333",
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

  // 1. SETUP INICIAL: Escuta Tarefas + Registra Notificação
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      // A. Liga o Tempo Real das Tarefas
      unsubscribe = await TaskService.listen((updatedTasks) => {
        setTasks(updatedTasks);
      });

      // B. Registra Notificações (Pede permissão e salva token)
      const token =
        await NotificationService.registerForPushNotificationsAsync();
      const myName = await AsyncStorage.getItem("@user_name");

      if (token && myName) {
        await TaskService.saveUserToken(token, myName);
      }
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const pickImage = async (source: "camera" | "gallery") => {
    let result;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Precisamos da câmera para provar que você fez a tarefa!"
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.5,
      });
    }

    if (!result.canceled && selectedTaskToFinish) {
      completeTaskWithPhoto(selectedTaskToFinish, result.assets[0].uri);
    }
  };

  const completeTaskWithPhoto = async (id: string, localUri?: string) => {
    setUploading(true);

    let publicPhotoUrl = null;

    if (localUri) {
      const uploadedUrl = await TaskService.uploadImage(localUri);
      if (uploadedUrl) {
        publicPhotoUrl = uploadedUrl;
      } else {
        Alert.alert(
          "Aviso",
          "Erro ao subir a foto, mas a tarefa será concluída."
        );
      }
    }

    await TaskService.update(id, {
      completed: true,
      photo: publicPhotoUrl || undefined,
    });

    setUploading(false);
    setFinishModalVisible(false);
    setSelectedTaskToFinish(null);
  };

  const onTaskClick = (task: TaskWithPhoto) => {
    if (task.completed) {
      if (task.photo) {
        setSelectedPhotoToView(task.photo);
        setPhotoPreviewVisible(true);
      } else {
        handleToggleTask(task.id);
      }
    } else {
      setSelectedTaskToFinish(task.id);
      setFinishModalVisible(true);
    }
  };

  const handleToggleTask = async (id: string) => {
    await TaskService.toggle(tasks, id);
  };

  const handleDateChange = (text: string) => {
    let v = text.replace(/\D/g, "");
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, "$1/$2");
    if (v.length > 5) v = v.replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
    if (v.length > 10) v = v.substring(0, 10);
    setTaskDate(v);
  };

  const handleAddTask = async () => {
    if (newTask.trim() === "") return;
    const finalDate = taskDate.trim()
      ? taskDate
      : new Date().toLocaleDateString("pt-BR");
    const task: TaskWithPhoto = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      observation: newObs,
      date: finalDate,
      priority: newPriority,
    };

    // 1. Salva a tarefa
    await TaskService.add(tasks, task);

    // 2. Tenta enviar notificação para o parceiro
    const myName = await AsyncStorage.getItem("@user_name");
    if (myName) {
      const partnerToken = await TaskService.getPartnerToken(myName);
      if (partnerToken) {
        await NotificationService.sendPushNotification(
          partnerToken,
          "Nova Treta no Mural! 🥄",
          `${myName} adicionou: ${newTask}`
        );
      }
    }

    setNewTask("");
    setNewObs("");
    setTaskDate("");
    setNewPriority("medium");
    setModalVisible(false);
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert("Excluir", "Apagar essa tarefa para sempre?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await TaskService.delete(tasks, id);
        },
      },
    ]);
  };

  const filteredTasks = tasks.filter((t) =>
    activeTab === "pending" ? !t.completed : t.completed
  );

  const isListFull = filteredTasks.length > 5;
  const showAddButton = activeTab === "pending";

  const AddButton = ({ isFixed }: { isFixed: boolean }) => (
    <TouchableOpacity
      style={[
        styles.fabBase,
        { backgroundColor: theme.primary },
        isFixed
          ? { position: "absolute", bottom: 40 + insets.bottom, right: 20 }
          : {
              alignSelf: "flex-end",
              marginTop: 10,
              marginRight: 10,
              marginBottom: 40,
            },
      ]}
      onPress={() => setModalVisible(true)}
    >
      <AntDesign name="plus" size={30} color={isFemale ? theme.text : "#fff"} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      <View style={[styles.headerRow, { marginTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Mural da Discórdia
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
          onPress={() => setActiveTab("pending")}
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
          onPress={() => setActiveTab("completed")}
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

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: isListFull ? 120 : 20 }}
        ListEmptyComponent={
          <View
            style={{ alignItems: "center", marginTop: 50, marginBottom: 50 }}
          >
            <MaterialIcons
              name="assignment-turned-in"
              size={60}
              color={theme.primary + "80"}
            />
            <Text style={{ color: theme.sub, marginTop: 10 }}>
              {activeTab === "pending"
                ? "Tudo limpo por aqui!"
                : "Nenhuma tarefa concluída ainda."}
            </Text>
          </View>
        }
        ListFooterComponent={
          !isListFull && showAddButton ? <AddButton isFixed={false} /> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.taskCard,
              {
                backgroundColor: theme.card,
                borderLeftColor: priorityColors[item.priority || "medium"],
                borderLeftWidth: 6,
              },
            ]}
            onPress={() => onTaskClick(item)}
            onLongPress={() => handleDeleteTask(item.id)}
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
              {(item.observation || item.date) && (
                <Text
                  style={{
                    color: theme.sub,
                    fontSize: 12,
                    marginLeft: 15,
                    marginTop: 4,
                  }}
                >
                  {item.date} {item.observation ? `• ${item.observation}` : ""}
                </Text>
              )}
            </View>

            {item.photo ? (
              <Image
                source={{ uri: item.photo }}
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 10,
                  marginLeft: 10,
                }}
              />
            ) : (
              <MaterialIcons
                name={item.completed ? "check-circle" : "panorama-fish-eye"}
                size={28}
                color={item.completed ? "#81C784" : theme.sub}
              />
            )}
          </TouchableOpacity>
        )}
      />

      {isListFull && showAddButton && <AddButton isFixed={true} />}

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
                  O que precisa ser feito?
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
                  placeholder="Ex: Pagar a internet"
                  placeholderTextColor={theme.sub}
                  value={newTask}
                  onChangeText={setNewTask}
                />

                <Text style={[styles.label, { color: theme.sub }]}>
                  Quando? (Opcional)
                </Text>
                <View
                  style={[
                    styles.dateInputContainer,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                  ]}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={theme.sub}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: theme.text,
                      fontSize: 16,
                      height: "100%",
                    }}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={theme.sub}
                    value={taskDate}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <Text style={[styles.label, { color: theme.sub }]}>
                  Detalhes (Opcional)
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
                  placeholder="Ex: Vence dia 10"
                  placeholderTextColor={theme.sub}
                  value={newObs}
                  onChangeText={setNewObs}
                />

                <Text style={[styles.label, { color: theme.sub }]}>
                  Prioridade
                </Text>
                <View style={styles.priorityRow}>
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
                      onPress={() => setNewPriority(p)}
                    >
                      <Text
                        style={{
                          color:
                            newPriority === p
                              ? p === "medium"
                                ? "#3E2723"
                                : "#FFF"
                              : priorityColors[p],
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {priorityLabels[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                    Criar Tarefa
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: CONCLUIR COM FOTO */}
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
                { color: theme.text, textAlign: "center" },
              ]}
            >
              Tarefa Realizada? 🎉
            </Text>
            <Text
              style={{
                color: theme.sub,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Deseja anexar uma prova do crime?
            </Text>

            {uploading ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text
                  style={{
                    marginTop: 10,
                    color: theme.text,
                    fontWeight: "bold",
                  }}
                >
                  Enviando foto...
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: theme.bg }]}
                  onPress={() => pickImage("camera")}
                >
                  <Ionicons name="camera" size={24} color={theme.text} />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    Tirar Foto Agora
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: theme.bg }]}
                  onPress={() => pickImage("gallery")}
                >
                  <Ionicons name="images" size={24} color={theme.text} />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    Escolher da Galeria
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: theme.primary }]}
                  onPress={() =>
                    completeTaskWithPhoto(selectedTaskToFinish!, undefined)
                  }
                >
                  <MaterialIcons
                    name="check"
                    size={24}
                    color={isFemale ? theme.text : "#fff"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isFemale ? theme.text : "#fff",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    Concluir sem foto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 15 }}
                  onPress={() => setFinishModalVisible(false)}
                >
                  <Text style={{ color: theme.sub }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: VER FOTO GRANDE */}
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
            style={{ position: "absolute", top: 50, right: 30, zIndex: 10 }}
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
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "900" },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 6,
    marginBottom: 20,
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
    justifyContent: "space-between",
    padding: 20,
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
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
    width: "100%",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    width: "100%",
    marginBottom: 10,
    gap: 15,
  },
  optionText: { fontSize: 16 },
  modalView: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    paddingBottom: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 20,
  },
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },
});
