import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Task } from "../services/tasks";

interface Props {
  item: Task & {
    photo?: string;
    assignedToNickname?: string;
    completedByNickname?: string;
    completedAt?: string;
  };
  theme: any;
  onPress: () => void;
  onLongPress: () => void;
  myNickname: string;
  formatDate: (date?: string) => string;
}

const priorityColors = { high: "#EF5350", medium: "#FFCA28", low: "#66BB6A" };

export default function TaskCard({
  item,
  theme,
  onPress,
  onLongPress,
  myNickname,
  formatDate,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.card,
          borderLeftColor: priorityColors[item.priority || "medium"],
          borderLeftWidth: 6,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskText,
            { color: theme.text },
            item.completed && styles.taskTextDone,
          ]}
        >
          {item.title}
        </Text>
        <View style={{ marginLeft: 15, marginTop: 4 }}>
          {item.observation ? (
            <Text style={{ color: theme.sub, fontSize: 12, marginBottom: 2 }}>
              📝 {item.observation}
            </Text>
          ) : null}
          <Text style={{ color: theme.sub, fontSize: 12 }}>📅 {item.date}</Text>

          {!item.completed && item.assignedToNickname ? (
            <Text
              style={{
                color: theme.primary,
                fontWeight: "bold",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              👤 Para:{" "}
              {item.assignedToNickname === myNickname
                ? "Você"
                : item.assignedToNickname}
            </Text>
          ) : null}

          {item.completed && item.completedByNickname ? (
            <Text
              style={{
                color: theme.success,
                fontWeight: "bold",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              ✅ Feito por: {item.completedByNickname} -{" "}
              {formatDate(item.completedAt)}
            </Text>
          ) : null}
        </View>
      </View>
      {item.photo ? (
        <Image
          source={{ uri: item.photo }}
          style={{ width: 45, height: 45, borderRadius: 10 }}
        />
      ) : (
        <MaterialIcons
          name={item.completed ? "check-circle" : "panorama-fish-eye"}
          size={28}
          color={item.completed ? "#81C784" : theme.sub}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  taskText: { fontSize: 16, fontWeight: "700", marginLeft: 15 },
  taskTextDone: { textDecorationLine: "line-through", opacity: 0.4 },
});
