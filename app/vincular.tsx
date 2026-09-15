import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  getFirestore,
} from "firebase/firestore";

import { useTheme } from "../src/context/ThemeContext";
import { AuthService } from "../src/services/auth";
import { CustomAlert } from "../src/components/CustomAlert";
import { Fonts } from "../constants/theme"; // <-- IMPORT DA FONTE

export default function VincularScreen() {
  const { colors, isFemale } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myCode, setMyCode] = useState("");
  const [partnersNames, setPartnersNames] = useState<string[]>([]);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const isFullyConnected = partnersNames.length >= 2;

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" = "error",
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const userData = await AuthService.syncUserData(user.uid);
        if (userData && userData.coupleCode) {
          setMyCode(userData.coupleCode);

          const details = await AuthService.getCoupleDetails(
            userData.coupleCode,
          );
          if (details && details.names) {
            setPartnersNames(details.names);
          }
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(myCode);
    showAlert("Copiado!", "Código na área de transferência.", "success");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Amor, entra no A Colher com nosso código: *${myCode}*`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleLeaveCouple = async () => {
    Alert.alert(
      "Sair da Casa?",
      "Se você sair, terá que criar um novo código ou entrar em outro. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const user = AuthService.getCurrentUser();
              if (user) await AuthService.leaveCouple(user.uid, myCode);
              router.replace("/");
            } catch {
              showAlert("Erro", "Não foi possível sair.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleJoinPartner = async () => {
    if (!partnerCodeInput) return showAlert("Ops", "Digite o código dele(a).");
    if (partnerCodeInput === myCode)
      return showAlert("Erro", "Você já está nessa casa!", "error");

    setIsJoining(true);
    try {
      const db = getFirestore();
      const user = AuthService.getCurrentUser();
      if (!user) return;

      const partnerCoupleRef = doc(db, "couples", partnerCodeInput);
      const partnerCoupleSnap = await getDoc(partnerCoupleRef);

      if (!partnerCoupleSnap.exists()) {
        setIsJoining(false);
        return showAlert(
          "Não encontrado",
          "Esse código não existe. Verifique com seu amor.",
        );
      }

      const data = partnerCoupleSnap.data();
      if (data.users && data.users.length >= 2) {
        setIsJoining(false);
        return showAlert("Casa Cheia", "Esse código já tem um casal completo.");
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        coupleCode: partnerCodeInput,
        setupMode: "join",
      });

      await updateDoc(partnerCoupleRef, {
        users: arrayUnion(user.uid),
      });

      showAlert("Sucesso!", "Vocês estão conectados! ❤️", "success");
      setTimeout(() => {
        setPartnerCodeInput("");
        loadCurrentData();
        setIsJoining(false);
      }, 1500);
    } catch (error) {
      console.log(error);
      setIsJoining(false);
      showAlert("Erro", "Falha ao vincular. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={isFemale ? "dark" : "light"} />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() =>
            setAlertConfig((prev) => ({ ...prev, visible: false }))
          }
        />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Status do Vínculo
          </Text>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: isFullyConnected
                  ? colors.success + "20"
                  : colors.card,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isFullyConnected ? "heart-multiple" : "heart-broken"}
              size={50}
              color={isFullyConnected ? colors.success : colors.sub}
            />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {isFullyConnected ? "Casal Conectado!" : "Esperando seu amor..."}
            </Text>

            <View style={styles.partnersList}>
              {partnersNames.map((name, index) => (
                <View
                  key={index}
                  style={[styles.partnerBadge, { backgroundColor: colors.bg }]}
                >
                  <Ionicons name="person" size={14} color={colors.primary} />
                  <Text style={{ color: colors.text, fontFamily: Fonts.bold }}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.sub }]}>
              CÓDIGO DA CASA
            </Text>
            <TouchableOpacity onPress={handleCopy}>
              <Text style={[styles.code, { color: colors.text }]}>
                {myCode || "..."}
              </Text>
            </TouchableOpacity>

            <View style={styles.rowBtn}>
              <TouchableOpacity
                onPress={handleCopy}
                style={[
                  styles.actionBtn,
                  { borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color={colors.text}
                />
                <Text style={[styles.btnText, { color: colors.text }]}>
                  Copiar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color={isFemale ? "#5D4037" : "#FFF"}
                />
                <Text
                  style={[
                    styles.btnText,
                    { color: isFemale ? "#5D4037" : "#FFF" },
                  ]}
                >
                  Enviar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isFullyConnected ? (
            <View style={{ width: "100%", marginTop: 20 }}>
              <View style={styles.divider}>
                <View
                  style={[styles.line, { backgroundColor: colors.border }]}
                />
                <Text
                  style={{
                    color: colors.sub,
                    marginHorizontal: 10,
                    fontFamily: Fonts.regular,
                  }}
                >
                  OU
                </Text>
                <View
                  style={[styles.line, { backgroundColor: colors.border }]}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: colors.text,
                    alignSelf: "flex-start",
                    marginLeft: 5,
                  },
                ]}
              >
                ENTRAR EM OUTRA CASA
              </Text>
              <TextInput
                placeholder="Digite o código dele(a)..."
                placeholderTextColor={colors.sub}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={partnerCodeInput}
                onChangeText={setPartnerCodeInput}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[
                  styles.joinBtn,
                  {
                    backgroundColor: isJoining
                      ? colors.sub
                      : colors.secondary || "#757575",
                  },
                ]}
                onPress={handleJoinPartner}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.joinText}>Mudar de Casa</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={handleLeaveCouple}
            >
              <Text style={{ color: "#FF5252", fontFamily: Fonts.bold }}>
                Sair desta Casa / Desvincular
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { padding: 10, marginRight: 10 },
  title: { fontSize: 24, fontFamily: Fonts.black },
  content: { alignItems: "center", flex: 1 },

  statusCard: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  statusTitle: { fontSize: 18, fontFamily: Fonts.bold, marginVertical: 10 },
  partnersList: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    gap: 5,
  },

  card: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginBottom: 10,
    letterSpacing: 1,
  },
  code: {
    fontSize: 32,
    fontFamily: Fonts.black,
    letterSpacing: 2,
    marginBottom: 20,
  },
  rowBtn: { flexDirection: "row", gap: 10, width: "100%" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { fontFamily: Fonts.bold },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  line: { flex: 1, height: 1 },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    marginBottom: 15,
    fontFamily: Fonts.regular,
  },
  joinBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  joinText: { color: "#FFF", fontFamily: Fonts.bold, fontSize: 16 },

  leaveBtn: { marginTop: 30, padding: 15 },
});
