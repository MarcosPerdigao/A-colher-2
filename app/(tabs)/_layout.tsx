import React from "react";
import { Tabs } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Ajuste do Android
import { useTheme } from "../../src/context/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          // Altura dinâmica para não ficar em cima do botão do Android
          height: 60 + insets.bottom,
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
      {/* O 'name' aqui TEM que ser igual ao nome do arquivo .tsx */}
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
          title: "Grana", // O título que aparece no menu
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
