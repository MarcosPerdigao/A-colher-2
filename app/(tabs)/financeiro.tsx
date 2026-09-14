import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Modal,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import {
  MaterialCommunityIcons,
  AntDesign,
  MaterialIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { Fonts } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { FinanceService, Transaction } from "../../src/services/finance";
import { TaskService } from "../../src/services/tasks";
import { NotificationService } from "../../src/services/notifications";

const nomesMeses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const generateMonthsWindow = () => {
  const list = [];
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  for (let i = 0; i < 12; i++) {
    list.push(`${nomesMeses[date.getMonth()]}/${date.getFullYear()}`);
    date.setMonth(date.getMonth() + 1);
  }
  return list;
};

const GenericModal = ({ visible, onClose, bg, children }: any) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlayCenter}>
      <View style={[styles.modalAlert, { backgroundColor: bg }]}>
        {children}
      </View>
    </View>
  </Modal>
);

export default function FinanceiroScreen() {
  const { colors, isFemale } = useTheme();
  const insets = useSafeAreaInsets();
  const windowedMonths = useMemo(() => generateMonthsWindow(), []);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [gastos, setGastos] = useState<Transaction[]>([]);
  const [myNickname, setMyNickname] = useState("Eu");
  const [partnerName, setPartnerName] = useState("Parceira(o)");
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isExpense, setIsExpense] = useState(true);
  const [movName, setMovName] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movDate, setMovDate] = useState("");
  const [movType, setMovType] = useState<"fixo" | "variavel">("variavel");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [movCategory, setMovCategory] = useState("");
  const [expenseOwner, setExpenseOwner] = useState<"eu" | "parceiro">("eu");
  const [customCategory, setCustomCategory] = useState("");
  const [baseCategories, setBaseCategories] = useState([
    "Casa",
    "Mercado",
    "Transporte",
    "Saúde",
    "Lazer",
    "Outros",
    "Pets",
  ]);

  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🚀 O CADEADO SÍNCRONO CONTRA DUPLO CLIQUE
  const isSavingRef = useRef(false);
  const [isSavingUI, setIsSavingUI] = useState(false);

  const formSheetRef = useRef<BottomSheetModal>(null);
  const formSnapPoints = useMemo(() => ["90%", "98%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setSelectedMonth(
        `${nomesMeses[today.getMonth()]}/${today.getFullYear()}`,
      );
      loadFinanceSettings();
      loadUserNames();
      loadCustomCategories();
    }, []),
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;
    const setupRealtime = async () => {
      const stopListening = await FinanceService.listen(setGastos);
      if (!isMounted) stopListening?.();
      else unsubscribe = stopListening;
    };
    setupRealtime();
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const loadUserNames = async () => {
    const me = await AsyncStorage.getItem("@user_nickname");
    if (me) setMyNickname(me);
    const partner = await TaskService.getPartnerNickname();
    if (partner) setPartnerName(partner);
  };

  const loadCustomCategories = async () => {
    const custom = await FinanceService.getCustomCategories();
    if (custom.length > 0)
      setBaseCategories(Array.from(new Set([...baseCategories, ...custom])));
  };

  const loadFinanceSettings = async () => {
    const settings = await FinanceService.getSettings();
    if (settings) setCurrentSettings(settings);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserNames();
    await loadCustomCategories();
    await loadFinanceSettings();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSave = async () => {
    // 1. O Cadeado bloqueia instantaneamente qualquer segundo clique
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSavingUI(true);

    if (!movName || !movAmount) {
      isSavingRef.current = false;
      setIsSavingUI(false);
      return;
    }

    const valNumeric = parseFloat(movAmount.replace(/\D/g, "")) / 100;

    let finalCategory = "Renda Extra";
    if (isExpense) {
      finalCategory = movCategory;
      if (customCategory.trim().length > 0) {
        finalCategory = customCategory.trim();
        await FinanceService.saveCustomCategory(finalCategory);
        setBaseCategories((prev) => [...prev, finalCategory]);
      }
    }

    const paidByLabel = expenseOwner === "eu" ? myNickname : partnerName;

    try {
      const payload: any = {
        title: movName,
        value: valNumeric,
        type: isExpense ? "expense" : "income",
        category: finalCategory,
        date: movDate,
        month: selectedMonth,
        paidBy: paidByLabel,
        paymentMethod: paymentMethod,
        beneficiary: "couple",
        isFixed: movType === "fixo",
        split: "shared",
      };

      if (editingId) {
        await FinanceService.update(editingId, payload);
      } else {
        await FinanceService.add(payload);

        // Dispara a notificação em SEGUNDO PLANO, sem o 'await' antes da função!
        TaskService.getPartnerToken()
          .then((pToken) => {
            if (pToken) {
              const notifTitle = isExpense
                ? "💸 Nova Despesa"
                : "💰 Receita Extra!";
              const notifBody = isExpense
                ? `${myNickname} registrou um gasto de R$ ${valNumeric.toFixed(2)} em ${movName}.`
                : `${myNickname} adicionou uma entrada de R$ ${valNumeric.toFixed(2)} (${movName}).`;

              NotificationService.sendPushNotification(
                pToken,
                notifTitle,
                notifBody,
              );
            }
          })
          .catch(console.error);
      }

      Keyboard.dismiss();
      formSheetRef.current?.dismiss();
      resetForm();
    } catch (e) {
      console.log(e);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
        setIsSavingUI(false);
      }, 500);
    }
  };

  const handleOpenOptions = (item: Transaction) => {
    Keyboard.dismiss();
    setSelectedItem(item);
    setShowOptionsModal(true);
  };

  const handleEditOption = () => {
    if (!selectedItem) return;

    setMovName(selectedItem.title || "");
    const safeValue = Number(selectedItem.value) || 0;
    setMovAmount("R$ " + safeValue.toFixed(2).replace(".", ","));

    setMovDate(selectedItem.date || new Date().toLocaleDateString("pt-BR"));
    setIsExpense(selectedItem.type !== "income");
    setMovType(selectedItem.isFixed ? "fixo" : "variavel");
    setPaymentMethod(selectedItem.paymentMethod || "");

    if (selectedItem.type !== "income") {
      const cat = selectedItem.category || "";
      if (baseCategories.includes(cat)) {
        setMovCategory(cat);
        setCustomCategory("");
      } else {
        setCustomCategory(cat);
        setMovCategory("");
      }
    }
    setEditingId(selectedItem.id || null);

    setShowOptionsModal(false);
    setTimeout(() => {
      formSheetRef.current?.present();
    }, 150);
  };

  const openDeleteConfirm = () => {
    setShowOptionsModal(false);
    setTimeout(() => {
      setShowDeleteModal(true);
    }, 100);
  };

  const confirmDelete = async () => {
    if (!selectedItem?.id) return;

     const idToExclude = selectedItem.id;
    setShowDeleteModal(false);
    setSelectedItem(null);

     try {
      await FinanceService.delete(idToExclude);
    } catch (error) {
      console.log("Erro ao deletar:", error);
    }
  };

  const handleCurrencyChange = (value: string) => {
    let numeric = value.replace(/\D/g, "");
    if (numeric.length === 0) return setMovAmount("");
    setMovAmount(
      "R$ " +
        (parseInt(numeric) / 100)
          .toFixed(2)
          .replace(".", ",")
          .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."),
    );
  };

  const resetForm = () => {
    setIsExpense(true);
    setMovName("");
    setMovAmount("");
    setMovDate(new Date().toLocaleDateString("pt-BR"));
    setMovType("variavel");
    setExpenseOwner("eu");
    setMovCategory("");
    setCustomCategory("");
    setPaymentMethod("");
    setEditingId(null);
  };

  const listData = gastos.filter((i) => i.month === selectedMonth);
  const totalDespesas = listData
    .filter((i) => i.type === "expense")
    .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const totalExtras = listData
    .filter((i) => i.type === "income")
    .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const baseIncome = currentSettings?.monthlyIncome || 0;
  const saldoFinal = baseIncome + totalExtras - totalDespesas;
  const titleColorOnPrimary = isFemale ? "#5D4037" : "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      <View style={[styles.header, { marginTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Financeiro
        </Text>
      </View>

      <View style={styles.monthListContainer}>
        <FlatList
          data={windowedMonths}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.monthPill,
                selectedMonth === item && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedMonth(item)}
            >
              <Text
                style={[
                  styles.monthText,
                  {
                    color:
                      selectedMonth === item ? titleColorOnPrimary : colors.sub,
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <TouchableOpacity
            style={[styles.balanceCard, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={[styles.balanceLabel, { color: titleColorOnPrimary }]}
                >
                  Saldo Restante ({selectedMonth})
                </Text>
                {isRefreshing ? (
                  <ActivityIndicator
                    color={titleColorOnPrimary}
                    size="small"
                    style={{ alignSelf: "flex-start", marginTop: 5 }}
                  />
                ) : (
                  <Text
                    style={[
                      styles.balanceValue,
                      { color: titleColorOnPrimary },
                    ]}
                  >
                    R${" "}
                    {saldoFinal
                      .toFixed(2)
                      .replace(".", ",")
                      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")}
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Text
                    style={{
                      color: titleColorOnPrimary,
                      fontSize: 11,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    Base: R$ {baseIncome.toFixed(2)}
                  </Text>
                  {totalExtras > 0 && (
                    <Text
                      style={{
                        color: colors.success,
                        fontSize: 11,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      + Extras: R$ {totalExtras.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons
                name="refresh"
                size={24}
                color={titleColorOnPrimary}
                style={{ opacity: 0.7 }}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginBottom: 15 },
            ]}
          >
            Movimentações
          </Text>
          {listData.length === 0 ? (
            <Text
              style={{
                color: colors.sub,
                textAlign: "center",
                marginTop: 20,
                fontFamily: Fonts.regular,
              }}
            >
              Nenhum registro este mês.
            </Text>
          ) : (
            listData.map((item) => {
              const displayPayer =
                item.paidBy === myNickname ? "Eu" : item.paidBy;

              return (
                <TouchableOpacity
                  key={item.id || Math.random().toString()}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.card,
                      borderLeftWidth: 4,
                      borderLeftColor:
                        item.type === "expense"
                          ? colors.danger
                          : colors.success,
                    },
                  ]}
                  onPress={() => handleOpenOptions(item)}
                  activeOpacity={0.4}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[styles.iconWrap, { backgroundColor: colors.bg }]}
                    >
                      <MaterialCommunityIcons
                        name={
                          item.type === "expense" ? "cart-outline" : "cash-plus"
                        }
                        size={22}
                        color={
                          item.type === "expense"
                            ? colors.danger
                            : colors.success
                        }
                      />
                    </View>
                    <View style={styles.textWrap}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.itemSubtitle, { color: colors.sub }]}
                      >
                        {displayPayer}{" "}
                        {item.type === "expense" && `• ${item.category}`}
                      </Text>
                      {item.paymentMethod ? (
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.sub,
                            marginTop: 2,
                            fontFamily: Fonts.bold,
                          }}
                        >
                          {item.paymentMethod}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.itemAmount,
                      {
                        color:
                          item.type === "expense"
                            ? colors.danger
                            : colors.success,
                      },
                    ]}
                  >
                    {item.type === "expense" ? "- " : "+ "} R${" "}
                    {(Number(item.value) || 0).toFixed(2).replace(".", ",")}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 34 },
        ]}
        onPress={() => {
          resetForm();
          formSheetRef.current?.present();
        }}
      >
        <AntDesign name="plus" size={28} color={titleColorOnPrimary} />
      </TouchableOpacity>

      <BottomSheetModal
        ref={formSheetRef}
        index={0}
        snapPoints={formSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.sub }}
        keyboardBehavior="extend"
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 25,
            paddingBottom: insets.bottom + 60,
          }}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
              {editingId ? "Editar Registro" : "Novo Registro"}
            </Text>
            <TouchableOpacity onPress={() => formSheetRef.current?.dismiss()}>
              <AntDesign name="close" size={24} color={colors.sub} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.optionsRow,
              { backgroundColor: colors.bg, borderRadius: 12, padding: 5 },
            ]}
          >
            <TouchableOpacity
              onPress={() => setIsExpense(true)}
              style={[
                styles.typeBtn,
                { borderWidth: 0 },
                isExpense && { backgroundColor: colors.danger },
              ]}
            >
              <Text
                style={{
                  color: isExpense ? "#FFF" : colors.sub,
                  fontFamily: Fonts.bold,
                }}
              >
                Despesa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsExpense(false)}
              style={[
                styles.typeBtn,
                { borderWidth: 0 },
                !isExpense && { backgroundColor: colors.success },
              ]}
            >
              <Text
                style={{
                  color: !isExpense ? "#FFF" : colors.sub,
                  fontFamily: Fonts.bold,
                }}
              >
                Dinheiro Extra
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {isExpense ? "O que foi pago?" : "De onde veio esse dinheiro?"}
          </Text>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={movName}
            onChangeText={setMovName}
            placeholderTextColor={colors.sub}
            placeholder={
              isExpense ? "Ex: Conta de Luz" : "Ex: Venda no Mercado Livre"
            }
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Valor</Text>
              <BottomSheetTextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: colors.border,
                    marginBottom: 0,
                  },
                ]}
                keyboardType="numeric"
                value={movAmount}
                onChangeText={handleCurrencyChange}
                placeholderTextColor={colors.sub}
                placeholder="R$ 0,00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data</Text>
              <BottomSheetTextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: colors.border,
                    marginBottom: 0,
                  },
                ]}
                keyboardType="numeric"
                maxLength={10}
                value={movDate}
                onChangeText={setMovDate}
                placeholderTextColor={colors.sub}
                placeholder="DD/MM/AAAA"
              />
            </View>
          </View>
          <View style={{ height: 20 }} />

          {isExpense && (
            <>
              <Text style={styles.label}>Forma de Pagamento (Opcional)</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {["Pix", "Crédito", "Débito", "Dinheiro"].map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    onPress={() => setPaymentMethod(pm)}
                    style={[
                      styles.catBtn,
                      paymentMethod === pm && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          paymentMethod === pm
                            ? titleColorOnPrimary
                            : colors.sub,
                        fontFamily: Fonts.bold,
                        fontSize: 12,
                      }}
                    >
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Quem Pagou?</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setExpenseOwner("eu")}
                  style={[
                    styles.typeBtn,
                    expenseOwner === "eu" && {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: expenseOwner === "eu" ? "#FFF" : colors.sub,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    Eu
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setExpenseOwner("parceiro")}
                  style={[
                    styles.typeBtn,
                    expenseOwner === "parceiro" && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        expenseOwner === "parceiro"
                          ? titleColorOnPrimary
                          : colors.sub,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    {partnerName}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Tipo de Gasto</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setMovType("variavel")}
                  style={[
                    styles.typeBtn,
                    movType === "variavel" && {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: movType === "variavel" ? "#FFF" : colors.sub,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    Variável
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMovType("fixo")}
                  style={[
                    styles.typeBtn,
                    movType === "fixo" && {
                      backgroundColor: colors.danger,
                      borderColor: colors.danger,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: movType === "fixo" ? "#FFF" : colors.sub,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    Fixo
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Categoria</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
                style={{ marginBottom: 20 }}
              >
                {baseCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setMovCategory(cat);
                      setCustomCategory("");
                    }}
                    style={[
                      styles.catPill,
                      movCategory === cat
                        ? {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          }
                        : {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          movCategory === cat
                            ? titleColorOnPrimary
                            : colors.sub,
                        fontFamily: Fonts.bold,
                        fontSize: 13,
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Ou Crie uma Nova Categoria</Text>
              <BottomSheetTextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: colors.accent,
                  },
                ]}
                placeholderTextColor={colors.sub}
                placeholder="Ex: Assinaturas"
                value={customCategory}
                onChangeText={(t) => {
                  setCustomCategory(t);
                  setMovCategory("");
                }}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isExpense ? colors.danger : colors.success },
            ]}
            onPress={handleSave}
            disabled={isSavingUI}
          >
            {isSavingUI ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text
                style={{ color: "#FFF", fontFamily: Fonts.bold, fontSize: 16 }}
              >
                {editingId
                  ? "Salvar Alterações"
                  : isExpense
                    ? "Salvar Despesa"
                    : "Salvar Receita"}
              </Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <GenericModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        bg={colors.card}
      >
        <Text
          style={[
            styles.customModalTitle,
            { color: colors.text, marginBottom: 20 },
          ]}
        >
          O que deseja fazer?
        </Text>

        <TouchableOpacity
          style={[styles.optionMenuBtn, { backgroundColor: colors.bg }]}
          onPress={handleEditOption}
        >
          <MaterialIcons name="edit" size={24} color={colors.primary} />
          <Text style={[styles.optionMenuText, { color: colors.text }]}>
            Editar Registro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionMenuBtn,
            { backgroundColor: colors.bg, marginTop: 10 },
          ]}
          onPress={openDeleteConfirm}
        >
          <MaterialIcons name="delete" size={24} color="#FF5252" />
          <Text style={[styles.optionMenuText, { color: "#FF5252" }]}>
            Excluir Registro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowOptionsModal(false)}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: colors.sub, fontFamily: Fonts.regular }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </GenericModal>

      <GenericModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        bg={colors.card}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={50}
          color="#FF5252"
          style={{ marginBottom: 10 }}
        />
        <Text
          style={[
            styles.customModalTitle,
            { color: "#FF5252", marginBottom: 5 },
          ]}
        >
          Excluir Registro?
        </Text>
        <Text
          style={{
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
            fontFamily: Fonts.regular,
          }}
        >
          Tem certeza que deseja apagar &quot;{selectedItem?.title}&quot;? Esta ação não
          pode ser desfeita.
        </Text>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: "#FF5252", width: "100%", marginBottom: 10 },
          ]}
          onPress={confirmDelete}
        >
          <Text style={{ color: "#FFF", fontFamily: Fonts.bold }}>
            Sim, Excluir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDeleteModal(false)}
          style={{ padding: 10 }}
        >
          <Text style={{ color: colors.text, fontFamily: Fonts.regular }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </GenericModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontFamily: Fonts.black },
  monthListContainer: { marginBottom: 15 },
  monthPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  monthText: { fontSize: 14, fontFamily: Fonts.bold },
  balanceCard: { borderRadius: 24, padding: 24 },
  balanceLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    marginBottom: 6,
    opacity: 0.9,
  },
  balanceValue: { fontSize: 32, fontFamily: Fonts.black },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.black },
  itemCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  itemTitle: { fontSize: 16, fontFamily: Fonts.bold },
  itemSubtitle: { fontSize: 12, marginTop: 2, fontFamily: Fonts.regular },
  itemAmount: { fontSize: 15, fontFamily: Fonts.bold },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bottomSheetTitle: { fontSize: 20, fontFamily: Fonts.black },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#888",
  },
  input: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: Fonts.regular,
  },
  row: { flexDirection: "row", gap: 15 },
  optionsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
    alignItems: "center",
  },
  catBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
  },
  catPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    marginRight: 10,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  modalOverlayCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  modalAlert: {
    width: "90%",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
  },
  customModalTitle: { fontSize: 22, fontFamily: Fonts.black },
  optionMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    width: "100%",
    gap: 15,
  },
  optionMenuText: { fontSize: 16, fontFamily: Fonts.bold },
});
