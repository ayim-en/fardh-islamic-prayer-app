import { CalendarCard, CalendarCardRef } from "@/components/CalendarCard";
import { HolidayBottomSheet } from "@/components/HolidayBottomSheet";
import {
  darkModeColors,
  lightModeColors,
  prayerThemeColors,
} from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { useLocation } from "@/hooks/useLocation";
import {
  NextHijriHolidayData,
  fetchNextIncludedHijriHoliday,
} from "@/prayer-api/islamicCalendarAPI";
import { getCachedCalendar } from "@/utils/cacheHelpers";
import {
  convertDDMMYYYYToISO,
  getIncludedHolidaysFromDay,
  getTodayISO,
  hasIncludedHoliday,
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
import { Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [nextHoliday, setNextHoliday] = useState<NextHijriHolidayData | null>(
    null,
  );
  const [isHolidaySheetOpen, setIsHolidaySheetOpen] = useState(false);
  const [sheetHolidays, setSheetHolidays] = useState<string[]>([]);
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
  const [holidayMarks, setHolidayMarks] = useState<Record<string, any>>({});

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

    const loadHoliday = async () => {
      try {
        const data = await fetchNextIncludedHijriHoliday({
          calendarMethod: calendarSettings.calendarMethod,
          adjustment: calendarSettings.adjustment,
        });
        if (isActive) {
          setNextHoliday(data);
        }
        // After fetching next holiday, cached calendar should be available.
        const allDays = await getCachedCalendar();
        if (isActive && allDays) {
          const marks: Record<string, any> = {};
          for (const day of allDays) {
            if (hasIncludedHoliday(day)) {
              const iso = convertDDMMYYYYToISO(day.gregorian.date);
              const holidays = getIncludedHolidaysFromDay(day);
              // Store both marked status and holiday names
              marks[iso] = { ...(marks[iso] || {}), marked: true, holidays };
            }
          }
          setHolidayMarks(marks);
        }
      } catch (error) {
        console.error("Failed to load next Hijri holiday", error);
      }
    };

    loadHoliday();

    return () => {
      isActive = false;
    };
  }, [calendarSettings, calendarSettingsLoading]);

  // Select the tapped day and pop up the holiday sheet when it has holidays
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
      const holidays = holidayMarks[day.dateString]?.holidays;
      if (holidays?.length) {
        setSheetHolidays(holidays);
        setIsHolidaySheetOpen(true);
      }
    },
    [holidayMarks],
  );

  // Upcoming/current holiday shown in the fixed banner above the list
  const nextHolidayName =
    nextHoliday?.hijri?.holidays?.[0] || nextHoliday?.gregorian?.holidays?.[0];
  const hasNextHoliday = nextHolidayName !== undefined;
  const isHolidayToday =
    hasNextHoliday &&
    nextHoliday?.gregorian?.date != null &&
    convertDDMMYYYYToISO(nextHoliday.gregorian.date) === getTodayISO();
  const nextHolidayDateLabel = useMemo(() => {
    if (!nextHoliday?.gregorian?.date) return null;
    const [day, month, year] = nextHoliday.gregorian.date
      .split("-")
      .map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
  }, [nextHoliday]);

  const secondaryTextColor = isDarkMode
    ? darkModeColors.textSecondary
    : lightModeColors.textSecondary;

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
          {nextHoliday
            ? hasNextHoliday
              ? isHolidayToday
                ? "Current Holiday"
                : "Upcoming Holiday"
              : "No Upcoming Holiday"
            : "Loading Holidays..."}
        </Text>
        {hasNextHoliday && (
          <View className="flex-row items-baseline justify-between gap-2 mt-1">
            <Reanimated.Text
              className="text-3xl font-bold flex-shrink"
              numberOfLines={1}
              style={animatedActiveTextStyle}
            >
              {nextHolidayName}
            </Reanimated.Text>
            {nextHolidayDateLabel && !isHolidayToday && (
              <Reanimated.Text
                className="text-2xl font-semibold"
                style={animatedSecondaryTextStyle}
              >
                {nextHolidayDateLabel}
              </Reanimated.Text>
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
              holidayMarks={holidayMarks}
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
      <HolidayBottomSheet
        visible={isHolidaySheetOpen}
        holidays={sheetHolidays}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => setIsHolidaySheetOpen(false)}
      />
      <Reanimated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
        style={[{ height: 10 }, animatedBgStyle]}
      />
    </View>
  );
}
