import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 🚀 EXPORT CONST (Isso que evita o erro que você tomou)
export const NotificationService = {
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

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return undefined;

    token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  },

  // 🚀 Dispara a notificação via servidor da Expo (Obrigatório pra Play Store)
  sendPushNotification: async (
    expoPushToken: string,
    title: string,
    body: string,
  ) => {
    if (!expoPushToken) return;
    const message = {
      to: expoPushToken,
      sound: "default",
      title: title,
      body: body,
      data: { route: "app" },
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
      console.log("🔔 Notificação real enviada para:", expoPushToken);
    } catch (error) {
      console.log("Erro ao enviar Push:", error);
    }
  },

};

export const agendarLembretesAniversario = async (
  anniversaryDate: string,
  birthDate: string,
  status: "namorando" | "casados",
) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const hoje = new Date();

  const agendarAlerta = async (
    dataAlvo: Date,
    titulo: string,
    mensagem: string,
  ) => {
    if (dataAlvo.getTime() > hoje.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: mensagem, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dataAlvo,
        },
      });
    }
  };

  const tempos = [
    { dias: 30, desc: "1 mês" },
    { dias: 15, desc: "15 dias" },
    { dias: 7, desc: "1 semana" },
    { dias: 0, desc: "Hoje" },
  ];

  if (anniversaryDate && anniversaryDate.length === 10) {
    const [diaStr, mesStr, anoStr] = anniversaryDate.split("/");
    let proximoAniv = new Date(
      hoje.getFullYear(),
      parseInt(mesStr, 10) - 1,
      parseInt(diaStr, 10),
    );
    if (proximoAniv.getTime() < hoje.getTime())
      proximoAniv.setFullYear(hoje.getFullYear() + 1);

    const anosDeRelacao = proximoAniv.getFullYear() - parseInt(anoStr, 10);
    const tipoEvento = status === "casados" ? "casamento" : "namoro";

    for (const t of tempos) {
      const dataAlerta = new Date(proximoAniv);
      dataAlerta.setDate(dataAlerta.getDate() - t.dias);
      dataAlerta.setHours(10, 0, 0, 0);
      let titulo =
        t.dias === 0
          ? `🎉 Feliz Aniversário de ${tipoEvento}!`
          : `⏳ Lembrete: Aniversário de ${tipoEvento}!`;
      let mensagem =
        t.dias === 0
          ? `Hoje vocês celebram ${anosDeRelacao} anos juntos! Já preparou a surpresa? 🎁`
          : `Falta(m) ${t.desc} para vocês celebrarem ${anosDeRelacao} anos juntos!`;
      await agendarAlerta(dataAlerta, titulo, mensagem);
    }
  }

  if (birthDate && birthDate.length === 10) {
    const [diaStr, mesStr, anoStr] = birthDate.split("/");
    let proximoNiver = new Date(
      hoje.getFullYear(),
      parseInt(mesStr, 10) - 1,
      parseInt(diaStr, 10),
    );
    if (proximoNiver.getTime() < hoje.getTime())
      proximoNiver.setFullYear(hoje.getFullYear() + 1);
    const novaIdade = proximoNiver.getFullYear() - parseInt(anoStr, 10);

    for (const t of tempos) {
      const dataAlerta = new Date(proximoNiver);
      dataAlerta.setDate(dataAlerta.getDate() - t.dias);
      dataAlerta.setHours(10, 0, 0, 0);
      let titulo =
        t.dias === 0 ? `🎂 Feliz Aniversário!` : `⏳ Lembrete de Aniversário!`;
      let mensagem =
        t.dias === 0
          ? `Hoje você completa ${novaIdade} anos! Que seja um dia incrível! 🎉`
          : `Falta(m) ${t.desc} para o seu aniversário de ${novaIdade} anos!`;
      await agendarAlerta(dataAlerta, titulo, mensagem);
    }
  }
};
