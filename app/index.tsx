import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Share,
  Image,
} from "react-native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { AntDesign, MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

// --- TIPOS ---
type RootStackParamList = {
  Login: undefined;
  Setup: { userName: string }; // Tela intermediária para definir se cria ou entra
  Home: { userName: string; coupleCode: string };
  Mural: undefined;
};

type PriorityLevel = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  observation: string;
  priority: PriorityLevel;
};

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;
type SetupScreenProps = NativeStackScreenProps<RootStackParamList, "Setup">;
type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;
type MuralScreenProps = NativeStackScreenProps<RootStackParamList, "Mural">;

// ==============================================================================
// 1. TELA DE LOGIN (LIMPA COM GOOGLE)
// ==============================================================================
function LoginScreen({ navigation }: LoginScreenProps) {
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const savedName = await AsyncStorage.getItem("@user_name");
      const savedCode = await AsyncStorage.getItem("@couple_code");

      if (savedName && savedCode) {
        navigation.replace("Home", {
          userName: savedName,
          coupleCode: savedCode,
        });
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    // SIMULAÇÃO: Aqui entraria a chamada await GoogleSignin.signIn();
    setTimeout(async () => {
      // Supondo que o Google retornou "Marcos"
      const googleUser = "Marcos";
      await AsyncStorage.setItem("@user_name", googleUser);

      setAuthLoading(false);
      // Manda para a configuração (decidir se cria ou entra em casal)
      navigation.replace("Setup", { userName: googleUser });
    }, 1500);
  };

  if (loading)
    return (
      <ActivityIndicator size="large" color="#FF69B4" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.loginContainer}>
      <View style={{ alignItems: "center", marginBottom: 60 }}>
        {/* Ícone Simples do App */}
        <View style={styles.logoCircle}>
          <Text style={{ fontSize: 40 }}>🥄</Text>
        </View>
        <Text style={styles.loginTitle}>Meter a Colher</Text>
        <Text style={styles.loginSubtitle}>
          Organize a vida a dois sem tretas.
        </Text>
      </View>

      {authLoading ? (
        <ActivityIndicator size="small" color="#DB4437" />
      ) : (
        <TouchableOpacity
          style={styles.googleButtonBig}
          onPress={handleGoogleLogin}
        >
          <AntDesign
            name="google"
            size={24}
            color="white"
            style={{ marginRight: 15 }}
          />
          <Text style={styles.googleButtonText}>Continuar com Google</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.termsText}>
        Ao entrar, você concorda em lavar a louça se perder no sorteio.
      </Text>
    </View>
  );
}

