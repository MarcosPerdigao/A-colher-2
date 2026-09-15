import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme"; // <-- IMPORT DA FONTE

export default function TaskCard({
  item,
  theme,
  myNickname,
  formatDate,
  onPress,
  onLongPress,
  myPhoto,
  partnerPhoto,
}: any) {
  const isJudgeTask = item.createdBy === "Juiz";

  const isMyTask =
    item.assignedToNickname === "me" || item.assignedToNickname === myNickname;

  const assignedPhoto = isMyTask ? myPhoto : partnerPhoto;

  const getPriorityColor = () => {
    switch (item.priority) {
      case "high":
        return "#FF5252";
      case "medium":
        return "#FFCA28";
      case "low":
        return "#66BB6A";
      default:
        return theme.sub;
    }
  };

  const priorityColor = getPriorityColor();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isJudgeTask ? "#9C27B0" : theme.border,
          borderWidth: isJudgeTask ? 1.5 : 1,
          borderLeftWidth: 6,
          borderLeftColor: priorityColor,
          opacity: item.completed ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.date, { color: theme.sub }]}>
            {item.date || "Sem data"}
          </Text>
        </View>

        {!item.completed && assignedPhoto ? (
          <Image source={{ uri: assignedPhoto }} style={styles.miniAvatar} />
        ) : !item.completed ? (
          <Text
            style={{ fontSize: 10, color: theme.sub, fontFamily: Fonts.bold }}
          >
            {isMyTask ? "VOCÊ" : item.assignedToNickname}
          </Text>
        ) : null}

        {item.completed && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={theme.success}
          />
        )}
      </View>

      <View style={{ marginTop: 8 }}>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
              textDecorationLine: item.completed ? "line-through" : "none",
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.observation ? (
          <Text style={[styles.obs, { color: theme.sub }]} numberOfLines={1}>
            {item.observation}
          </Text>
        ) : null}
      </View>

      {item.completed && (
        <View
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: theme.bg,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: theme.sub,
              fontFamily: Fonts.regular,
            }}
          >
            Feito por{" "}
            {item.completedByNickname === myNickname
              ? "mim"
              : item.completedByNickname}{" "}
            às {formatDate(item.completedAt)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  obs: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.regular,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
});
