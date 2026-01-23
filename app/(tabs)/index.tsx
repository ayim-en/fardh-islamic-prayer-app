import type { PrayerCarouselRef } from "@/components/PrayerCarousel";
import { PrayerCarousel } from "@/components/PrayerCarousel";
import { PrayerHeader } from "@/components/PrayerHeader";
import {
  darkModeColors,
  lightModeColors,
  prayerThemeColors,
} from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import { useLocation } from "@/hooks/useLocation";
import { useNotifications } from "@/hooks/useNotifications";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const [currentPage, setCurrentPage] = useState(0);
  const [hasSetInitialPage, setHasSetInitialPage] = useState(false);
  const carouselRef = useRef<PrayerCarouselRef>(null);
  const navigation = useNavigation<any>();
  const { themePrayer, isDarkMode } = useThemeColors();
  const { settings: calendarSettings } = useCalendarSettings();
  const { settings: prayerSettings } = usePrayerSettings();

  // Custom hooks to get states
  const { location, locationName, error: locationError } = useLocation();
  const {
    prayerDict,
    loading,
    error: prayerError,
    sortedDates,
    todayISO,
    todayIndex,
    currentPrayer,
  } = usePrayerTimes(location);
  const { getNotificationState, cycleNotificationState } =
    useNotifications(prayerDict);

  const error = locationError || prayerError;

  const scrollToToday = useCallback(() => {
    if (todayIndex >= 0 && currentPage !== todayIndex) {
      carouselRef.current?.goToPage(todayIndex, true);
      setCurrentPage(todayIndex);
    }
  }, [currentPage, todayIndex]);

  // Sets current page to today when initially loaded
  useEffect(() => {
    if (!hasSetInitialPage && todayIndex >= 0) {
      scrollToToday();
      setHasSetInitialPage(true);
    }
  }, [hasSetInitialPage, scrollToToday, todayIndex]);

  // Jump back to today when the Home tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      scrollToToday();
    });

    return unsubscribe;
  }, [navigation, scrollToToday]);

  // Theme uses override if set, otherwise actual current prayer
  const themePrayerDisplay = themePrayer || currentPrayer?.prayer;

  // isDarkMode from context already falls back to system color scheme
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;

  const isLocationError = error?.toLowerCase().includes("location");

  if (error)
    return (
      <View
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: bgColor }}
      >
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View
          className="w-full rounded-2xl p-6 items-center"
          style={{
            borderWidth: 2,
            borderColor: prayerThemeColors.Fajr.active,
          }}
        >
          <Text
            className="text-xl font-bold text-center mb-2"
            style={{
              color: isDarkMode ? darkModeColors.text : lightModeColors.text,
            }}
          >
            {isLocationError ? "Location Required" : "Something Went Wrong"}
          </Text>
          <Text
            className="text-base text-center"
            style={{
              color: isDarkMode
                ? darkModeColors.textSecondary
                : lightModeColors.textSecondary,
            }}
          >
            {isLocationError
              ? "Fardh needs access to your location to calculate accurate prayer times for your area. Enable location in the Permissions Settings."
              : error}
          </Text>
        </View>
      </View>
    );

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar style="light" />
      <PrayerHeader
        currentPrayer={currentPrayer}
        locationName={locationName}
        timeFormat={prayerSettings.timeFormat}
      />
      <PrayerCarousel
        ref={carouselRef}
        prayerDict={prayerDict}
        sortedDates={sortedDates}
        todayISO={todayISO}
        todayIndex={todayIndex}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        getNotificationState={getNotificationState}
        onCycleNotification={cycleNotificationState}
        activeColor={
          themePrayerDisplay
            ? prayerThemeColors[
                themePrayerDisplay as keyof typeof prayerThemeColors
              ]?.active || "#568FAF"
            : "#568FAF"
        }
        inactiveColor={
          themePrayerDisplay
            ? prayerThemeColors[
                themePrayerDisplay as keyof typeof prayerThemeColors
              ]?.inactive || "#8398a3"
            : "#8398a3"
        }
        currentPrayer={currentPrayer?.prayer || null}
        dateFormat={calendarSettings.carouselDateFormat}
        timeFormat={prayerSettings.timeFormat}
      />
    </View>
  );
}