// ==============================================================================
// 1.5 TELA DE SETUP (CRIAR OU ENTRAR)
// ==============================================================================
function SetupScreen({ route, navigation }: SetupScreenProps) {
  const { userName } = route.params;
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [inputCode, setInputCode] = useState("");

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "#";
    for (let i = 0; i < 4; i++)
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleCreateNew = async () => {
    const newCode = generateCode();
    await AsyncStorage.setItem("@couple_code", newCode);
    navigation.replace("Home", { userName, coupleCode: newCode });
  };

  const handleJoinExisting = async () => {
    if (inputCode.length < 5)
      return Alert.alert(
        "Código Inválido",
        "O código precisa ter 5 caracteres (ex: #A1B2)"
      );
    await AsyncStorage.setItem("@couple_code", inputCode.toUpperCase());
    navigation.replace("Home", {
      userName,
      coupleCode: inputCode.toUpperCase(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.setupTitle}>Olá, {userName}! 👋</Text>

      {mode === "choice" ? (
        <>
          <Text style={styles.setupSubtitle}>
            Como você quer conectar com seu amor?
          </Text>

          <TouchableOpacity style={styles.cardChoice} onPress={handleCreateNew}>
            <View style={styles.iconBg}>
              <AntDesign name="heart" size={24} color="#FF69B4" />
            </View>
            <View>
              <Text style={styles.choiceTitle}>Criar Novo Casal</Text>
              <Text style={styles.choiceDesc}>
                Vou gerar um código para você compartilhar.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardChoice}
            onPress={() => setMode("join")}
          >
            <View style={[styles.iconBg, { backgroundColor: "#E6E6FA" }]}>
              <AntDesign name="link" size={24} color="#4682B4" />
            </View>
            <View>
              <Text style={styles.choiceTitle}>Já tenho um código</Text>
              <Text style={styles.choiceDesc}>
                Meu par já criou a conta e me passou o ID.
              </Text>
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.setupSubtitle}>
            Digite o código que você recebeu:
          </Text>
          <TextInput
            style={styles.codeInput}
            placeholder="#XY99"
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
            maxLength={5}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4682B4" }]}
            onPress={handleJoinExisting}
          >
            <Text style={styles.buttonText}>Vincular e Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("choice")}
            style={{ marginTop: 20, alignItems: "center" }}
          >
            <Text style={{ color: "#999" }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ==============================================================================
// 2. TELA PRINCIPAL (HOME) - COM COMPARTILHAMENTO
// ==============================================================================
function HomeScreen({ route, navigation }: HomeScreenProps) {
  const { userName, coupleCode } = route.params;
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const getCount = async () => {
        const stored = await AsyncStorage.getItem("@tasks_list");
        if (stored) {
          const tasks: Task[] = JSON.parse(stored);
          setPendingCount(tasks.filter((t) => !t.completed).length);
        }
      };
      getCount();
    }, [])
  );

  // --- FUNÇÃO DE COMPARTILHAR ---
  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Amor, instalei o nosso app "Meter a Colher"! 🥄\n\nBaixa aí e usa nosso código de vinculação: *${coupleCode}*\n\nVamos organizar essa bagunça! ❤️`,
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível compartilhar.");
    }
  };

  const handleSortear = () => {
    const options = ["Você!", "Seu Amor!"];
    Alert.alert(
      "O Juiz decidiu:",
      `Quem vai fazer é: ${
        options[Math.floor(Math.random() * options.length)]
      } ⚖️`
    );
  };

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja desconectar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        onPress: () => {
          AsyncStorage.clear();
          navigation.replace("Login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Olá, {userName}!</Text>
          <Text style={styles.subtitle}>Vamos meter a colher?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={{ padding: 5 }}>
          <MaterialIcons name="logout" size={24} color="#d9534f" />
        </TouchableOpacity>
      </View>

      {/* ÁREA DO CÓDIGO COMPARTILHÁVEL */}
      <TouchableOpacity style={styles.codeContainer} onPress={handleShareCode}>
        <View>
          <Text style={styles.codeLabel}>Nosso Código de Casal</Text>
          <Text style={styles.codeValue}>{coupleCode}</Text>
        </View>
        <View style={styles.shareIconBtn}>
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareText}>Enviar</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate("Mural")}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="dashboard" size={32} color="#4682B4" />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.menuCardTitle}>Mural da Discórdia</Text>
                <Text style={styles.menuCardSubtitle}>
                  {pendingCount > 0
                    ? `${pendingCount} tretas pendentes`
                    : "Tudo em paz"}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: "#FFF0F5",
              borderColor: "#FFB6C1",
              marginTop: 20,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { marginBottom: 5 }]}>⚖️ O Juiz</Text>
          <Text style={{ color: "#555", marginBottom: 15 }}>
            Impasse? Deixe o app decidir.
          </Text>
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: "#FF69B4" }]}
            onPress={handleSortear}
          >
            <Text style={styles.smallButtonText}>Sortear Responsável</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ==============================================================================
// 3. TELA DO MURAL (FUNCIONALIDADES MANTIDAS)
// ==============================================================================
function MuralScreen({ navigation }: MuralScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );
  const [modalVisible, setModalVisible] = useState(false);

  const [newTask, setNewTask] = useState("");
  const [newObs, setNewObs] = useState("");
  const [newDate, setNewDate] = useState("Hoje");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("medium");

  useEffect(() => {
    loadTasks();
  }, []);
  useEffect(() => {
    saveTasks();
  }, [tasks]);

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem("@tasks_list");
      if (stored) {
        const parsed: any[] = JSON.parse(stored);
        const normalized = parsed.map((t) => ({
          ...t,
          completed: t.completed ?? false,
          priority: t.priority ?? "medium",
          date: t.date ?? "Sem data",
          observation: t.observation ?? "",
        }));
        setTasks(normalized);
      }
    } catch (e) {}
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem("@tasks_list", JSON.stringify(tasks));
    } catch (e) {}
  };

  const handleAddTask = () => {
    if (newTask.trim() === "") return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      observation: newObs,
      date: newDate,
      priority: newPriority,
    };
    setTasks([...tasks, task]);
    resetModal();
    setModalVisible(false);
    setActiveTab("pending");
  };

  const resetModal = () => {
    setNewTask("");
    setNewObs("");
    setNewDate("Hoje");
    setNewPriority("medium");
  };
  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };
  const deleteTask = (id: string) => {
    Alert.alert("Excluir", "Apagar para sempre?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sim",
        style: "destructive",
        onPress: () => setTasks(tasks.filter((t) => t.id !== id)),
      },
    ]);
  };

  const PriorityBadge = ({ level }: { level: PriorityLevel }) => {
    let color, text;
    switch (level) {
      case "high":
        color = "#FF4500";
        text = "Pra Ontem!";
        break;
      case "medium":
        color = "#FFA500";
        text = "Atenção";
        break;
      case "low":
        color = "#2E8B57";
        text = "Suave";
        break;
    }
    return (
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
          marginRight: 8,
        }}
      >
        <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
          {text}
        </Text>
      </View>
    );
  };

  const filteredTasks = tasks.filter((t) =>
    activeTab === "pending" ? !t.completed : t.completed
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { marginBottom: 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={{ marginLeft: 5, fontSize: 16, color: "#333" }}>
            Voltar
          </Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: "bold", fontSize: 18 }}>Mural</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "pending" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pendentes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "completed" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            Concluídas
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="playlist-add" size={60} color="#ddd" />
            <Text style={styles.emptyTitle}>Mural Vazio</Text>
            <Text style={styles.emptySubtitle}>
              Adicione a primeira tarefa com data e prioridade!
            </Text>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.bigAddButtonText}>+ Adicionar Tarefa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filteredTasks.length === 0 ? (
              <View style={{ marginTop: 50, alignItems: "center" }}>
                <Text style={{ color: "#999" }}>
                  {activeTab === "pending"
                    ? "Tudo feito! 🎉"
                    : "Histórico vazio."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredTasks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.taskCard}
                    onPress={() => toggleTask(item.id)}
                    onLongPress={() => deleteTask(item.id)}
                  >
                    <MaterialIcons
                      name={
                        item.completed ? "check-box" : "check-box-outline-blank"
                      }
                      size={24}
                      color={item.completed ? "green" : "#666"}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        {!item.completed && (
                          <PriorityBadge level={item.priority} />
                        )}
                        <Text
                          style={[
                            styles.taskText,
                            item.completed && styles.taskTextDone,
                            { flex: 1 },
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginRight: 15,
                          }}
                        >
                          <AntDesign name="calendar" size={12} color="#999" />
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#999",
                              marginLeft: 4,
                            }}
                          >
                            {item.date}
                          </Text>
                        </View>
                        {item.observation ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <MaterialIcons
                              name="notes"
                              size={12}
                              color="#999"
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#999",
                                marginLeft: 4,
                              }}
                              numberOfLines={1}
                            >
                              {item.observation}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setModalVisible(true)}
            >
              <AntDesign name="plus" size={24} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Nova Tarefa</Text>
            <Text style={styles.label}>O que fazer?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ir no supermercado"
              value={newTask}
              onChangeText={setNewTask}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Observação</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: "top" }]}
              placeholder="Ex: Não esquecer o cartão"
              value={newObs}
              onChangeText={setNewObs}
              multiline={true}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Para quando?</Text>
            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              {["Hoje", "Amanhã", "Sem Data"].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.optionBtn,
                    newDate === d && styles.optionBtnSelected,
                  ]}
                  onPress={() => setNewDate(d)}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      newDate === d && styles.optionBtnTextSelected,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 5 }]}>Prioridade</Text>
            <View style={{ flexDirection: "row", marginBottom: 20 }}>
              <TouchableOpacity
                style={[
                  styles.priorityBtn,
                  {
                    borderColor: "#2E8B57",
                    backgroundColor:
                      newPriority === "low" ? "#2E8B57" : "transparent",
                  },
                ]}
                onPress={() => setNewPriority("low")}
              >
                <Text
                  style={{
                    color: newPriority === "low" ? "white" : "#2E8B57",
                    fontWeight: "bold",
                  }}
                >
                  Suave
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityBtn,
                  {
                    borderColor: "#FFA500",
                    backgroundColor:
                      newPriority === "medium" ? "#FFA500" : "transparent",
                  },
                ]}
                onPress={() => setNewPriority("medium")}
              >
                <Text
                  style={{
                    color: newPriority === "medium" ? "white" : "#FFA500",
                    fontWeight: "bold",
                  }}
                >
                  Atenção
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityBtn,
                  {
                    borderColor: "#FF4500",
                    backgroundColor:
                      newPriority === "high" ? "#FF4500" : "transparent",
                  },
                ]}
                onPress={() => setNewPriority("high")}
              >
                <Text
                  style={{
                    color: newPriority === "high" ? "white" : "#FF4500",
                    fontWeight: "bold",
                  }}
                >
                  Pra Ontem!
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "#ccc", flex: 1, marginRight: 10 },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#4682B4", flex: 1 }]}
                onPress={handleAddTask}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Mural" component={MuralScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },
  subtitle: { fontSize: 14, color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#333",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Login e Setup
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  loginSubtitle: { fontSize: 16, color: "#666", textAlign: "center" },
  googleButtonBig: {
    flexDirection: "row",
    backgroundColor: "#DB4437",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  termsText: {
    marginTop: 30,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  setupTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  setupSubtitle: { fontSize: 18, color: "#666", marginBottom: 30 },
  cardChoice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  choiceTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  choiceDesc: { fontSize: 14, color: "#666", width: 220 },
  codeInput: {
    borderWidth: 2,
    borderColor: "#4682B4",
    padding: 15,
    borderRadius: 10,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 5,
    fontWeight: "bold",
    marginBottom: 20,
  },

  // Home Code Share
  codeContainer: {
    backgroundColor: "#4682B4",
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    elevation: 5,
  },
  codeLabel: { color: "#dbeafe", fontSize: 12, marginBottom: 5 },
  codeValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  shareIconBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 10,
  },
  shareText: { color: "#fff", fontSize: 10, marginTop: 3 },

  // Cards & Mural (Estilos Mantidos)
  menuCard: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#B0C4DE",
    elevation: 2,
  },
  menuCardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  menuCardSubtitle: { fontSize: 14, color: "#666", marginTop: 2 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  smallButton: {
    backgroundColor: "#4682B4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  smallButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  content: { flex: 1, paddingTop: 10 },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 15,
  },
  tabButton: { flex: 1, alignItems: "center", paddingBottom: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#4682B4" },
  tabText: { fontSize: 16, color: "#999", fontWeight: "600" },
  activeTabText: { color: "#4682B4" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  taskText: { fontSize: 16, color: "#333", fontWeight: "500" },
  taskTextDone: { textDecorationLine: "line-through", color: "#aaa" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 5,
    paddingHorizontal: 40,
  },
  bigAddButton: {
    marginTop: 20,
    backgroundColor: "#4682B4",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  bigAddButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#4682B4",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  label: { fontWeight: "600", marginBottom: 5, color: "#333", fontSize: 14 },
  optionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  optionBtnSelected: { backgroundColor: "#333", borderColor: "#333" },
  optionBtnText: { color: "#666", fontSize: 12 },
  optionBtnTextSelected: { color: "#fff", fontWeight: "bold" },
  priorityBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 5,
  },
});
