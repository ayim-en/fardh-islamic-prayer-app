import { CalendarHeader } from "@/components/CalendarHeader";
import {
  GRID_ROWS,
  MONTH_BAR_HEIGHT,
  MonthGridPager,
  MonthGridPagerRef,
  WEEKDAY_ROW_HEIGHT,
  WEEKDAY_TOP_OFFSET,
} from "@/components/calendar/MonthGridPager";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";
import { NextKeyDateStrip } from "@/components/calendar/NextKeyDateStrip";
import {
  darkModeColors,
  lightModeColors,
  prayerBackgrounds,
} from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import { useAnimatedBackgroundColor } from "@/hooks/useAnimatedColor";
import { useLocation } from "@/hooks/useLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import {
  CalendarDay,
  ensureCachedCalendar,
} from "@/prayer-api/islamicCalendarAPI";
import { getTodayISO } from "@/utils/calendarHelpers";
import {
  buildCalendarIndex,
  buildMonthPageData,
  buildMonthPages,
  findNextKeyDate,
  findPageIndexForIso,
} from "@/utils/hijriCalendar";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";

// Reserved for the next-key-date strip that sits below the grid. Measured off
// the mockup, which runs its rule to the tab bar in 53pt; 56 keeps a couple of
// points of slack around the 16pt name.
const STRIP_HEIGHT = 56;

// Fixed rather than slack-derived, now that the grid claims a square and takes
// whatever height is left. A little air above the month title; more between the
// weekday letters and the dates.
const TOP_PADDING = 16;
const WEEKDAY_GAP = 14;

// Inset for the panel's own content (month bar, grid, strip). Tighter than the
// prayer carousel's `(1 - 0.85) / 2` = 0.075, which this originally matched —
// the width is worth more to a 7-column grid than to a single card. Kept
// proportional so the margin still scales with the screen.
//
// The header sets its own padding independently; see CalendarHeader.
const CONTENT_INSET_RATIO = 0.04;

// "August 13, 2026" — composed explicitly rather than via toLocaleDateString so
// the order holds regardless of device locale.
const formatHeaderDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
  });
  return `${monthName} ${day}, ${year}`;
};

