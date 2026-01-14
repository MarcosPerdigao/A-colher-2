import { Stack } from "expo-router";
import { ThemeProvider } from "../src/context/ThemeContext";

export default function RootLayout() {
  return (
    // Esse Provider é obrigatório aqui para o Login funcionar
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}