import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform } from "react-native"; // <--- Add Platform
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import * as NavigationBar from "expo-navigation-bar"; // <--- Add a Lib aqui
import { auth } from "../firebaseConfig";
import { ThemeProvider } from "../src/context/ThemeContext";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // 1. BLINDAGEM DA BARRA (ANDROID) - Para atender os dois temas sem piscar branco
  useEffect(() => {
    if (Platform.OS === "android") {
      // Define a base como escura para não dar conflito com o teclado
      NavigationBar.setBackgroundColorAsync("#121212");
      NavigationBar.setButtonStyleAsync("light");
    }
  }, []);

  // 2. OUVINTE DO FIREBASE
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  // 3. O GUARDA DE TRÂNSITO BLINDADO
  useEffect(() => {
    if (initializing) return;
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";
    const inVincular = segments[0] === "vincular";

    // Verificação de Raiz segura
    const isAtRoot = !segments[0];

    if (user && !inAuthGroup && !inOnboarding && !inVincular && !isAtRoot) {
      router.replace("/(tabs)/mural");
    } else if (!user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, initializing, segments, navigationState?.key]);

  // Tela de Carregamento
  if (initializing || !navigationState?.key) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#121212", // Fundo escuro para combinar com a barra
        }}
      >
        <ActivityIndicator size="large" color="#FFD1DC" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="vincular" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
