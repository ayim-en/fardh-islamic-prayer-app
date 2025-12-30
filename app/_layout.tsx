import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { CalendarSettingsProvider } from "@/context/CalendarSettingsContext";
import { NotificationSettingsProvider } from "@/context/NotificationSettingsContext";
import { PrayerSettingsProvider } from "@/context/PrayerSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { Appearance, useColorScheme, View } from "react-native";
import { Colors, Spacings, Typography } from "react-native-ui-lib";
import "./global.css";

// Keep splash screen visible until ready
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 100,
  fade: true,
});

// Get initial color scheme at module load time to prevent flash
const initialColorScheme = Appearance.getColorScheme();
const initialBgColor =
  initialColorScheme === "dark"
    ? darkModeColors.background
    : lightModeColors.background;

Colors.loadColors({
  primary: "#3B82F6",
  background: initialBgColor,
  text: "#111",
  tabActive: "#568FAF",
  tabInactive: "#8398a3",
});

Typography.loadTypographies({
  heading: { fontSize: 22, fontWeight: "600" },
  body: { fontSize: 16 },
});

Spacings.loadSpacings({
  page: 16,
  card: 8,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [appReady, setAppReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady && minTimePassed) {
      SplashScreen.hideAsync();
    }
  }, [appReady, minTimePassed]);

  const onLayoutReady = useCallback(() => {
    setAppReady(true);
  }, []);

  const bgColor = isDark
    ? darkModeColors.background
    : lightModeColors.background;

  return (
    <View
      style={{ flex: 1, backgroundColor: bgColor }}
      onLayout={onLayoutReady}
    >
      <PrayerSettingsProvider>
        <CalendarSettingsProvider>
          <NotificationSettingsProvider>
            <ThemeProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: bgColor,
                  },
                }}
              />
            </ThemeProvider>
          </NotificationSettingsProvider>
        </CalendarSettingsProvider>
      </PrayerSettingsProvider>
    </View>
  );
}
