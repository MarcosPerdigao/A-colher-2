import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeType = "masculino" | "feminino";

interface ThemeContextData {
  themeMode: ThemeType;
  isFemale: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
  colors: any;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeType>("masculino");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem("@app_theme");
    if (saved === "feminino" || saved === "masculino") {
      setThemeMode(saved);
    }
  };

  const toggleTheme = async () => {
    const newTheme = themeMode === "masculino" ? "feminino" : "masculino";
    setThemeMode(newTheme);
    await AsyncStorage.setItem("@app_theme", newTheme);
  };

  const setTheme = async (t: ThemeType) => {
    setThemeMode(t);
    await AsyncStorage.setItem("@app_theme", t);
  };

  const isFemale = themeMode === "feminino";

  const colors = isFemale
    ? {
        bg: "#FFF5F7",
        primary: "#FFD1DC",
        accent: "#B2E2F2",
        card: "#FFFFFF",
        text: "#5D4037",
        sub: "#A1887F",
        border: "#FFECF1",
        success: "#81C784",
        danger: "#FF5252",
        tabActive: "#FFD1DC",
        tabInactive: "#A1887F",
      }
    : {
        bg: "#121212",
        primary: "#37474F",
        accent: "#546E7A",
        card: "#1E1E1E",
        text: "#ECEFF1",
        sub: "#90A4AE",
        border: "#333",
        success: "#66BB6A",
        danger: "#EF5350",
        tabActive: "#546E7A",
        tabInactive: "#555",
      };

  return (
    <ThemeContext.Provider
      value={{ themeMode, isFemale, toggleTheme, setTheme, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
