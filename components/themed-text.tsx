import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Fonts } from "../constants/theme"; // Importamos as nossas fontes

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return (
    <Text
      style={[
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.regular, // Fonte normal
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.semiBold, // Fonte semi-negrito
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: Fonts.bold, // Fonte negrito
  },
  subtitle: {
    fontSize: 20,
    fontFamily: Fonts.bold, // Fonte negrito
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
    fontFamily: Fonts.regular,
  },
});
