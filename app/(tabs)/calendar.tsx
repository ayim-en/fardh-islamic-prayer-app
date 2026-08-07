import { CalendarCard, CalendarCardRef } from "@/components/CalendarCard";
import { ImportantDateBottomSheet } from "@/components/ImportantDateBottomSheet";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { useLocation } from "@/hooks/useLocation";
import {
  NextHijriImportantDateData,
  fetchNextIncludedHijriImportantDate,
} from "@/prayer-api/islamicCalendarAPI";
import { getCachedCalendar } from "@/utils/cacheHelpers";
import {
  convertDDMMYYYYToISO,
  getIncludedImportantDatesFromDay,
  getTodayISO,
  hasIncludedImportantDate,
} from "@/utils/calendarHelpers";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [nextImportantDate, setNextImportantDate] =
    useState<NextHijriImportantDateData | null>(null);
  const [isImportantDateSheetOpen, setIsImportantDateSheetOpen] =
    useState(false);
  const [sheetImportantDates, setSheetImportantDates] = useState<string[]>(
    [],
  );
  const [isReady, setIsReady] = useState(false);
  const { colors, isDarkMode } = useThemeColors();
  const { settings: calendarSettings, loading: calendarSettingsLoading } =
    useCalendarSettings();
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
  const animatedActiveTextStyle = useAnimatedTextColor(colors.active);
  const animatedSecondaryTextStyle = useAnimatedTextColor(colors.inactive);
  const { error: locationError } = useLocation();
  const [importantDateMarks, setImportantDateMarks] = useState<
    Record<string, any>
  >({});

  // Ref and navigation for scrolling to today on tab press
  const calendarRef = useRef<CalendarCardRef>(null);
  const navigation = useNavigation<any>();

  const scrollToToday = useCallback(() => {
    setSelectedDate(getTodayISO());
    calendarRef.current?.scrollToToday();
  }, []);

  // Jump back to today when the Calendar tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      scrollToToday();
    });

    return unsubscribe;
  }, [navigation, scrollToToday]);

  // Defer heavy calendar rendering until after initial paint
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (calendarSettingsLoading) return;

    let isActive = true;

    const loadImportantDate = async () => {
      try {
        const data = await fetchNextIncludedHijriImportantDate({
          calendarMethod: calendarSettings.calendarMethod,
          adjustment: calendarSettings.adjustment,
        });
        if (isActive) {
          setNextImportantDate(data);
        }
        // After fetching next important date, cached calendar should be available.
        const allDays = await getCachedCalendar();
        if (isActive && allDays) {
          const marks: Record<string, any> = {};
          for (const day of allDays) {
            if (hasIncludedImportantDate(day)) {
              const iso = convertDDMMYYYYToISO(day.gregorian.date);
              const importantDates = getIncludedImportantDatesFromDay(day);
              // Store both marked status and important date names
              marks[iso] = {
                ...(marks[iso] || {}),
                marked: true,
                importantDates,
              };
            }
          }
          setImportantDateMarks(marks);
        }
      } catch (error) {
        console.error("Failed to load next Hijri important date", error);
      }
    };

    loadImportantDate();

    return () => {
      isActive = false;
    };
  }, [calendarSettings, calendarSettingsLoading]);

  // Select the tapped day and pop up the important date sheet when it has any
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
      const importantDates = importantDateMarks[day.dateString]?.importantDates;
      if (importantDates?.length) {
        setSheetImportantDates(importantDates);
        setIsImportantDateSheetOpen(true);
      }
    },
    [importantDateMarks],
  );

  // Upcoming/current important date shown in the fixed banner above the list
  const nextImportantDateName =
    nextImportantDate?.hijri?.holidays?.[0] ||
    nextImportantDate?.gregorian?.holidays?.[0];
  const hasNextImportantDate = nextImportantDateName !== undefined;
  const isImportantDateToday =
    hasNextImportantDate &&
    nextImportantDate?.gregorian?.date != null &&
    convertDDMMYYYYToISO(nextImportantDate.gregorian.date) === getTodayISO();
  const nextImportantDateLabel = useMemo(() => {
    if (!nextImportantDate?.gregorian?.date) return null;
    const [day, month, year] = nextImportantDate.gregorian.date
      .split("-")
      .map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
  }, [nextImportantDate]);

  const secondaryTextColor = isDarkMode
    ? darkModeColors.textSecondary
    : lightModeColors.textSecondary;

  // Banner interactions: name opens the important date sheet, date jumps the list
  const nextImportantDateISO = nextImportantDate?.gregorian?.date
    ? convertDDMMYYYYToISO(nextImportantDate.gregorian.date)
    : null;

  const openNextImportantDateSheet = () => {
    if (!nextImportantDateName) return;
    const importantDates = (nextImportantDateISO &&
      importantDateMarks[nextImportantDateISO]?.importantDates) || [
      nextImportantDateName,
    ];
    setSheetImportantDates(importantDates);
    setIsImportantDateSheetOpen(true);
  };

  const jumpToNextImportantDate = () => {
    if (!nextImportantDateISO) return;
    setSelectedDate(nextImportantDateISO);
    calendarRef.current?.scrollToDate(nextImportantDateISO);
  };

  const isLocationError = locationError?.toLowerCase().includes("location");

  if (locationError) {
    return (
      <View
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: bgColor }}
      >
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View
          className="w-full rounded-2xl p-6 items-center"
          style={{
            backgroundColor: isDarkMode
              ? darkModeColors.backgroundSecondary
              : lightModeColors.backgroundSecondary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDarkMode ? 0.4 : 0.15,
            shadowRadius: 12,
            elevation: 8,
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
              ? "Fardh needs access to your location to display an accurate Islamic calendar. Enable location in the Permissions Settings."
              : locationError}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <View className="pt-24 px-5 pb-5">
        <Text
          className="text-base font-semibold uppercase"
          style={{ color: secondaryTextColor }}
        >
          {nextImportantDate
            ? hasNextImportantDate
              ? isImportantDateToday
                ? "Current Key Date"
                : "Upcoming Key Date"
              : "No Upcoming Key Date"
            : "Loading Key Dates..."}
        </Text>
        {hasNextImportantDate && (
          <View className="flex-row items-end justify-between gap-2 mt-1">
            <Pressable
              onPress={openNextImportantDateSheet}
              className="flex-shrink"
              hitSlop={8}
            >
              <Reanimated.Text
                className="text-3xl font-bold"
                numberOfLines={1}
                style={animatedActiveTextStyle}
              >
                {nextImportantDateName}
              </Reanimated.Text>
            </Pressable>
            {nextImportantDateLabel && !isImportantDateToday && (
              <Pressable onPress={jumpToNextImportantDate} hitSlop={8}>
                <Reanimated.Text
                  className="text-2xl font-semibold"
                  style={animatedSecondaryTextStyle}
                >
                  {nextImportantDateLabel}
                </Reanimated.Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-1 w-full" style={{ position: "relative" }}>
          {isReady ? (
            <CalendarCard
              ref={calendarRef}
              selectedDate={selectedDate}
              onDayPress={handleDayPress}
              importantDateMarks={importantDateMarks}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          ) : (
            <Reanimated.View
              className="flex-1 w-full rounded-t-3xl overflow-hidden items-center justify-center"
              style={animatedBgStyle}
            />
          )}
        </View>
      </View>

      {/* Bottom Sheet Modal */}
      <ImportantDateBottomSheet
        visible={isImportantDateSheetOpen}
        importantDates={sheetImportantDates}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => setIsImportantDateSheetOpen(false)}
      />
      <Reanimated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
        style={[{ height: 10 }, animatedBgStyle]}
      />
    </View>
  );
}
