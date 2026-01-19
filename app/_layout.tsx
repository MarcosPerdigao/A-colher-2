import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { ThemeProvider } from "../src/context/ThemeContext";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  // --- O GUARDA DE TRÂNSITO CORRIGIDO 👮‍♂️ ---
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "(tabs)";
    // Nova regra: Verifica se o usuário está no onboarding
    const inOnboarding = segments[0] === "onboarding";

    if (user && !inAuthGroup && !inOnboarding) {
      // Se tá logado, NÃO tá nas abas E NÃO tá no tutorial -> Manda pro Mural
      // (Isso impede que ele volte pra tela de login, mas deixa ele ver o tutorial)
      router.replace("/(tabs)/mural");
    } else if (!user && inAuthGroup) {
      // Se NÃO tá logado e tenta entrar no Mural -> Chuta pro Login
      router.replace("/");
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#121212",
        }}
      >
        <ActivityIndicator size="large" color="#FFD1DC" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
