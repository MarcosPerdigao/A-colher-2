import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function CustomAlert({
  visible,
  title,
  message,
  type = "info",
  onClose,
}: CustomAlertProps) {
  // Cores baseadas no tipo
  const colors = {
    success: "#81C784",
    error: "#FF5252",
    info: "#FFD1DC", // Rosa padrão do app
  };

  const iconName =
    type === "success"
      ? "check-circle"
      : type === "error"
      ? "alert-circle"
      : "information";
  const mainColor = colors[type];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <MaterialCommunityIcons
            name={iconName}
            size={50}
            color={mainColor}
            style={{ marginBottom: 10 }}
          />

          <Text
            style={[
              styles.title,
              { color: type === "info" ? "#5D4037" : mainColor },
            ]}
          >
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={onClose}
          >
            <Text
              style={[
                styles.btnText,
                { color: type === "info" ? "#5D4037" : "#FFF" },
              ]}
            >
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  btnText: { fontWeight: "bold", fontSize: 16 },
});
