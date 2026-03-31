import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/context/ThemeContext";

type FinanceTab = "gastos" | "investimentos";

const gastosMock = [
  {
    id: "1",
    title: "Mercado",
    subtitle: "Mel • Ontem",
    amount: "- R$ 340,50",
    icon: "cart-outline" as const,
    femaleBg: "#FCE4EC",
    femaleColor: "#E91E63",
    maleBg: "#263238",
    maleColor: "#FFFFFF",
    action: "Ver",
  },
  {
    id: "2",
    title: "Internet",
    subtitle: "Marcos • Hoje",
    amount: "- R$ 129,90",
    icon: "wifi" as const,
    femaleBg: "#E3F2FD",
    femaleColor: "#1E88E5",
    maleBg: "#263238",
    maleColor: "#FFFFFF",
    action: "Ver",
  },
];

const investimentosMock = [
  {
    id: "1",
    title: "Reserva do casal",
    subtitle: "Aporte • Esta semana",
    amount: "+ R$ 500,00",
    icon: "piggy-bank-outline" as const,
    femaleBg: "#E8F5E9",
    femaleColor: "#43A047",
    maleBg: "#263238",
    maleColor: "#81C784",
    action: "Detalhes",
  },
  {
    id: "2",
    title: "MXRF11",
    subtitle: "Marcos • Hoje",
    amount: "+ R$ 300,00",
    icon: "chart-line" as const,
    femaleBg: "#FFF3E0",
    femaleColor: "#FB8C00",
    maleBg: "#263238",
    maleColor: "#FFB74D",
    action: "Detalhes",
  },
];

export default function FinanceiroScreen() {
  const { colors, isFemale } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FinanceTab>("gastos");

  const content = activeTab === "gastos" ? gastosMock : investimentosMock;
  const titleColorOnPrimary = isFemale ? "#5D4037" : "#FFFFFF";
  const lightSegmentBg = isFemale ? "#FCE4EC" : "#1A1A1A";

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />

      <View style={[styles.header, { marginTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Grana</Text>
      </View>

      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: lightSegmentBg, marginHorizontal: 20 },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === "gastos" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("gastos")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color:
                  activeTab === "gastos"
                    ? titleColorOnPrimary
                    : colors.tabInactive,
              },
            ]}
          >
            Gastos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === "investimentos" && {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => setActiveTab("investimentos")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color:
                  activeTab === "investimentos"
                    ? titleColorOnPrimary
                    : colors.tabInactive,
              },
            ]}
          >
            Investimentos
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 130,
        }}
      >
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={[styles.balanceLabel, { color: titleColorOnPrimary }]}>
            Patrimônio total acumulado
          </Text>

          <Text style={[styles.balanceValue, { color: titleColorOnPrimary }]}>
            R$ 15.450,00
          </Text>

          <View style={styles.balanceFooter}>
            <View style={styles.balancePill}>
              <MaterialCommunityIcons
                name="trending-up"
                size={16}
                color={isFemale ? "#2E7D32" : "#81C784"}
              />
              <Text
                style={[styles.balancePillText, { color: titleColorOnPrimary }]}
              >
                + R$ 250,00 este mês
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color="#FB8C00"
            />
            <Text style={[styles.statNumber, { color: colors.text }]}>2</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>
              Pendentes
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={24}
              color="#43A047"
            />
            <Text style={[styles.statNumber, { color: colors.text }]}>8</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>
              Lançados
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {activeTab === "gastos" ? "Movimentações" : "Carteira"}
          </Text>

          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{content.length}</Text>
          </View>
        </View>

        {content.map((item) => (
          <View
            key={item.id}
            style={[styles.itemCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.itemLeft}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isFemale ? item.femaleBg : item.maleBg,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={isFemale ? item.femaleColor : item.maleColor}
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

            <View style={styles.itemRight}>
              <Text style={[styles.itemAmount, { color: colors.text }]}>
                {item.amount}
              </Text>

              <TouchableOpacity
                style={[
                  styles.smallAction,
                  {
                    backgroundColor: isFemale ? "#FFF0F4" : "#263238",
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.smallActionText, { color: colors.primary }]}
                >
                  {item.action}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 34,
          },
        ]}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={activeTab === "gastos" ? "plus" : "chart-line-variant"}
          size={28}
          color={titleColorOnPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    opacity: 0.95,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 14,
  },
  balanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  balancePillText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 18,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    marginLeft: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  itemCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  smallAction: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: "800",
  },
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
});
