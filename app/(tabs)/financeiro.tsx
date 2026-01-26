import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  FontAwesome5,
  MaterialIcons,
  AntDesign,
  MaterialCommunityIcons, // <--- Faltou esse carinha aqui
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../../src/context/ThemeContext";
import {
  FinanceService,
  Transaction,
  CategoryType,
  BeneficiaryType,
} from "../../src/services/finance";
import { AuthService } from "../../src/services/auth";
import { CustomAlert } from "../../src/components/CustomAlert";
import { FinanceConfigModal } from "../../src/components/FinanceConfigModal";
import { NotificationService } from "../../src/services/notifications"; // Importe Novo

export default function FinanceScreen() {
  const { colors: theme, isFemale } = useTheme();
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [myNickname, setMyNickname] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("Dele(a)");

  // CONFIGURAÇÕES GLOBAIS
  const [financeMode, setFinanceMode] = useState<"unified" | "split">(
    "unified",
  );
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // ESTATÍSTICAS
  const [unifiedStats, setUnifiedStats] = useState({
    totalSpent: 0,
    remaining: 0,
    progress: 0,
    spentMe: 0,
    spentPartner: 0,
    spentCouple: 0,
  });

  const [activeBeneficiaryFilter, setActiveBeneficiaryFilter] = useState<
    BeneficiaryType | "all"
  >("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);

  // CONTROLES
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // FORMULÁRIO
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryType>("home");
  const [beneficiary, setBeneficiary] = useState<BeneficiaryType>("couple");
  const [isLoan, setIsLoan] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as any,
  });

  useEffect(() => {
    loadInitialData();
    const unsubscribe = FinanceService.listen((data) => {
      setTransactions(data);
    });
    // return unsubscribe;
  }, []);

  useEffect(() => {
    if (financeMode === "unified") {
      const stats = FinanceService.calculateUnifiedStats(
        transactions,
        monthlyIncome,
      );
      setUnifiedStats(stats);
    }
  }, [transactions, monthlyIncome, financeMode]);

  const loadInitialData = async () => {
    const name = await AsyncStorage.getItem("@user_nickname");
    if (name) setMyNickname(name);

    const settings = await FinanceService.getSettings();
    if (settings) {
      setFinanceMode(settings.mode);
      setMonthlyIncome(settings.monthlyIncome);
    } else {
      setShowSetupModal(true);
    }

    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const userData = await AuthService.syncUserData(user.uid);
        if (userData?.coupleCode) {
          const details = await AuthService.getCoupleDetails(
            userData.coupleCode,
          );
          if (details && details.names) {
            const pName = details.names.find((n: string) => n !== name);
            if (pName) setPartnerNickname(pName);
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleSave = async () => {
    if (!newTitle.trim())
      return setAlertConfig({
        visible: true,
        title: "Ops",
        message: "Digite o nome do gasto",
        type: "error",
      });
    if (!newValue.trim())
      return setAlertConfig({
        visible: true,
        title: "Ops",
        message: "Digite o valor",
        type: "error",
      });

    const val = parseFloat(newValue.replace(/\./g, "").replace(",", "."));

    const transactionData: any = {
      title: newTitle,
      value: val,
      category: newCategory,
      type: "expense",
      split: isLoan ? "loan" : "shared",
      isFixed: isFixed,
      beneficiary: beneficiary,
      paidBy: myNickname,
    };

    try {
      if (editingId) {
        await FinanceService.update(editingId, transactionData);
      } else {
        await FinanceService.add(transactionData);

        // --- NOTIFICAR O PARCEIRO ---
        const catLabel = getCategoryDetails(newCategory).label;
        await NotificationService.notifyPartner(
          "Nova Despesa 💸",
          `${myNickname} lançou R$ ${newValue} em ${catLabel}`,
        );
      }
      setModalVisible(false);
      resetForm();
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: "Erro",
        message: "Não foi possível salvar",
        type: "error",
      });
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewValue("");
    setNewCategory("home");
    setIsLoan(false);
    setIsFixed(false);
    setBeneficiary("couple");
    setEditingId(null);
  };

  const handleLongPress = (item: Transaction) => {
    setSelectedItem(item);
    setShowOptions(true);
  };

  const handleEditOption = () => {
    if (!selectedItem) return;
    setNewTitle(selectedItem.title);
    setNewValue(selectedItem.value.toFixed(2).replace(".", ","));
    setNewCategory(selectedItem.category);
    setBeneficiary(selectedItem.beneficiary);
    setIsLoan(selectedItem.split === "loan");
    setIsFixed(selectedItem.isFixed);
    setEditingId(selectedItem.id);
    setShowOptions(false);
    setModalVisible(true);
  };

  const handleDeleteOption = () => {
    setShowOptions(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (selectedItem) {
      await FinanceService.delete(selectedItem.id);
    }
    setShowDeleteConfirm(false);
    setSelectedItem(null);
  };

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case "home":
        return { icon: "home", color: "#5C6BC0", label: "Casa" };
      case "market":
        return { icon: "shopping-cart", color: "#EC407A", label: "Mercado" };
      case "food":
        return { icon: "utensils", color: "#FF7043", label: "Comida" };
      case "transport":
        return { icon: "car", color: "#78909C", label: "Transp." };
      case "leisure":
        return { icon: "cocktail", color: "#AB47BC", label: "Lazer" };
      case "health":
        return { icon: "first-aid", color: "#26A69A", label: "Saúde" };
      case "pets":
        return { icon: "paw", color: "#8D6E63", label: "Pets" };
      case "invest":
        return { icon: "chart-line", color: "#66BB6A", label: "Invest." };
      case "loan":
        return {
          icon: "hand-holding-usd",
          color: "#FFCA28",
          label: "Empréstimo",
        };
      default:
        return { icon: "wallet", color: "#BDBDBD", label: "Outros" };
    }
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    let totalFiltered = 0;
    const baseList = transactions.filter(
      (t) =>
        activeBeneficiaryFilter === "all" ||
        t.beneficiary === activeBeneficiaryFilter,
    );
    baseList.forEach((t) => {
      stats[t.category] = (stats[t.category] || 0) + t.value;
      totalFiltered += t.value;
    });
    return Object.keys(stats)
      .map((key) => ({
        key,
        value: stats[key],
        percentage: totalFiltered > 0 ? stats[key] / totalFiltered : 0,
        ...getCategoryDetails(key),
      }))
      .sort((a, b) => b.value - a.value);
  };
  const categoryData = getCategoryStats();

  const filteredTransactions = transactions.filter((t) => {
    if (
      activeBeneficiaryFilter !== "all" &&
      t.beneficiary !== activeBeneficiaryFilter
    )
      return false;
    if (selectedCategoryFilter && t.category !== selectedCategoryFilter)
      return false;
    return true;
  });

  const renderUnifiedHeader = () => {
    const isPositive = unifiedStats.remaining >= 0;
    const isOverBudget = unifiedStats.totalSpent > monthlyIncome;
    return (
      <View style={[styles.unifiedCard, { backgroundColor: theme.card }]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,0,0,0.05)",
            paddingBottom: 15,
          }}
        >
          <View>
            <Text
              style={{
                color: theme.sub,
                fontSize: 10,
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Renda Total
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
            >
              R${" "}
              {monthlyIncome.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
              })}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                color: theme.sub,
                fontSize: 10,
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Total de Contas
            </Text>
            <Text
              style={{
                color: isOverBudget ? theme.danger : theme.success,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              R${" "}
              {unifiedStats.totalSpent.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <View style={styles.statCol}>
            <Text style={{ color: theme.sub, fontSize: 10 }}>Eu gastei</Text>
            <Text style={{ color: theme.text, fontWeight: "bold" }}>
              R$ {unifiedStats.spentMe.toFixed(0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={{ color: theme.sub, fontSize: 10 }}>
              {partnerNickname}
            </Text>
            <Text style={{ color: theme.text, fontWeight: "bold" }}>
              R$ {unifiedStats.spentPartner.toFixed(0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={{ color: theme.sub, fontSize: 10 }}>Casa</Text>
            <Text style={{ color: theme.text, fontWeight: "bold" }}>
              R$ {unifiedStats.spentCouple.toFixed(0)}
            </Text>
          </View>
        </View>
        <View
          style={{
            alignItems: "center",
            backgroundColor: isPositive ? theme.bg : "#FFEBEE",
            padding: 10,
            borderRadius: 15,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: theme.sub,
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            SALDO LIVRE
          </Text>
          <Text
            style={[
              styles.bigBalance,
              {
                color: isPositive ? theme.success : theme.danger,
                marginTop: 5,
              },
            ]}
          >
            R${" "}
            {Math.abs(unifiedStats.remaining).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderInteractiveChart = () => {
    if (categoryData.length === 0) return null;
    return (
      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                marginLeft: 0,
                marginBottom: 0,
                marginTop: 0,
                color: theme.sub,
              },
            ]}
          >
            GASTOS POR CATEGORIA
          </Text>
          {selectedCategoryFilter && (
            <TouchableOpacity onPress={() => setSelectedCategoryFilter(null)}>
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                Limpar Filtro
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {categoryData.map((item) => {
            const isSelected = selectedCategoryFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() =>
                  setSelectedCategoryFilter(isSelected ? null : item.key)
                }
                style={[
                  styles.chartBar,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? item.color : "transparent",
                    borderWidth: isSelected ? 2 : 0,
                    elevation: isSelected ? 4 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={[
                      styles.chartIcon,
                      { backgroundColor: item.color + "20" },
                    ]}
                  >
                    <FontAwesome5
                      name={item.icon}
                      size={12}
                      color={item.color}
                    />
                  </View>
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 12,
                      color: theme.text,
                      marginLeft: 8,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.text,
                  }}
                >
                  R${" "}
                  {item.value.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 5,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      flex: 1,
                      backgroundColor: theme.bg,
                      borderRadius: 2,
                      marginRight: 5,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${item.percentage * 100}%`,
                        backgroundColor: item.color,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.sub }}>
                    {(item.percentage * 100).toFixed(0)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={isFemale ? "dark" : "light"} />
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Gestão Financeira
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {financeMode === "unified" ? renderUnifiedHeader() : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 10,
            paddingBottom: 15,
          }}
        >
          <FilterChip
            label="Todos"
            active={activeBeneficiaryFilter === "all"}
            onPress={() => {
              setActiveBeneficiaryFilter("all");
              setSelectedCategoryFilter(null);
            }}
            theme={theme}
            isFemale={isFemale}
          />
          <FilterChip
            label="Meus"
            active={activeBeneficiaryFilter === "me"}
            onPress={() => {
              setActiveBeneficiaryFilter("me");
              setSelectedCategoryFilter(null);
            }}
            theme={theme}
            isFemale={isFemale}
          />
          <FilterChip
            label={partnerNickname}
            active={activeBeneficiaryFilter === "partner"}
            onPress={() => {
              setActiveBeneficiaryFilter("partner");
              setSelectedCategoryFilter(null);
            }}
            theme={theme}
            isFemale={isFemale}
          />
          <FilterChip
            label="Casa / Comum"
            active={activeBeneficiaryFilter === "couple"}
            onPress={() => {
              setActiveBeneficiaryFilter("couple");
              setSelectedCategoryFilter(null);
            }}
            theme={theme}
            isFemale={isFemale}
          />
        </ScrollView>

        {renderInteractiveChart()}

        <Text style={[styles.sectionTitle, { color: theme.sub }]}>
          {selectedCategoryFilter
            ? `FILTRADO POR: ${getCategoryDetails(selectedCategoryFilter).label.toUpperCase()}`
            : "ÚLTIMOS LANÇAMENTOS"}
        </Text>

        <View style={{ paddingHorizontal: 20 }}>
          {filteredTransactions.map((item) => {
            const cat = getCategoryDetails(item.category);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.cardItem, { backgroundColor: theme.card }]}
                onLongPress={() => handleLongPress(item)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: cat.color + "20" },
                  ]}
                >
                  <FontAwesome5 name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text
                    style={[styles.itemTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: theme.sub }}>
                      {new Date(item.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Text>
                    {item.isFixed && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginLeft: 5,
                        }}
                      >
                        <MaterialIcons
                          name="repeat"
                          size={12}
                          color={theme.sub}
                        />
                      </View>
                    )}
                    {item.beneficiary === "me" && (
                      <View
                        style={[
                          styles.miniTag,
                          { backgroundColor: theme.accent },
                        ]}
                      >
                        <Text style={styles.miniTagText}>Eu</Text>
                      </View>
                    )}
                    {item.beneficiary === "partner" && (
                      <View
                        style={[
                          styles.miniTag,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Text style={styles.miniTagText}>
                          {partnerNickname}
                        </Text>
                      </View>
                    )}
                    {item.beneficiary === "couple" && (
                      <View
                        style={[styles.miniTag, { backgroundColor: "#90A4AE" }]}
                      >
                        <Text style={styles.miniTagText}>Casa</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.itemValue, { color: theme.text }]}>
                  - R$ {item.value.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {filteredTransactions.length === 0 && (
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <Text style={{ textAlign: "center", color: theme.sub }}>
                Nenhum lançamento.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.primary, bottom: 40 + insets.bottom },
        ]}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <AntDesign
          name="plus"
          size={30}
          color={isFemale ? theme.text : "#fff"}
        />
      </TouchableOpacity>

      <GenericModal
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        bg={theme.card}
      >
        <Text
          style={[styles.modalTitle, { color: theme.text, marginBottom: 20 }]}
        >
          O que deseja fazer?
        </Text>
        <TouchableOpacity
          style={[styles.optionMenuBtn, { backgroundColor: theme.bg }]}
          onPress={handleEditOption}
        >
          <MaterialIcons name="edit" size={24} color={theme.primary} />
          <Text style={[styles.optionMenuText, { color: theme.text }]}>
            Editar Conta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionMenuBtn,
            { backgroundColor: theme.bg, marginTop: 10 },
          ]}
          onPress={handleDeleteOption}
        >
          <MaterialIcons name="delete" size={24} color="#FF5252" />
          <Text style={[styles.optionMenuText, { color: "#FF5252" }]}>
            Excluir Conta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowOptions(false)}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: theme.sub }}>Cancelar</Text>
        </TouchableOpacity>
      </GenericModal>

      <GenericModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        bg={theme.card}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={50}
          color="#FF5252"
          style={{ marginBottom: 10 }}
        />
        <Text
          style={[styles.modalTitle, { color: "#FF5252", marginBottom: 5 }]}
        >
          Apagar Gasto?
        </Text>
        <Text
          style={{ color: theme.text, textAlign: "center", marginBottom: 20 }}
        >
          Tem certeza que deseja apagar "{selectedItem?.title}"?
        </Text>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: "#FF5252", width: "100%", marginBottom: 10 },
          ]}
          onPress={confirmDelete}
        >
          <Text style={{ color: "#FFF", fontWeight: "bold" }}>Sim, Apagar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDeleteConfirm(false)}
          style={{ padding: 10 }}
        >
          <Text style={{ color: theme.text }}>Cancelar</Text>
        </TouchableOpacity>
      </GenericModal>

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
                  {editingId ? "Editar Saída" : "Nova Saída"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <AntDesign name="close" size={24} color={theme.sub} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: theme.sub }]}>
                  O que foi?
                </Text>
                <TextInput
                  placeholder="Ex: Mercado"
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
                  Quanto foi? (R$)
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
                      fontSize: 28,
                      fontWeight: "bold",
                      textAlign: "center",
                    },
                  ]}
                  value={newValue}
                  onChangeText={(t) => setNewValue(t.replace(/[^0-9.,]/g, ""))}
                />
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.sub, marginTop: 10 },
                  ]}
                >
                  Quem usufruiu?
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}
                >
                  <SelectButton
                    label="Pra Mim"
                    active={beneficiary === "me"}
                    onPress={() => setBeneficiary("me")}
                    color={theme.accent}
                    theme={theme}
                    isFemale={isFemale}
                  />
                  <SelectButton
                    label={`Pra ${partnerNickname}`}
                    active={beneficiary === "partner"}
                    onPress={() => setBeneficiary("partner")}
                    color={theme.primary}
                    theme={theme}
                    isFemale={isFemale}
                  />
                  <SelectButton
                    label="Pra Casa"
                    active={beneficiary === "couple"}
                    onPress={() => setBeneficiary("couple")}
                    color="#90A4AE"
                    theme={theme}
                    isFemale={isFemale}
                  />
                </View>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.sub, marginTop: 5 },
                  ]}
                >
                  Frequência do Pagamento
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}
                >
                  <SelectButton
                    label="Variável (Único)"
                    active={!isFixed}
                    onPress={() => setIsFixed(false)}
                    color={theme.text}
                    theme={theme}
                    isFemale={isFemale}
                    icon="bolt"
                  />
                  <SelectButton
                    label="Fixo Mensal"
                    active={isFixed}
                    onPress={() => setIsFixed(true)}
                    color={theme.primary}
                    theme={theme}
                    isFemale={isFemale}
                    icon="calendar-check"
                  />
                </View>
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
                      "health",
                      "pets",
                      "invest",
                      "other",
                    ] as const
                  ).map((cat) => {
                    const details = getCategoryDetails(cat);
                    const isSelected = newCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setNewCategory(cat)}
                        style={[
                          styles.catBadge,
                          {
                            backgroundColor: isSelected
                              ? details.color
                              : theme.bg,
                            borderColor: isSelected
                              ? details.color
                              : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                            elevation: isSelected ? 4 : 0,
                            transform: isSelected ? [{ scale: 1.05 }] : [],
                          },
                        ]}
                      >
                        <FontAwesome5
                          name={details.icon}
                          size={14}
                          color={isSelected ? "#FFF" : theme.sub}
                        />
                        <Text
                          style={{
                            marginLeft: 8,
                            color: isSelected ? "#FFF" : theme.sub,
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          {details.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                >
                  <Text
                    style={{
                      color: isFemale ? theme.text : "#FFF",
                      fontWeight: "bold",
                    }}
                  >
                    {editingId ? "Salvar Alteração" : "Lançar Gasto"}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 50 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FinanceConfigModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSave={() => loadInitialData()}
        initialIncome={monthlyIncome}
        initialMode={financeMode}
      />
    </View>
  );
}

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

const FilterChip = ({ label, active, onPress, theme, isFemale }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 25,
      backgroundColor: active ? theme.primary : theme.card,
      borderWidth: active ? 0 : 1,
      borderColor: theme.border,
      elevation: active ? 4 : 0,
    }}
  >
    <Text
      style={{
        color: active ? (isFemale ? theme.text : "#FFF") : theme.sub,
        fontWeight: "bold",
        fontSize: 12,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const SelectButton = ({
  label,
  active,
  onPress,
  color,
  theme,
  isFemale,
  icon,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.benBtn,
      active
        ? {
            backgroundColor: color,
            borderColor: color,
            borderWidth: 0,
            elevation: 4,
          }
        : {
            backgroundColor: "transparent",
            borderColor: theme.border,
            borderWidth: 1,
          },
    ]}
  >
    {icon && (
      <FontAwesome5
        name={icon}
        size={14}
        color={active ? "#FFF" : theme.sub}
        style={{ marginRight: 6 }}
      />
    )}
    <Text
      style={[
        styles.benText,
        active ? { color: "#FFF" } : { color: theme.sub },
      ]}
    >
      {label}
    </Text>
    {!icon && active && (
      <AntDesign
        name="check"
        size={14}
        color={"#FFF"}
        style={{ marginLeft: 5 }}
      />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  title: { fontSize: 24, fontWeight: "900" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
  },
  unifiedCard: {
    marginHorizontal: 20,
    padding: 25,
    borderRadius: 25,
    elevation: 4,
    marginBottom: 20,
    alignItems: "stretch",
  },
  bigBalance: { fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  progressBarBg: {
    height: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 8 },
  statCol: { alignItems: "center", flex: 1 },
  statDivider: { width: 1, height: "80%", backgroundColor: "rgba(0,0,0,0.1)" },
  chartBar: {
    width: 140,
    padding: 15,
    borderRadius: 15,
    marginRight: 10,
    justifyContent: "center",
  },
  chartIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  itemValue: { fontSize: 16, fontWeight: "bold" },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 5,
  },
  miniTagText: { fontSize: 8, color: "#FFF", fontWeight: "bold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalAlert: {
    width: "90%",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold" },
  optionMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    width: "100%",
    gap: 15,
  },
  optionMenuText: { fontSize: 16, fontWeight: "bold" },
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
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  catBadge: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginRight: 10,
    alignItems: "center",
  },
  benBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  benText: { fontWeight: "bold" },
});
