import { Walkthrough } from "@/components/Walkthrough";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { CalendarSettingsProvider } from "@/context/CalendarSettingsContext";
import { NotificationSettingsProvider } from "@/context/NotificationSettingsContext";
import { PrayerSettingsProvider } from "@/context/PrayerSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WalkthroughProvider, useWalkthrough } from "@/context/WalkthroughContext";
import { registerNotificationCheckTask } from "@/utils/backgroundNotificationCheck";
import { registerBackgroundTask } from "@/utils/backgroundWidgetRefresh";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Dark mode prayers — must match ThemeContext's DARK_MODE_PRAYERS
const DARK_MODE_PRAYERS = ["Maghrib", "Isha"];

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const systemIsDark = colorScheme === "dark";
  const [appReady, setAppReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [initialIsDark, setInitialIsDark] = useState(systemIsDark);
  const { showWalkthrough, completeWalkthrough } = useWalkthrough();

  // Load persisted prayer/theme to determine correct initial background
  useEffect(() => {
    (async () => {
      try {
        const [savedThemePrayer, savedCurrentPrayer] = await Promise.all([
          AsyncStorage.getItem("themePrayer"),
          AsyncStorage.getItem("lastCurrentPrayer"),
        ]);
        const activePrayer = savedThemePrayer || savedCurrentPrayer;
        if (activePrayer) {
          setInitialIsDark(DARK_MODE_PRAYERS.includes(activePrayer));
        }
      } catch (error) {
        console.error("Error loading initial theme:", error);
      } finally {
        setThemeReady(true);
      }
    })();
  }, []);

  // Register background tasks for widget refresh and notification verification
  useEffect(() => {
    registerBackgroundTask();
    registerNotificationCheckTask();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady && minTimePassed && themeReady && showWalkthrough !== null) {
      SplashScreen.hideAsync();
    }
  }, [appReady, minTimePassed, themeReady, showWalkthrough]);

  const onLayoutReady = useCallback(() => {
    setAppReady(true);
  }, []);

  const bgColor = initialIsDark
    ? darkModeColors.background
    : lightModeColors.background;

  // Show walkthrough on first launch
  if (showWalkthrough) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutReady}>
        <Walkthrough onComplete={completeWalkthrough} />
      </View>
    );
  }

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

export default function RootLayout() {
  return (
    <WalkthroughProvider>
      <RootLayoutContent />
    </WalkthroughProvider>
  );
}
