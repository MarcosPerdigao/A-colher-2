import React from "react";
import { Tabs } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // <--- O SEGREDO TÁ AQUI
import { useTheme } from "../../src/context/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets(); // Pega as medidas da tela segura

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          
          // AJUSTE DINÂMICO PARA ANDROID E IPHONE:
          // Altura = 60px (padrão) + o tamanho da barra de sistema do celular
          height: 60 + insets.bottom,
          // Espaço interno = 10px (respiro) + o tamanho da barra de sistema
          paddingBottom: 10 + insets.bottom,
          
          elevation: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.sub,
        tabBarLabelStyle: {
          fontWeight: "bold",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="mural"
        options={{
          title: "Mural",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="financeiro"
        options={{
          title: "Grana",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="piggy-bank" size={size - 4} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="user-circle" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}