export default function CalendarScreen() {
  const { colors, isDarkMode, themePrayer, currentPrayer } = useThemeColors();
  const { settings: calendarSettings, loading: calendarSettingsLoading } =
    useCalendarSettings();
  const { location } = useLocation();
  const { prayerDict } = usePrayerTimes(location);
  const { settings: prayerSettings } = usePrayerSettings();

  const [calendarDays, setCalendarDays] = useState<CalendarDay[] | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [todayIso] = useState(getTodayISO());

  const pagerRef = useRef<MonthGridPagerRef>(null);
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();

  const contentInset = Math.round(windowWidth * CONTENT_INSET_RATIO);

  // Measured rather than taken from Dimensions, so the ratio is applied to the
  // real scene box (which already excludes the tab bar) — same as index.tsx.
  const [containerHeight, setContainerHeight] = useState(0);
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setContainerHeight((current) =>
      height > 0 && height !== current ? height : current
    );
  }, []);


  const handlePanelLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setPanelHeight((current) => (height > 0 && height !== current ? height : current));
  }, []);

  // The swipeable grid is a perfect square: its side is whichever of the two
  // axes runs out first. Width usually wins on a modern phone; a short, wide
  // device (SE, 8+) is height-limited and gets a narrower square centred in the
  // panel rather than a stretched rectangle.
  const gridSide = useMemo(() => {
    if (panelHeight <= 0) return 0;
    const chrome =
      TOP_PADDING +
      MONTH_BAR_HEIGHT +
      WEEKDAY_TOP_OFFSET +
      WEEKDAY_ROW_HEIGHT +
      WEEKDAY_GAP +
      STRIP_HEIGHT;
    const availableHeight = panelHeight - chrome;
    const availableWidth = windowWidth - contentInset * 2;
    return Math.max(0, Math.floor(Math.min(availableWidth, availableHeight)));
  }, [panelHeight, windowWidth, contentInset]);

  const cellHeight = gridSide / GRID_ROWS;

  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);

  const displayPrayer = themePrayer || currentPrayer;
  const backgroundImage = displayPrayer
    ? prayerBackgrounds[displayPrayer] || null
    : null;

  // Defer the grid past first paint — tabs use lazy:false, so this screen
  // mounts during cold start. The header is cheap and paints immediately.
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Load the cached 25-month window (fetches and caches on a miss).
  useEffect(() => {
    if (calendarSettingsLoading) return;
    let isActive = true;

    ensureCachedCalendar({
      calendarMethod: calendarSettings.calendarMethod,
      adjustment: calendarSettings.adjustment,
    })
      .then((days) => {
        if (isActive) setCalendarDays(days);
      })
      .catch((error) => {
        console.error("Failed to load Hijri calendar", error);
      });

    return () => {
      isActive = false;
    };
  }, [calendarSettings, calendarSettingsLoading]);

  // Jump back to the current month when the tab is pressed.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      pagerRef.current?.goToToday();
    });
    return unsubscribe;
  }, [navigation]);

  const calendarIndex = useMemo(
    () => buildCalendarIndex(calendarDays),
    [calendarDays]
  );
  const pages = useMemo(() => buildMonthPages(), []);
  // Every page precomputed in one pass, so paging itself recomputes nothing.
  const pageData = useMemo(
    () => buildMonthPageData(pages, calendarIndex),
    [pages, calendarIndex]
  );
  const initialIndex = useMemo(
    () => Math.max(0, findPageIndexForIso(pages, todayIso)),
    [pages, todayIso]
  );
  const nextKeyDate = useMemo(
    () => findNextKeyDate(calendarIndex, todayIso),
    [calendarIndex, todayIso]
  );

  const todayInfo = calendarIndex.byIso.get(todayIso);

  // Pages first, so tapping a faded day from the previous or next month brings
  // that month up behind the sheet. goToPage no-ops when the target is already
  // the current page, so an in-month tap is unaffected.
  const handleDayPress = useCallback((iso: string) => {
    pagerRef.current?.goToIso(iso, true);
    setSelectedIso(iso);
    setIsSheetOpen(true);
  }, []);

  const selectedInfo = selectedIso ? calendarIndex.byIso.get(selectedIso) : undefined;
  // Undefined outside the 3-month prayer window, or with no location at all —
  // the sheet omits the section rather than showing an error.
  const selectedTimings = selectedIso ? prayerDict[selectedIso]?.timings : undefined;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: bgColor }}
      onLayout={handleContainerLayout}
    >
      <StatusBar style="light" />

      {/* Owns its own height, spacing and background image — see
          components/CalendarHeader.tsx. Nothing below should style it. */}
      <CalendarHeader
        containerHeight={containerHeight}
        gregorianLabel={formatHeaderDate(todayIso)}
        hijriLabel={todayInfo?.hijriFullLabel ?? null}
        backgroundImage={backgroundImage}
      />

      <Animated.View
        className="flex-1 rounded-t-3xl overflow-hidden"
        style={animatedBgStyle}
        onLayout={handlePanelLayout}
      >
        {isReady && panelHeight > 0 && (
          <>
            <MonthGridPager
              ref={pagerRef}
              pages={pageData}
              initialIndex={initialIndex}
              todayIso={todayIso}
              selectedIso={selectedIso}
              cellHeight={cellHeight}
              gridSide={gridSide}
              topPadding={TOP_PADDING}
              weekdayGap={WEEKDAY_GAP}
              contentInset={contentInset}
              colors={colors}
              isDarkMode={isDarkMode}
              onDayPress={handleDayPress}
            />
            {/* Bottom-anchored by its own absolute positioning, so expanding
                it grows upward over the grid instead of reflowing anything.
                STRIP_HEIGHT is still reserved in the grid's chrome budget
                above, which is what keeps the collapsed row clear of it. */}
            <NextKeyDateStrip
              height={STRIP_HEIGHT}
              contentInset={contentInset}
              nextKeyDate={nextKeyDate}
              isLoading={calendarDays === null}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          </>
        )}
      </Animated.View>

      <DayDetailSheet
        visible={isSheetOpen}
        iso={selectedIso}
        hijriLabel={selectedInfo?.hijriFullLabel ?? null}
        keyDates={selectedInfo?.keyDates ?? []}
        prayerTimes={selectedTimings ?? null}
        timeFormat={prayerSettings.timeFormat}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => setIsSheetOpen(false)}
      />
    </View>
  );
}
