import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { FinanceService } from "../services/finance";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initialIncome?: number;
  initialMode?: "unified" | "split";
}

export function FinanceConfigModal({
  visible,
  onClose,
  onSave,
  initialIncome = 0,
  initialMode = "unified",
}: Props) {
  const { colors: theme, isFemale } = useTheme();

  const [mode, setMode] = useState<"unified" | "split">(initialMode);
  const [income, setIncome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode(initialMode || "unified");
      setIncome(
        initialIncome > 0 ? initialIncome.toFixed(2).replace(".", ",") : "",
      );
    }
  }, [visible, initialIncome, initialMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const incomeVal = parseFloat(income.replace(/\./g, "").replace(",", "."));
      const finalIncome = isNaN(incomeVal) ? 0 : incomeVal;

      await FinanceService.saveSettings({
        mode: mode,
        monthlyIncome: finalIncome,
      });

      onSave();
      onClose();
    } catch (error) {
      console.log("Erro ao salvar config", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            Configuração Financeira
          </Text>
          <Text
            style={{ color: theme.sub, textAlign: "center", marginBottom: 20 }}
          >
            Como vocês vão gerenciar a grana?
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              style={[
                styles.btn,
                mode === "unified"
                  ? {
                      borderColor: theme.primary,
                      backgroundColor: theme.primary + "20",
                      borderWidth: 2,
                    }
                  : { borderColor: theme.border, borderWidth: 1 },
              ]}
              onPress={() => setMode("unified")}
            >
              <FontAwesome5
                name="users"
                size={24}
                color={mode === "unified" ? theme.primary : theme.sub}
              />
              <Text
                style={{ fontWeight: "bold", color: theme.text, marginTop: 5 }}
              >
                Juntar Tudo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                mode === "split"
                  ? {
                      borderColor: theme.primary,
                      backgroundColor: theme.primary + "20",
                      borderWidth: 2,
                    }
                  : { borderColor: theme.border, borderWidth: 1 },
              ]}
              onPress={() => setMode("split")}
            >
              <FontAwesome5
                name="handshake"
                size={24}
                color={mode === "split" ? theme.primary : theme.sub}
              />
              <Text
                style={{ fontWeight: "bold", color: theme.text, marginTop: 5 }}
              >
                Dividir
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "unified" && (
            <View style={{ width: "100%" }}>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  marginBottom: 5,
                }}
              >
                Renda Total do Casal (Mensal)
              </Text>
              <TextInput
                placeholder="0,00"
                placeholderTextColor={theme.sub}
                value={income}
                onChangeText={(t) => setIncome(t.replace(/[^0-9.,]/g, ""))}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                  },
                ]}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text
                style={{
                  fontWeight: "bold",
                  color: isFemale ? theme.text : "#FFF",
                }}
              >
                SALVAR
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 15, padding: 10 }}
          >
            <Text style={{ color: theme.sub }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  btn: {
    flex: 1,
    height: 110,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  saveBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
});
