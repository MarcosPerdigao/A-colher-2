import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { auth } from "../firebaseConfig";
import { ThemeProvider } from "../src/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const [fontsLoaded, fontError] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_SemiBold: Poppins_600SemiBold,
    Poppins_Bold: Poppins_700Bold,
    Poppins_Black: Poppins_900Black,
  });

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";
    const inVincular = segments[0] === "vincular";
    const isAtRoot = !segments[0];

    if (user && !inAuthGroup && !inOnboarding && !inVincular && !isAtRoot) {
      router.replace("/(tabs)/mural");
    } else if (!user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, initializing, segments, navigationState?.key]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !initializing && navigationState?.key) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, initializing, navigationState?.key]);

  if (initializing || !navigationState?.key || (!fontsLoaded && !fontError)) {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
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
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
