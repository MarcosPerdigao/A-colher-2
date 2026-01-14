import { useState, useEffect } from "react"; // Removi useRef
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

  // Estados de Dados
  const [tasks, setTasks] = useState<TaskWithPhoto[]>([]);
  const [partnerName, setPartnerName] = useState("Parceiro");
  const [myNickname, setMyNickname] = useState("");

  // Estados de Controle Visual
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );
  const [uploading, setUploading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false); // <--- NOVO: Controla se o canhão existe ou não

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
    null
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
      const token =
        await NotificationService.registerForPushNotificationsAsync();
      const storedNickname = await AsyncStorage.getItem("@user_nickname");

      if (storedNickname) {
        setMyNickname(storedNickname);
        if (token) await TaskService.saveUserToken(token, storedNickname);
        const pNickname = await TaskService.getPartnerNickname(storedNickname);
        if (pNickname) setPartnerName(pNickname);
      }
    };
    setup();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const toggleModal = (modal: keyof typeof modals, value: boolean) => {
    setModals((prev) => ({ ...prev, [modal]: value }));
  };

  const showFeedback = (
    title: string,
    message: string,
    type: "success" | "warning" | "error"
  ) => {
    setFeedbackData({ title, message, type });
    toggleModal("feedback", true);
  };

  const handleAddTask = async (
    taskData: {
      title: string;
      obs: string;
      date: string;
      priority: "high" | "medium" | "low" | null;
      assignedTo: "me" | "partner" | "judge";
    },
    resetForm: () => void
  ) => {
    const { title, obs, date, priority, assignedTo } = taskData;

    let finalRecipient = assignedTo;
    let displayTitle = title;
    let notificationTitle = "Nova tarefa no Mural! 🥄";
    let notificationBody = `${myNickname} adicionou: ${title}`;
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
      displayTitle = `⚖️ [JUIZ] ${title}`;

      if (isMe) {
        setJudgeResult({
          title: "O JUIZ TE PEGOU! ⚖️",
          message: `Azar o seu, ${myNickname}! Essa tarefa é SUA.`,
          icon: "gavel",
          color: "#EF5350",
        });
        notificationTitle = "O JUIZ TE SALVOU! ⚖️ 🎉";
        notificationBody = `O juiz mandou o(a) ${myNickname} fazer: ${title}`;
      } else {
        setJudgeResult({
          title: "VITÓRIA! 🎉",
          message: `Boa! A tarefa ficou para o(a) ${partnerName}.`,
          icon: "trophy",
          color: theme.success,
        });
        notificationTitle = "VEREDITO DO JUIZ! ⚖️";
        notificationBody = `Sinto muito, ${partnerName}, você perdeu no sorteio: ${title}`;
      }
      toggleModal("judge", true);
    } else if (assignedTo === "me") {
      displayTitle = `👤 [EU] ${title}`;
    }

    const newTaskObj: TaskWithPhoto = {
      id: Date.now().toString(),
      title: displayTitle,
      completed: false,
      observation: obs,
      date: date,
      priority: priority!,
      assignedToNickname: assignedNickname,
    };

    await TaskService.add(newTaskObj);

    if (finalRecipient === "partner") {
      const token = await TaskService.getPartnerToken(myNickname);
      if (token)
        await NotificationService.sendPushNotification(
          token,
          notificationTitle,
          notificationBody
        );
    }

    toggleModal("new", false);
    resetForm();
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

      const token = await TaskService.getPartnerToken(myNickname);
      if (token)
        await NotificationService.sendPushNotification(
          token,
          "Tarefa Concluída! 🎉",
          `${myNickname} finalizou: ${task?.title}`
        );

      if (warning) showFeedback("Atenção", warning, "warning");
      else {
        toggleModal("congrats", true);
        checkStreak();
      }
    } catch (error) {
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

      // Se for múltiplo de 3, ativa os confetes!
      if (current % 3 === 0) {
        setTimeout(() => {
          setShowConfetti(true); // <--- Ativa o estado
        }, 500);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleTaskPress = (item: TaskWithPhoto) => {
    if (item.completed) {
      if (item.photo) {
        setSelectedPhotoToView(item.photo);
        toggleModal("preview", true);
      }
    } else {
      if (
        item.assignedToNickname &&
        item.assignedToNickname !== myNickname &&
        item.assignedToNickname !== "judge"
      ) {
        Vibration.vibrate();
        showFeedback(
          "Ei, espera!",
          `Essa tarefa é do(a) ${item.assignedToNickname}.`,
          "warning"
        );
        return;
      }
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
    judgeResult,
    showConfetti,
    setShowConfetti, // Exportando o controle de confete
    selectedPhotoToView,
    handleAddTask,
    handleTaskPress,
    pickImage,
    completeTask,
    pendingTasks: tasks.filter((t) => !t.completed),
    completedTasks: tasks.filter((t) => t.completed),
  };
}
