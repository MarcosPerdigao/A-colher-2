import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

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

      console.log("🔔 Token gerado:", token);
    } catch (error) {
      console.log("Erro ao pegar token:", error);
    }
  } else {
    console.log("Use dispositivo físico para Push");
  }

  return token;
}

// 2. ENVIAR PUSH (Função Solta)
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
    console.log("🚀 Notificação enviada para:", expoPushToken);
  } catch (error) {
    console.error("Erro ao enviar push:", error);
  }
}

// 3. AGENDAR LOCALMENTE (Função Solta)
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

// 4. CANCELAR TODAS (Função Solta)
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// --- A CORREÇÃO MÁGICA ---
// Exportamos também um Objeto agrupando tudo, para satisfazer o useMural.ts
export const NotificationService = {
  registerForPushNotificationsAsync,
  sendPushNotification,
  scheduleLocalNotification,
  cancelAllNotifications,
};
