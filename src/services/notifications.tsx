import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Configura como a notificação aparece quando o app está ABERTO
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,  
    shouldShowList: true,    
  }),
});

export const NotificationService = {
  // 1. Pede permissão e pega o Token do celular
  registerForPushNotificationsAsync: async () => {
    let token;

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
        return;
      }

      // Pega o Project ID do app.json/app.config.js automaticamente
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = pushTokenData.data;
        console.log("Meu Token de Notificação:", token);
      } catch (e) {
        console.log("Erro ao pegar token Expo:", e);
      }
    } else {
      console.log(
        "Notificações não funcionam em emuladores (use celular físico)."
      );
    }

    return token;
  },

  // 2. Envia a notificação para OUTRA pessoa
  sendPushNotification: async (
    expoPushToken: string,
    title: string,
    body: string
  ) => {
    const message = {
      to: expoPushToken,
      sound: "default",
      title: title,
      body: body,
      data: { someData: "goes here" },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  },
};
