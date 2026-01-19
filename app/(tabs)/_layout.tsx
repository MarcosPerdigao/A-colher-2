import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
// Importando os ícones (com o Porquinho e as versões Outline/Filled)
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // <--- IMPORTANTE
import { useTheme } from "../../src/context/ThemeContext";

export default function TabLayout() {
  const { colors, isFemale } = useTheme();
  const insets = useSafeAreaInsets(); // <--- O DETECTOR DE BORDAS

  // --- DEFINIÇÃO MANUAL DAS CORES ---
  const ACESA = colors.primary;
  // Se for tema claro (Ela): Cinza médio (#90A4AE)
  // Se for tema escuro (Ele): Cinza escuro (#546E7A)
  const APAGADA = isFemale ? "#90A4AE" : "#546E7A";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Essas linhas ajudam o texto a seguir a cor certa
        tabBarActiveTintColor: ACESA,
        tabBarInactiveTintColor: APAGADA,

        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: "transparent",
          elevation: 0,

          // --- AQUI ESTÁ A MÁGICA PARA O ANDROID (S25) ---
          // A altura total é o tamanho do menu (60) + o espaço da barra do sistema
          height: 60 + insets.bottom,
          // O padding empurra os ícones para cima da barra do sistema
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },

        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
          marginBottom: 5,
        },
      }}
    >
      {/* 1. MURAL */}
      <Tabs.Screen
        name="mural"
        options={{
          title: "Mural",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "clipboard-text" : "clipboard-text-outline"}
              size={28}
              color={focused ? ACESA : APAGADA}
            />
          ),
        }}
      />

      {/* 2. GRANA (Porquinho 🐷) */}
      <Tabs.Screen
        name="financeiro"
        options={{
          title: "Grana",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "piggy-bank" : "piggy-bank-outline"}
              size={28}
              color={focused ? ACESA : APAGADA}
            />
          ),
        }}
      />

      {/* 3. PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "account" : "account-outline"}
              size={28}
              color={focused ? ACESA : APAGADA}
            />
          ),
        }}
      />
    </Tabs>
  );
}
