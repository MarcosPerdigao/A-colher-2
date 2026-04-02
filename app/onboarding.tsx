import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/context/ThemeContext";
import { Fonts } from "../constants/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "A Colher",
    description:
      "A vida a dois sem brigas, sem cobranças chatas e com muita parceria. Vamos organizar essa bagunça?",
    icon: "spoon-sugar",
    color: "#FF4081",
  },
  {
    id: "2",
    title: "Mural em Tempo Real",
    description:
      "Crie tarefas, delegue ou deixe o Juiz sortear. Tudo sincronizado no mesmo segundo para o casal.",
    icon: "clipboard-check-outline",
    color: "#2196F3",
  },
  {
    id: "3",
    title: "O Juiz Decide",
    description:
      "Não concordam quem vai lavar a louça? Clique no Juiz! Ele sorteia e a decisão é IMUTÁVEL.",
    icon: "gavel",
    color: "#9C27B0",
  },
  {
    id: "4",
    title: "Contas Transparentes",
    description:
      "Cadastre despesas e receitas. O app calcula o saldo de vocês e cria categorias inteligentes.",
    icon: "piggy-bank",
    color: "#4CAF50",
  },
  {
    id: "5",
    title: "Notificações na Hora",
    description:
      "O parceiro(a) recebe um aviso no celular assim que você delegar uma tarefa ou registrar um gasto.",
    icon: "bell-ring-outline",
    color: "#FF9800",
  },
  {
    id: "6",
    title: "Prontos?",
    description: "Vincule o seu código e comecem a somar pontos na vida real!",
    icon: "heart-multiple",
    color: "#E91E63",
  },
];

export default function OnboardingScreen() {
  const { colors, isFemale } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleFinish = async () => {
    await AsyncStorage.setItem("@app_has_seen_tutorial", "true");
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1)
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    else handleFinish();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isFemale ? "dark-content" : "light-content"} />
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }: any) => (
          <View style={[styles.slide, { backgroundColor: colors.bg }]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.color + "20" },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={100}
                color={item.color}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.description, { color: colors.sub }]}>
              {item.description}
            </Text>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) =>
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      />
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  currentIndex === index ? colors.primary : colors.border,
                width: currentIndex === index ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30 },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text
            style={[
              styles.buttonText,
              { color: isFemale ? "#5D4037" : "#FFF" },
            ]}
          >
            {currentIndex === SLIDES.length - 1 ? "ENTENDIDO" : "PRÓXIMO"}
          </Text>
          <MaterialCommunityIcons
            name={currentIndex === SLIDES.length - 1 ? "check" : "arrow-right"}
            size={20}
            color={isFemale ? "#5D4037" : "#FFF"}
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleFinish} style={{ marginTop: 15 }}>
            <Text
              style={{
                color: colors.sub,
                textDecorationLine: "underline",
                fontFamily: Fonts.regular,
              }}
            >
              Pular
            </Text>
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.black,
    marginBottom: 15,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 320,
    fontFamily: Fonts.regular,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  footer: { paddingHorizontal: 20, alignItems: "center", width: "100%" },
  button: {
    flexDirection: "row",
    width: "100%",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonText: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: 1 },
});
