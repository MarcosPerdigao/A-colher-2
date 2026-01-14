import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";

type Transaction = {
  id: string;
  title: string;
  value: number;
  type: "expense" | "income";
  paidBy: "me" | "partner" | null;
  status: "paid" | "pending";
  category: "home" | "food" | "transport" | "leisure";
};

export default function FinanceScreen() {
  const { colors: theme, isFemale } = useTheme();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<"pending" | "paid">("pending");
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      title: "Aluguel",
      value: 1500.0,
      type: "expense",
      paidBy: null,
      status: "pending",
      category: "home",
    },
    {
      id: "2",
      title: "Internet",
      value: 120.0,
      type: "expense",
      paidBy: null,
      status: "pending",
      category: "home",
    },
    {
      id: "3",
      title: "Jantar Sábado",
      value: 250.0,
      type: "expense",
      paidBy: "me",
      status: "paid",
      category: "food",
    },
    {
      id: "4",
      title: "Uber Trabalho",
      value: 45.9,
      type: "expense",
      paidBy: "partner",
      status: "paid",
      category: "transport",
    },
  ]);

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
      default:
        return "wallet";
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => (
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
            ? "📅 Vence em breve"
            : `Pago por: ${item.paidBy === "me" ? "Mim" : "Parceiro"}`}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.itemValue, { color: theme.text }]}>
          R$ {item.value.toFixed(2)}
        </Text>
        {item.status === "pending" && (
          <TouchableOpacity
            style={[styles.payBtn, { borderColor: theme.success }]}
          >
            <Text
              style={{ color: theme.success, fontSize: 10, fontWeight: "bold" }}
            >
              PAGAR
            </Text>
          </TouchableOpacity>
        )}
        {item.status === "paid" && (
          <MaterialIcons name="check-circle" size={20} color={theme.success} />
        )}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={isFemale ? "dark" : "light"} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Finanças</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <MaterialIcons
            name="add"
            size={28}
            color={isFemale ? theme.text : "#FFF"}
          />
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: "900" },
  addBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
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
});
