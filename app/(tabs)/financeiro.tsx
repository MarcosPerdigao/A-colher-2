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
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { FinanceService, Transaction } from "../../src/services/finance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomAlert } from "../../src/components/CustomAlert"; // <--- IMPORTANTE

export default function FinanceScreen() {
  const { colors: theme, isFemale } = useTheme();
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [myNickname, setMyNickname] = useState("");
  const [filter, setFilter] = useState<"pending" | "paid">("pending");

  // Estados dos Modais e Alertas
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] =
    useState<Transaction["category"]>("home");

  // Estado do Alerta Simples (Erro/Sucesso)
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });

  // Estado do Modal de Confirmação (Sim/Não)
  const [confirmConfig, setConfirmConfig] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    loadUser();
    let unsubscribeFunc: (() => void) | undefined;
    const startListening = async () => {
      unsubscribeFunc = await FinanceService.listen((data) => {
        setTransactions(data);
        setLoading(false);
      });
    };
    startListening();
    return () => {
      if (unsubscribeFunc) unsubscribeFunc();
    };
  }, []);

  const loadUser = async () => {
    const name = await AsyncStorage.getItem("@user_nickname");
    if (name) setMyNickname(name);
  };

  // Funções Auxiliares de Alerta
  const showAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error"
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ visible: true, title, message, onConfirm });
  };

  const handleAdd = async () => {
    if (!newTitle || !newValue)
      return showAlert("Campos Vazios", "Preencha o nome e o valor da conta.");

    const val = parseFloat(newValue.replace(",", "."));
    if (isNaN(val))
      return showAlert("Valor Inválido", "Digite um valor numérico válido.");

    await FinanceService.add({
      title: newTitle,
      value: val,
      category: newCategory,
      type: "expense",
    });

    setModalVisible(false);
    setNewTitle("");
    setNewValue("");
    setNewCategory("home");
  };

  const handlePay = (item: Transaction) => {
    askConfirmation(
      "Confirmar Pagamento",
      `Você confirma que pagou "${item.title}"?`,
      () => FinanceService.pay(item.id, myNickname)
    );
  };

  const handleDelete = (item: Transaction) => {
    askConfirmation(
      "Excluir Conta",
      "Tem certeza que deseja apagar este item?",
      () => FinanceService.delete(item.id)
    );
  };

  // Cálculos e Renderização
  const totalPending = transactions
    .filter((t) => t.status === "pending")
    .reduce((acc, t) => acc + t.value, 0);
  const totalPaid = transactions
    .filter((t) => t.status === "paid")
    .reduce((acc, t) => acc + t.value, 0);

  const getIcon = (category: string) => {
    switch (category) {
      case "home":
        return "home";
      case "food":
        return "utensils";
      case "transport":
        return "car";
      case "leisure":
        return "cocktail";
      case "market":
        return "shopping-cart";
      default:
        return "wallet";
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderLeftColor:
              item.status === "paid" ? theme.success : theme.danger,
            borderLeftWidth: 5,
          },
        ]}
      >
        <View style={styles.iconBox}>
          <FontAwesome5
            name={getIcon(item.category)}
            size={20}
            color={theme.text}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.itemSubtitle, { color: "#888" }]}>
            {item.status === "pending"
              ? "Aberto"
              : `Pago por: ${item.paidBy === myNickname ? "Mim" : item.paidBy}`}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.itemValue, { color: theme.text }]}>
            R$ {item.value.toFixed(2)}
          </Text>
          {item.status === "pending" && (
            <TouchableOpacity
              style={[styles.payBtn, { borderColor: theme.success }]}
              onPress={() => handlePay(item)}
            >
              <Text
                style={{
                  color: theme.success,
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                PAGAR
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "paid" && (
            <MaterialIcons
              name="check-circle"
              size={20}
              color={theme.success}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={isFemale ? "dark" : "light"} />

      {/* ALERTA PERSONALIZADO (Componente Global) */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* MODAL DE CONFIRMAÇÃO (Local, estilo do App) */}
      <Modal visible={confirmConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.confirmCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>
              {confirmConfig.title}
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.text }]}>
              {confirmConfig.message}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() =>
                  setConfirmConfig((prev) => ({ ...prev, visible: false }))
                }
                style={styles.cancelBtn}
              >
                <Text style={{ color: theme.sub, fontWeight: "bold" }}>
                  CANCELAR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig((prev) => ({ ...prev, visible: false }));
                }}
                style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              >
                <Text
                  style={{
                    color: isFemale ? theme.text : "#FFF",
                    fontWeight: "bold",
                  }}
                >
                  SIM, CONFIRMAR
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Finanças</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={styles.label}>A PAGAR</Text>
          <Text style={[styles.amount, { color: theme.danger }]}>
            R$ {totalPending.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={styles.label}>JÁ PAGO</Text>
          <Text style={[styles.amount, { color: theme.success }]}>
            R$ {totalPaid.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilter("pending")}
          style={[
            styles.filterBtn,
            filter === "pending" && { backgroundColor: theme.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: theme.text, opacity: filter === "pending" ? 1 : 0.5 },
            ]}
          >
            Em Aberto
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("paid")}
          style={[
            styles.filterBtn,
            filter === "paid" && { backgroundColor: theme.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: theme.text, opacity: filter === "paid" ? 1 : 0.5 },
            ]}
          >
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={transactions.filter((t) => t.status === filter)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ marginTop: 50, alignItems: "center" }}>
              <MaterialIcons name="attach-money" size={60} color="#888" />
              <Text style={{ color: "#888", marginTop: 10 }}>
                Nenhuma conta aqui!
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.primary, bottom: 40 + insets.bottom },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <AntDesign
          name="plus"
          size={30}
          color={isFemale ? theme.text : "#fff"}
        />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: theme.card }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Nova Conta
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <AntDesign name="close" size={24} color={theme.sub} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: theme.sub }]}>
                Título
              </Text>
              <TextInput
                placeholder="Ex: Aluguel, Luz..."
                placeholderTextColor={theme.sub}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                  },
                ]}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.sub }]}>
                Valor (R$)
              </Text>
              <TextInput
                placeholder="0,00"
                placeholderTextColor={theme.sub}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                  },
                ]}
                value={newValue}
                onChangeText={setNewValue}
              />

              <Text style={[styles.inputLabel, { color: theme.sub }]}>
                Categoria
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {(
                  [
                    "home",
                    "market",
                    "food",
                    "transport",
                    "leisure",
                    "other",
                  ] as const
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      styles.catBadge,
                      {
                        backgroundColor:
                          newCategory === cat ? theme.primary : theme.bg,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <FontAwesome5
                      name={getIcon(cat)}
                      size={14}
                      color={
                        newCategory === cat
                          ? isFemale
                            ? theme.text
                            : "#FFF"
                          : theme.sub
                      }
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color:
                          newCategory === cat
                            ? isFemale
                              ? theme.text
                              : "#FFF"
                            : theme.sub,
                        fontWeight: "bold",
                        textTransform: "capitalize",
                      }}
                    >
                      {cat === "home"
                        ? "Casa"
                        : cat === "food"
                        ? "Comida"
                        : cat === "leisure"
                        ? "Lazer"
                        : cat === "market"
                        ? "Mercado"
                        : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleAdd}
              >
                <Text
                  style={{
                    color: isFemale ? theme.text : "#FFF",
                    fontWeight: "bold",
                  }}
                >
                  Adicionar Conta
                </Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  title: { fontSize: 28, fontWeight: "900" },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 25,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 20,
    elevation: 2,
    alignItems: "center",
  },
  label: { fontSize: 12, color: "#888", fontWeight: "bold" },
  amount: { fontSize: 20, fontWeight: "900", marginTop: 5 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 15,
  },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  filterText: { fontWeight: "bold" },
  card: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: "center",
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  itemSubtitle: { fontSize: 12, marginTop: 2 },
  itemValue: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  payBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold" },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
  },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: "center" },
  catBadge: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    alignItems: "center",
  },

  // Estilos do Modal de Confirmação
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "90%",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
    elevation: 5,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: "center",
    opacity: 0.8,
  },
  confirmActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: 10,
  },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
});
