import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/context/ThemeContext";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Bem-vindo ao\nA Colher 🥄",
    description:
      "O app definitivo para organizar a vida a dois, dividir tarefas e evitar as DRs desnecessárias.",
    icon: "heart-multiple",
  },
  {
    id: "2",
    title: "Mural de Tarefas",
    description:
      "Cadastre o que precisa ser feito, defina quem faz e acompanhe. Tudo com prazos e prioridades.",
    icon: "clipboard-list-outline",
  },
  {
    id: "3",
    title: "Finanças do Casal",
    description:
      "Controle quem pagou o quê. Adicione contas, marque como pagas e tenha transparência total.",
    icon: "piggy-bank-outline",
  },
  {
    id: "4",
    title: "Gamificação",
    description:
      'Ganhe pontos por tarefas feitas! Use o "Juiz" para decidir impasses e suba no ranking do amor.',
    icon: "trophy-outline",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isFemale } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    // Marca que o usuário já viu o tutorial
    await AsyncStorage.setItem("@app_has_seen_tutorial", "true");
    // Manda para a tela de login/inicial
    router.replace("/");
  };

  const renderItem = ({ item }: { item: (typeof SLIDES)[0] }) => {
    return (
      <View style={[styles.slide, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isFemale ? "#FFF0F5" : "#ECEFF1" },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={100}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.sub }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isFemale ? "dark" : "light"} />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        {/* Indicadores (Bolinhas) */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor:
                    currentIndex === index ? colors.primary : "#E0E0E0",
                  width: currentIndex === index ? 20 : 10,
                },
              ]}
            />
          ))}
        </View>

        {/* Botão de Ação */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text
            style={{
              color: isFemale ? colors.text : "#FFF",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {currentIndex === SLIDES.length - 1 ? "COMEÇAR" : "PRÓXIMO"}
          </Text>
        </TouchableOpacity>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finishOnboarding} style={{ padding: 10 }}>
            <Text style={{ color: colors.sub }}>Pular tutorial</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, alignItems: "center", justifyContent: "center", padding: 20 },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    height: height * 0.2,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  indicatorContainer: { flexDirection: "row", gap: 8 },
  indicator: { height: 10, borderRadius: 5 },
  button: {
    width: "80%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
});
