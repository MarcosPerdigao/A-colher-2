import { useState, useEffect } from "react";
import { Vibration } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { TaskService, Task } from "../services/tasks";
import { NotificationService } from "../services/notifications";

export interface TaskWithPhoto extends Task {
  photo?: string;
}

export function useMural(sexo: string | string[] | undefined) {
  const isFemale = sexo === "feminino";

  const [tasks, setTasks] = useState<TaskWithPhoto[]>([]);
  const [partnerName, setPartnerName] = useState("Parceira(o)");
  const [myNickname, setMyNickname] = useState("");

  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending",
  );
  const [uploading, setUploading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [modals, setModals] = useState({
    new: false,
    finish: false,
    preview: false,
    judge: false,
    congrats: false,
    feedback: false,
  });

  const [feedbackData, setFeedbackData] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "warning" | "error",
  });

  const [judgeResult, setJudgeResult] = useState<{
    title: string;
    message: string;
    icon: string;
    color: string;
  } | null>(null);
  const [selectedTaskToFinish, setSelectedTaskToFinish] = useState<
    string | null
  >(null);
  const [selectedPhotoToView, setSelectedPhotoToView] = useState<string | null>(
    null,
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

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const setup = async () => {
      unsubscribe = await TaskService.listen(setTasks);
      const storedNickname = await AsyncStorage.getItem("@user_nickname");
      if (storedNickname) {
        setMyNickname(storedNickname);
        const pNickname = await TaskService.getPartnerNickname();
        if (pNickname) setPartnerName(pNickname);
      }
    };
    setup();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const removeTaskFromState = (taskId: string) =>
    setTasks((currentTasks) => currentTasks.filter((t) => t.id !== taskId));
  const updateTaskInState = (taskId: string, newData: Partial<TaskWithPhoto>) =>
    setTasks((currentTasks) =>
      currentTasks.map((t) => (t.id === taskId ? { ...t, ...newData } : t)),
    );
  const toggleModal = (modal: keyof typeof modals, value: boolean) =>
    setModals((prev) => ({ ...prev, [modal]: value }));

  const showFeedback = (
    title: string,
    message: string,
    type: "success" | "warning" | "error",
  ) => {
    if (type === "warning" || type === "error") Vibration.vibrate();
    setFeedbackData({ title, message, type });
    toggleModal("feedback", true);
  };

  const handleAddTask = async (
    taskData: {
      title: string;
      obs: string;
      date: string;
      priority: "high" | "medium" | "low" | undefined;
      assignedTo: "me" | "partner" | "judge";
    },
    resetForm: () => void,
  ) => {
    const { title, obs, date, priority, assignedTo } = taskData;
    let finalRecipient = assignedTo;
    let displayTitle = title;
    let assignedNickname =
      assignedTo === "me"
        ? myNickname
        : assignedTo === "partner"
          ? partnerName
          : "judge";

    if (assignedTo === "judge") {
      const isMe = Math.random() > 0.5;
      finalRecipient = isMe ? "me" : "partner";
      assignedNickname = isMe ? myNickname : partnerName;

      if (isMe) {
        setJudgeResult({
          title: "O JUIZ TE PEGOU! ⚖️",
          message: `Azar o seu, ${myNickname}! Essa tarefa é SUA.`,
          icon: "gavel",
          color: "#EF5350",
        });
      } else {
        setJudgeResult({
          title: "VITÓRIA! 🎉",
          message: `Boa! A tarefa ficou para o(a) ${partnerName}.`,
          icon: "trophy",
          color: theme.success,
        });
      }
      toggleModal("judge", true);
    }

    const newTaskObj: TaskWithPhoto = {
      id: Date.now().toString(),
      title: displayTitle,
      completed: false,
      observation: obs,
      date: date,
      priority: priority,
      assignedToNickname: assignedNickname,
      createdAt: new Date().toISOString(),
      createdBy: assignedTo === "judge" ? "Juiz" : myNickname,
    };

    await TaskService.add(newTaskObj);
    toggleModal("new", false);
    resetForm();

    // 🚀 O CÉREBRO DA NOTIFICAÇÃO: Avalia o resultado final do Juiz e envia
    const pToken = await TaskService.getPartnerToken();
    if (pToken) {
      if (assignedTo === "partner") {
        await NotificationService.sendPushNotification(
          pToken,
          "Nova Missão! 🥄",
          `${myNickname} designou uma tarefa para você: ${title}`,
        );
      } else if (assignedTo === "judge") {
        if (finalRecipient === "me") {
          // O juiz te ferrou. Avisamos a parceira que você se deu mal.
          await NotificationService.sendPushNotification(
            pToken,
            "⚖️ O Juiz Decidiu!",
            `A tarefa '${title}' sobrou para o(a) ${myNickname}!`,
          );
        } else {
          // O juiz ferrou a parceira. Avisamos a ela que ela se deu mal.
          await NotificationService.sendPushNotification(
            pToken,
            "⚖️ O Juiz te pegou!",
            `Azar o seu! A tarefa '${title}' caiu para você.`,
          );
        }
      }
    }
  };

  const completeTask = async (localUri?: string) => {
    if (!selectedTaskToFinish) return;
    setUploading(true);
    try {
      const task = tasks.find((t) => t.id === selectedTaskToFinish);
      let publicPhotoUrl = null;
      let warning = "";

      if (localUri) {
        publicPhotoUrl = await TaskService.uploadImage(localUri);
        if (!publicPhotoUrl)
          warning = "A foto não subiu, mas a tarefa foi concluída!";
      }

      const updates: any = {
        completed: true,
        completedByNickname: myNickname,
        completedAt: new Date().toISOString(),
      };
      if (publicPhotoUrl) updates.photo = publicPhotoUrl;

      await TaskService.update(selectedTaskToFinish, updates);
      updateTaskInState(selectedTaskToFinish, updates);

      // 🚀 Só avisa se você completou uma tarefa.
      const pToken = await TaskService.getPartnerToken();
      if (pToken)
        await NotificationService.sendPushNotification(
          pToken,
          "Tarefa Concluída! 🎉",
          `${myNickname} finalizou: ${task?.title}`,
        );

      if (warning) showFeedback("Atenção", warning, "warning");
      else {
        toggleModal("congrats", true);
        checkStreak();
      }
    } catch {
      showFeedback("Erro", "Falha ao concluir tarefa.", "error");
    } finally {
      setUploading(false);
      toggleModal("finish", false);
      setSelectedTaskToFinish(null);
    }
  };

  const checkStreak = async () => {
    try {
      const current =
        parseInt((await AsyncStorage.getItem("@task_streak")) || "0") + 1;
      await AsyncStorage.setItem("@task_streak", current.toString());
      if (current % 3 === 0)
        setTimeout(() => {
          setShowConfetti(true);
        }, 500);
    } catch (error) {
      console.error("Erro ao atualizar sequência de tarefas:", error);
    }
  };

  const handleTaskPress = (item: TaskWithPhoto) => {
    if (item.completed) {
      if (item.photo) {
        setSelectedPhotoToView(item.photo);
        toggleModal("preview", true);
      }
    } else {
      setSelectedTaskToFinish(item.id);
      toggleModal("finish", true);
    }
  };

  const pickImage = async (source: "camera" | "gallery") => {
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.5,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) completeTask(result.assets[0].uri);
  };

  return {
    isFemale,
    theme,
    tasks,
    partnerName,
    myNickname,
    activeTab,
    setActiveTab,
    uploading,
    modals,
    toggleModal,
    feedbackData,
    showFeedback,
    judgeResult,
    showConfetti,
    setShowConfetti,
    selectedPhotoToView,
    handleAddTask,
    handleTaskPress,
    pickImage,
    completeTask,
    removeTaskFromState,
    updateTaskInState,
    pendingTasks: tasks.filter((t) => !t.completed),
    completedTasks: tasks.filter((t) => t.completed),
  };
}
