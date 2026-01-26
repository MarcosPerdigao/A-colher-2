import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// CONFIGURAÇÃO DO HANDLER
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 1. REGISTRO (Função Solta)
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token: string | undefined;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permissão de notificação negada!");
      return undefined;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      const response = await Notifications.getExpoPushTokenAsync({ projectId });
      token = response.data;
    } catch (error) {
      console.log("Erro ao pegar token:", error);
    }
  }

  // Salva o token no perfil do usuário no Firebase
  if (token) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid), {
        pushToken: token,
      });
    }
  }

  return token;
}

// 2. ENVIAR PUSH GENÉRICO
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: any = {},
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Erro ao enviar push:", error);
  }
}

// 3. NOTIFICAR O PARCEIRO (INTELIGENTE)
export async function notifyPartner(title: string, body: string) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const db = getFirestore();

    // A. Pega dados do usuário logado para ver o código do casal
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) return;
    const userData = userSnap.data();
    const coupleCode = userData.coupleCode;

    if (!coupleCode) return;

    // B. Pega dados do casal
    const coupleSnap = await getDoc(doc(db, "couples", coupleCode));
    if (!coupleSnap.exists()) return;

    const coupleData = coupleSnap.data();
    const members = coupleData.members || [];

    // C. Acha o ID do parceiro (quem NÃO é o usuário atual)
    const partnerId = members.find((id: string) => id !== user.uid);

    if (partnerId) {
      // D. Busca o token do parceiro
      const partnerSnap = await getDoc(doc(db, "users", partnerId));
      if (partnerSnap.exists()) {
        const partnerData = partnerSnap.data();
        const partnerToken = partnerData.pushToken;

        if (partnerToken) {
          await sendPushNotification(partnerToken, title, body);
        }
      }
    }
  } catch (error) {
    console.log("Erro ao tentar notificar parceiro:", error);
  }
}

// 4. AGENDAR LOCALMENTE
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: seconds,
      repeats: false,
    },
  });
}

// 5. CANCELAR TODAS
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Exportação unificada para facilitar
export const NotificationService = {
  registerForPushNotificationsAsync,
  sendPushNotification,
  notifyPartner, // <--- A estrela do show
  scheduleLocalNotification,
  cancelAllNotifications,
};
