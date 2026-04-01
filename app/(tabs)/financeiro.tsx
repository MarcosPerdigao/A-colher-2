import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView, // <-- O ScrollView nativo voltou para a tela principal
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, AntDesign } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";
import { Fonts } from "../../constants/theme";

import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView, // <-- Usado APENAS dentro das gavetas
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";

import { FinanceConfigModal } from "../../src/components/FinanceConfigModal";
import { FinanceService } from "../../src/services/finance";

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

export default function FinanceiroScreen() {
  const { colors, isFemale } = useTheme();
  const insets = useSafeAreaInsets();

  const windowedMonths = useMemo(() => generateMonthsWindow(), []);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [gastos, setGastos] = useState<any[]>([]);

  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [movName, setMovName] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movDate, setMovDate] = useState("");
  const [movType, setMovType] = useState<"fixo" | "variavel">("variavel");
  const [movCategory, setMovCategory] = useState("");
  const [expenseOwner, setExpenseOwner] = useState<"eu" | "parceiro">("eu");
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const categories = [
    "Casa",
    "Mercado",
    "Transporte",
    "Saúde",
    "Lazer",
    "Outros",
  ];

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const formSheetRef = useRef<BottomSheetModal>(null);
  const optionsSheetRef = useRef<BottomSheetModal>(null);

  const formSnapPoints = useMemo(() => ["85%", "95%"], []);
  const optionsSnapPoints = useMemo(() => ["35%"], []);

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
      const currentLabel = `${nomesMeses[today.getMonth()]}/${today.getFullYear()}`;
      setSelectedMonth(currentLabel);
      loadFinanceSettings();
    }, []),
  );

  const loadFinanceSettings = async () => {
    const settings = await FinanceService.getSettings();
    if (settings) {
      setCurrentSettings(settings);
    }
  };

  const handleOpenFinanceSettings = async () => {
    setLoadingSettings(true);
    await loadFinanceSettings();
    setLoadingSettings(false);
    setShowFinanceModal(true);
  };

  const handleSaveFinanceSettings = async () => {
    await loadFinanceSettings();
  };

  const handleSave = () => {
    if (!movName || !movAmount) {
      Alert.alert("Erro", "Preencha o nome e o valor.");
      return;
    }

    const ownerLabel = expenseOwner === "eu" ? "Minha" : "Parceira(o)";
    const catLabel = isAddingNewCategory ? customCategory : movCategory;

    const newItem = {
      id: Math.random().toString(),
      title: movName,
      subtitle: `${ownerLabel} • ${movDate} • ${catLabel}`,
      amount: `- ${movAmount}`,
      icon: "cart-outline",
      type: movType,
      category: catLabel,
      month: selectedMonth,
      owner: expenseOwner,
    };

    setGastos([newItem, ...gastos]);
    Keyboard.dismiss();
    formSheetRef.current?.dismiss();
    resetForm();
  };

  const handleDelete = () => {
    setGastos(gastos.filter((item) => item.id !== selectedItem.id));
    optionsSheetRef.current?.dismiss();
  };

  const handleCurrencyChange = (value: string) => {
    let numeric = value.replace(/\D/g, "");
    if (numeric.length === 0) {
      setMovAmount("");
      return;
    }
    let floatVal = (parseInt(numeric) / 100).toFixed(2);
    let formatted = floatVal
      .replace(".", ",")
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setMovAmount("R$ " + formatted);
  };

  const resetForm = () => {
    setMovName("");
    setMovAmount("");
    setMovDate(new Date().toLocaleDateString("pt-BR"));
    setMovType("variavel");
    setExpenseOwner("eu");
    setMovCategory("");
    setIsAddingNewCategory(false);
    setCustomCategory("");
  };

  const openForm = () => {
    resetForm();
    formSheetRef.current?.present();
  };

  const listData = gastos.filter((i) => i.month === selectedMonth);
  const titleColorOnPrimary = isFemale ? "#5D4037" : "#FFFFFF";

  const displayIncome = currentSettings?.monthlyIncome
    ? `R$ ${currentSettings.monthlyIncome
        .toFixed(2)
        .replace(".", ",")
        .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")}`
    : "R$ 0,00";

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

      {/* AQUI ESTAVA O ERRO: Voltou a ser o ScrollView normal */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <TouchableOpacity
            style={[styles.balanceCard, { backgroundColor: colors.primary }]}
            onPress={handleOpenFinanceSettings}
            disabled={loadingSettings}
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
                  {currentSettings?.mode === "split"
                    ? "Sua Renda Mensal"
                    : "Renda Mensal"}
                </Text>
                {loadingSettings ? (
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
                    {displayIncome}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons
                name="cog-outline"
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
            Despesas de {selectedMonth}
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
              Nenhum gasto registrado este mês.
            </Text>
          ) : (
            listData.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedItem(item);
                  optionsSheetRef.current?.present();
                }}
              >
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: isFemale ? colors.bg : "#263238" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: colors.sub }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.itemAmount, { color: colors.danger }]}>
                  {item.amount}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 34 },
        ]}
        onPress={openForm}
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
            padding: 30,
            paddingBottom: insets.bottom + 60,
          }}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nova Despesa
            </Text>
            <TouchableOpacity onPress={() => formSheetRef.current?.dismiss()}>
              <AntDesign name="close" size={24} color={colors.sub} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nome</Text>
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
            placeholder="Ex: Conta de Luz"
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
                Parceira(o)
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
            style={{ marginBottom: 20 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setMovCategory(cat);
                  setIsAddingNewCategory(false);
                }}
                style={[
                  styles.catBtn,
                  movCategory === cat && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={{
                    color:
                      movCategory === cat ? titleColorOnPrimary : colors.sub,
                    fontFamily: Fonts.bold,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setIsAddingNewCategory(true)}
              style={[
                styles.catBtn,
                isAddingNewCategory && { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={{
                  color: isAddingNewCategory ? "#FFF" : colors.sub,
                  fontFamily: Fonts.bold,
                }}
              >
                + Outra
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {isAddingNewCategory && (
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
              placeholder="Qual categoria?"
              value={customCategory}
              onChangeText={setCustomCategory}
            />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.danger }]}
            onPress={handleSave}
          >
            <Text
              style={{ color: "#FFF", fontFamily: Fonts.bold, fontSize: 16 }}
            >
              Salvar Despesa
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={optionsSheetRef}
        index={0}
        snapPoints={optionsSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.sub }}
      >
        <View style={{ padding: 25 }}>
          <Text
            style={[
              styles.modalTitle,
              { color: colors.text, marginBottom: 20, textAlign: "center" },
            ]}
          >
            O que deseja fazer?
          </Text>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={() => {
              optionsSheetRef.current?.dismiss();
              formSheetRef.current?.present();
              setMovName(selectedItem?.title);
            }}
          >
            <AntDesign name="edit" size={20} color={colors.primary} />
            <Text
              style={{
                color: colors.text,
                marginLeft: 10,
                fontSize: 16,
                fontFamily: Fonts.semiBold,
              }}
            >
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionBtn, { borderBottomWidth: 0 }]}
            onPress={handleDelete}
          >
            <AntDesign name="delete" size={20} color={colors.danger} />
            <Text
              style={{
                color: colors.danger,
                marginLeft: 10,
                fontSize: 16,
                fontFamily: Fonts.semiBold,
              }}
            >
              Excluir
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      <FinanceConfigModal
        visible={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        onSave={handleSaveFinanceSettings}
        initialIncome={currentSettings?.monthlyIncome || 0}
        initialMode={currentSettings?.mode || "unified"}
      />
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
  balanceValue: { fontSize: 30, fontFamily: Fonts.black },
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
  modalTitle: { fontSize: 20, fontFamily: Fonts.black },
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
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#DDD",
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEE",
  },
});
