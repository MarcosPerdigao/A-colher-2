import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/context/ThemeContext";

export default function FinanceiroScreen() {
  const { colors, isFemale } = useTheme();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const checkProtection = async () => {
        if (isMounted) setIsChecking(true);

        // Puxa do banco a preferência do Perfil
        const protectedPref = await AsyncStorage.getItem("@finance_protected");

        if (isMounted) {
          // Se estiver explicitamente desligado ("false"), o cofre abre direto.
          // Se estiver "true" ou não existir, ele tranca.
          if (protectedPref === "false") {
            setIsUnlocked(true);
          } else {
            setIsUnlocked(false);
          }
          setIsChecking(false);
        }
      };

      checkProtection();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  // Botão que simula você digitando a senha
  const handleMockAuthenticate = () => {
    setIsUnlocked(true);
  };

  // 1. TELA DE CARREGAMENTO RÁPIDO
  if (isChecking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 2. TELA DE BLOQUEIO (COFRE FECHADO)
  if (!isUnlocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={80}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          Cofre Bloqueado
        </Text>
        <Text
          style={[styles.subtitle, { color: isFemale ? "#A1887F" : "#90A4AE" }]}
        >
          Área financeira protegida.
        </Text>

        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: colors.primary }]}
          onPress={handleMockAuthenticate}
        >
          <MaterialCommunityIcons
            name="lock-open-variant"
            size={24}
            color="#FFF"
          />
          <Text style={styles.authButtonText}>Desbloquear Cofre</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. MÓDULO FINANCEIRO ABERTO (DASHBOARD)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          justifyContent: "flex-start",
          paddingTop: 60,
        },
      ]}
    >
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, marginTop: 0 }]}>
            Meu Patrimônio
          </Text>
          <Text style={{ color: colors.sub, fontSize: 14 }}>
            Visão Geral do Casal
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsUnlocked(false)}
          style={{ padding: 5 }}
        >
          <MaterialCommunityIcons
            name="lock-open-outline"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* SALDO TOTAL (FIIs + Renda Fixa) */}
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Patrimônio Total Acumulado</Text>
        <Text style={styles.balanceValue}>R$ 15.450,00</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balancePill}>
            <MaterialCommunityIcons
              name="trending-up"
              size={16}
              color="#4CAF50"
            />
            <Text style={styles.balancePillText}>+ R$ 250,00 este mês</Text>
          </View>
        </View>
      </View>

      {/* CAIXA DE ENTRADA (Lançamentos Pendentes) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Caixa de Entrada
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={styles.badgeText}>2</Text>
        </View>
      </View>

      {/* LISTA DE LANÇAMENTOS */}
      <ScrollView
        style={{ width: "100%" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Gasto da Mel */}
        <View
          style={[styles.transactionCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.transactionLeft}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: isFemale ? "#FCE4EC" : "#37474F" },
              ]}
            >
              <MaterialCommunityIcons
                name="shopping-outline"
                size={24}
                color={isFemale ? "#E91E63" : "#FFF"}
              />
            </View>
            <View>
              <Text style={[styles.transactionTitle, { color: colors.text }]}>
                Mercado Extra
              </Text>
              <Text style={[styles.transactionSub, { color: colors.sub }]}>
                Mel • Ontem
              </Text>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[styles.transactionAmount, { color: "#e74c3c" }]}>
              - R$ 340,50
            </Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={[styles.actionText, { color: colors.primary }]}>
                Aprovar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card 2: Seu Aporte de FII */}
        <View
          style={[styles.transactionCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.transactionLeft}>
            <View style={[styles.iconBox, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons
                name="chart-line"
                size={24}
                color="#4CAF50"
              />
            </View>
            <View>
              <Text style={[styles.transactionTitle, { color: colors.text }]}>
                Aporte MXRF11
              </Text>
              <Text style={[styles.transactionSub, { color: colors.sub }]}>
                Marcos • Hoje
              </Text>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[styles.transactionAmount, { color: "#4CAF50" }]}>
              + R$ 500,00
            </Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={[styles.actionText, { color: colors.primary }]}>
                Aprovar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", marginTop: 20 },
  subtitle: { fontSize: 16, marginTop: 10, textAlign: "center" },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 40,
    gap: 10,
  },
  authButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },

  // ESTILOS NOVOS DO DASHBOARD
  balanceCard: {
    width: "100%",
    borderRadius: 20,
    padding: 25,
    marginTop: 20,
    marginBottom: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 5,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 15,
  },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  balancePill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  balancePillText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  transactionCard: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
  },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionTitle: { fontSize: 16, fontWeight: "bold" },
  transactionSub: { fontSize: 12, marginTop: 2 },
  transactionRight: { alignItems: "flex-end", gap: 5 },
  transactionAmount: { fontSize: 16, fontWeight: "bold" },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  actionText: { fontSize: 12, fontWeight: "bold" },
});
