import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configuração do comportamento das notificações no app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- O SERVIÇO DE NOTIFICAÇÕES ---
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
    if (finalStatus !== "granted") {
      return undefined;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  },

  notifyPartner: async (title: string, message: string) => {
    try {
      console.log("🔔 Simulando envio para o parceiro:", title, message);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          sound: true,
        },
        trigger: null, // null faz a notificação disparar imediatamente
      });
    } catch (error) {
      console.log("Erro ao enviar notificação ao parceiro:", error);
    }
  },
};

// --- O MOTOR DE LEMBRETES DE ANIVERSÁRIO E IDADE ---
export const agendarLembretesAniversario = async (
  anniversaryDate: string,
  birthDate: string,
  status: "namorando" | "casados",
) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hoje = new Date();

  // Função auxiliar para agendar notificações
  const agendarAlerta = async (
    dataAlvo: Date,
    titulo: string,
    mensagem: string,
  ) => {
    if (dataAlvo.getTime() > hoje.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: mensagem, sound: true },
        // 🛡️ CORREÇÃO: O Expo 52+ exige o type explícito no trigger
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

  // --- LÓGICA DE ANIVERSÁRIO DE RELACIONAMENTO ---
  if (anniversaryDate && anniversaryDate.length === 10) {
    const [diaStr, mesStr, anoStr] = anniversaryDate.split("/");
    let proximoAniv = new Date(
      hoje.getFullYear(),
      parseInt(mesStr, 10) - 1,
      parseInt(diaStr, 10),
    );

    if (proximoAniv.getTime() < hoje.getTime()) {
      proximoAniv.setFullYear(hoje.getFullYear() + 1);
    }

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

  // --- LÓGICA DE ANIVERSÁRIO PESSOAL (IDADE) ---
  if (birthDate && birthDate.length === 10) {
    const [diaStr, mesStr, anoStr] = birthDate.split("/");
    let proximoNiver = new Date(
      hoje.getFullYear(),
      parseInt(mesStr, 10) - 1,
      parseInt(diaStr, 10),
    );

    if (proximoNiver.getTime() < hoje.getTime()) {
      proximoNiver.setFullYear(hoje.getFullYear() + 1);
    }

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

  console.log(
    "⏳ Lembretes de namoro/casamento e idade agendados com sucesso!",
  );
};
