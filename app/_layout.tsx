import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Comando Geral
        contentStyle: { backgroundColor: "#FFF" }, // Fundo branco padrão
        animation: "fade_from_bottom", // Animação suave
      }}
    >
      {/* Forçando individualmente em cada rota para garantir */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="cadastro" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="mural" options={{ headerShown: false }} />
    </Stack>
  );
}
