import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import {
  darkModeColors,
  lightModeColors,
  prayerThemeColors,
} from "@/constants/prayers";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import { useAnimatedBackgroundColor } from "@/hooks/useAnimatedColor";
import { useLocation } from "@/hooks/useLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { cleanTimeString } from "@/utils/prayerHelpers";
import { updateWidgetPrayerTimes } from "@/utils/widgetStorage";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import Animated from "react-native-reanimated";

function TabBarBackground() {
  const { isDarkMode } = useThemeColors();
  // isDarkMode from context already falls back to system color scheme
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);

  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
        animatedBgStyle,
      ]}
    />
  );
}

export default function TabLayout() {
  const { colors, setColors, themePrayer, setCurrentPrayer, isDarkMode } =
    useThemeColors();
  const { settings: prayerSettings } = usePrayerSettings();
  const { location, locationName } = useLocation();
  const { currentPrayer, prayerDict, todayISO } = usePrayerTimes(location);

  // isDarkMode from context already falls back to system color scheme
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;

  // Update theme colors based on current prayer (only if no theme override is set)
  useEffect(() => {
    if (!themePrayer && currentPrayer?.prayer) {
      const prayerName = currentPrayer.prayer as keyof typeof prayerThemeColors;
      const themeColors = prayerThemeColors[prayerName];
      if (themeColors) {
        setColors({
          active: themeColors.active,
          inactive: themeColors.inactive,
        });
      }
      setCurrentPrayer(currentPrayer.prayer as any);
    }
  }, [currentPrayer, setColors, themePrayer, setCurrentPrayer]);

  // Sync prayer times with iOS widget
  useEffect(() => {
    const todayPrayers = prayerDict[todayISO];
    if (todayPrayers?.timings) {
      // Calculate tomorrow's date for Fajr time
      const tomorrow = new Date(todayISO);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split("T")[0];
      const tomorrowPrayers = prayerDict[tomorrowISO];

      updateWidgetPrayerTimes({
        fajr: cleanTimeString(todayPrayers.timings.Fajr),
        sunrise: cleanTimeString(todayPrayers.timings.Sunrise),
        dhuhr: cleanTimeString(todayPrayers.timings.Dhuhr),
        asr: cleanTimeString(todayPrayers.timings.Asr),
        maghrib: cleanTimeString(todayPrayers.timings.Maghrib),
        isha: cleanTimeString(todayPrayers.timings.Isha),
        tomorrowFajr: tomorrowPrayers?.timings?.Fajr
          ? cleanTimeString(tomorrowPrayers.timings.Fajr)
          : null,
        currentPrayer: currentPrayer?.prayer || null,
        locationName: locationName || null,
        lastUpdated: new Date().toISOString(),
        accentColor: colors.active,
        isDarkMode: isDarkMode,
        themePrayer: themePrayer || null,
        timeFormat: prayerSettings.timeFormat,
      });
    }
  }, [prayerDict, todayISO, currentPrayer, locationName, colors, isDarkMode, themePrayer, prayerSettings.timeFormat]);

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: bgColor }}
      screenOptions={{
        lazy: false,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0,
          height: 80,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 6,
          paddingBottom: 12,
          backgroundColor: "transparent",
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AnimatedTintIcon
              source={require("../../assets/images/prayer-pro-icons/bottom-tab/icon-home.png")}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AnimatedTintIcon
              source={require("../../assets/images/prayer-pro-icons/bottom-tab/icon-compass.png")}
              size={28}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AnimatedTintIcon
              source={require("../../assets/images/prayer-pro-icons/bottom-tab/icon-calendar.png")}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings-tabs"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AnimatedTintIcon
              source={require("../../assets/images/prayer-pro-icons/bottom-tab/icon-settings.png")}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
