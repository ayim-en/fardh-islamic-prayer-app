import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import { CalendarCard, CalendarCardRef } from "@/components/CalendarCard";
import { CalendarHeader } from "@/components/CalendarHeader";
import { HolidayBottomSheet } from "@/components/HolidayBottomSheet";
import {
  darkModeColors,
  lightModeColors,
  prayerBackgrounds,
  prayerThemeColors,
} from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { useLocation } from "@/hooks/useLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
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
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import Reanimated from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Animation constants
const ANIMATION_DURATION_IN = 250;
const ANIMATION_DURATION_OUT = 300;

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [nextHoliday, setNextHoliday] = useState<NextHijriHolidayData | null>(
    null
  );
  const [isHolidaySheetOpen, setIsHolidaySheetOpen] = useState(false);
  const [sheetHolidays, setSheetHolidays] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const { colors, themePrayer, isDarkMode } = useThemeColors();
  const { settings: calendarSettings, loading: calendarSettingsLoading } =
    useCalendarSettings();
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
  const animatedActiveTextStyle = useAnimatedTextColor(colors.active);
  const { location, locationName, error: locationError } = useLocation();
  const { currentPrayer } = usePrayerTimes(location);
  const [holidayMarks, setHolidayMarks] = useState<Record<string, any>>({});

  // Animation state for holiday badge
  const holidayBadgeAnim = useRef(new Animated.Value(0)).current; // Start at bottom edge of calendar
  const [displayedHolidays, setDisplayedHolidays] = useState<string[]>([]);
  const prevHolidaysRef = useRef<string[]>([]);

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

  // Use theme prayer if set, otherwise use actual current prayer for background (null if not loaded yet)
  const displayPrayer = themePrayer || currentPrayer?.prayer;
  const backgroundImage = displayPrayer
    ? prayerBackgrounds[displayPrayer] || null
    : null;

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

  // Get holiday names for the selected date (if any)
  const selectedHolidays = useMemo(() => {
    const mark = holidayMarks[selectedDate];
    return mark?.holidays || [];
  }, [holidayMarks, selectedDate]);

  // Animate holiday badge in/out when selectedHolidays changes
  useEffect(() => {
    const prev = prevHolidaysRef.current;
    const isSame =
      selectedHolidays.length === prev.length &&
      selectedHolidays.every((h: string, i: number) => h === prev[i]);

    if (selectedHolidays.length > 0) {
      if (isSame) return; // Skip animation if same holiday
      // Update displayed holidays and animate down from calendar
      setDisplayedHolidays(selectedHolidays);
      prevHolidaysRef.current = selectedHolidays;
      holidayBadgeAnim.setValue(0);
      Animated.timing(holidayBadgeAnim, {
        toValue: 70,
        duration: ANIMATION_DURATION_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      prevHolidaysRef.current = [];
      // Animate back up behind calendar
      Animated.timing(holidayBadgeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION_OUT,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [selectedHolidays, holidayBadgeAnim]);

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
      <CalendarHeader
        locationName={locationName}
        backgroundImage={backgroundImage}
        currentPrayer={currentPrayer}
        nextHoliday={nextHoliday}
      />
      <View className="flex-1 items-center justify-center p-4 pt-24">
        <View style={{ position: "relative" }}>
          <Animated.View
            className="absolute left-0 right-0 items-center"
            style={{
              bottom: 0,
              transform: [{ translateY: holidayBadgeAnim }],
            }}
          >
            <Pressable
              onPress={() => {
                setSheetHolidays(displayedHolidays);
                setIsHolidaySheetOpen(true);
              }}
            >
              <Reanimated.View
                className="rounded-2xl p-4 flex-row gap-2 items-center"
                style={animatedBgStyle}
              >
                {displayedHolidays.map((holiday: string, index: number) => (
                  <Reanimated.Text
                    key={index}
                    className="text-center text-xl font-semibold"
                    style={animatedActiveTextStyle}
                  >
                    {holiday}
                  </Reanimated.Text>
                ))}
                <AnimatedTintIcon
                  source={require("../../assets/images/prayer-pro-icons/calendar-tab/calendar-info.png")}
                  tintColor={colors.active}
                  size={24}
                />
              </Reanimated.View>
            </Pressable>
          </Animated.View>
          {isReady ? (
            <CalendarCard
              ref={calendarRef}
              selectedDate={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              holidayMarks={holidayMarks}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          ) : (
            <Reanimated.View
              className="rounded-3xl overflow-hidden items-center justify-center"
              style={[{ width: width, height: width }, animatedBgStyle]}
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
