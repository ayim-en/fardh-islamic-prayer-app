import { Prayer, prayerThemeColors } from "@/constants/prayers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

const THEME_STORAGE_KEY = "themePrayer";
const APP_ICON_STORAGE_KEY = "appIcon";

export type AppIconType = "default" | "light" | "dark";

interface ThemeColors {
  active: string;
  inactive: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
  // Theme override - allows manual selection of prayer theme
  themePrayer: Prayer | null;
  setThemePrayer: (prayer: Prayer | null) => void;
  // Dark mode for Maghrib and Isha
  isDarkMode: boolean;
  currentPrayer: Prayer | null;
  setCurrentPrayer: (prayer: Prayer | null) => void;
  // App icon preference
  appIcon: AppIconType;
  setAppIcon: (icon: AppIconType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Prayers that trigger dark mode
const DARK_MODE_PRAYERS: Prayer[] = ["Maghrib", "Isha"];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const systemIsDark = colorScheme === "dark";

  const [colors, setColors] = useState<ThemeColors>({
    active: "#568FAF",
    inactive: "#8398a3",
  });

  // Theme override: allow manual selection of prayer theme
  const [themePrayer, setThemePrayer] = useState<Prayer | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Track the current prayer for dark mode calculation
  const [currentPrayer, setCurrentPrayer] = useState<Prayer | null>(null);

  // App icon preference
  const [appIcon, setAppIcon] = useState<AppIconType>("default");

  // Load saved theme and app icon from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTheme, savedIcon] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(APP_ICON_STORAGE_KEY),
        ]);
        if (savedTheme) {
          setThemePrayer(savedTheme as Prayer);
        }
        if (savedIcon) {
          setAppIcon(savedIcon as AppIconType);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Save theme to AsyncStorage when it changes
  useEffect(() => {
    if (!themeLoaded) return; // Don't save during initial load
    const saveTheme = async () => {
      try {
        if (themePrayer) {
          await AsyncStorage.setItem(THEME_STORAGE_KEY, themePrayer);
        } else {
          await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    };
    saveTheme();
  }, [themePrayer, themeLoaded]);

  // Save app icon preference to AsyncStorage when it changes
  useEffect(() => {
    if (!themeLoaded) return;
    const saveAppIcon = async () => {
      try {
        await AsyncStorage.setItem(APP_ICON_STORAGE_KEY, appIcon);
      } catch (error) {
        console.error("Error saving app icon:", error);
      }
    };
    saveAppIcon();
  }, [appIcon, themeLoaded]);

  // Calculate dark mode based on theme prayer or current prayer
  // Falls back to system color scheme when no prayer is loaded
  const activePrayer = themePrayer || currentPrayer;
  const isDarkMode = activePrayer
    ? DARK_MODE_PRAYERS.includes(activePrayer)
    : systemIsDark;

  // Override colors when themePrayer is set
  const effectiveSetColors = useCallback((newColors: ThemeColors) => {
    if (!themePrayer) {
      setColors(newColors);
    }
  }, [themePrayer]);

  // Apply theme prayer colors when themePrayer changes
  React.useEffect(() => {
    if (themePrayer) {
      const themeColors = prayerThemeColors[themePrayer];
      if (themeColors) {
        setColors(themeColors);
      }
    }
  }, [themePrayer]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        setColors: effectiveSetColors,
        themePrayer,
        setThemePrayer,
        isDarkMode,
        currentPrayer,
        setCurrentPrayer,
        appIcon,
        setAppIcon,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeColors = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeColors must be used within ThemeProvider");
  }
  return context;
};
