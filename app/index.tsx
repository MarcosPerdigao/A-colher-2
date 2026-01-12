import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Simula delay de login
    setTimeout(() => {
      setLoading(false);
      // Vai limpo para o cadastro, sem dados fake
      router.replace("/cadastro");
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.logoContainer}>
        <View style={styles.circle}>
          <Text style={styles.emoji}>🥄</Text>
        </View>
        <Text style={styles.title}>A Colher</Text>
        <Text style={styles.subtitle}>Organize a vida a dois sem tretas.</Text>
      </View>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color="#FFAB91" />
        ) : (
          <TouchableOpacity style={styles.googleButton} onPress={handleLogin}>
            <AntDesign
              name="google"
              size={24}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.googleText}>Entrar com Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    padding: 25,
    justifyContent: "center",
  },
  logoContainer: { alignItems: "center", flex: 2, justifyContent: "center" },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFAB91",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
  },
  emoji: { fontSize: 60 },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 10,
  },
  subtitle: { fontSize: 16, color: "#8D6E63", textAlign: "center" },
  footer: { flex: 1, justifyContent: "center", width: "100%" },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#DB4437",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  icon: { marginRight: 15 },
  googleText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
