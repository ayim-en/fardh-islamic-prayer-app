import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { useAnimatedTextColor } from "@/hooks/useAnimatedColor";
import { resolveBothDateLabels } from "@/utils/dateSystemHelpers";
import type { MonthPageData } from "@/utils/hijriCalendar";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { useCellStyles } from "./cellStyles";
import { MonthGrid } from "./MonthGrid";

export const GRID_ROWS = 6;
// Fixed rather than intrinsic so the screen can compute the remaining space for
// the grid exactly, instead of estimating this chrome. Sized to clear their own
// contents: 56 holds a 25pt title, its 2pt gap and a 14pt Hijri span.
export const MONTH_BAR_HEIGHT = 56;
export const WEEKDAY_ROW_HEIGHT = 28;
// Drops the letters clear of the Hijri span above them. Separate from the row
// height so the letters move without the row's own box changing — the screen
// budgets both, so either would work, but only this one is about spacing.
export const WEEKDAY_TOP_OFFSET = 6;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const chevronIcon = require("../../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png");

export interface MonthGridPagerRef {
  goToToday: (animated?: boolean) => void;
  goToIso: (iso: string, animated?: boolean) => void;
}

export interface MonthGridPagerProps {
  pages: MonthPageData[];
  initialIndex: number;
  todayIso: string;
  selectedIso: string | null;
  cellHeight: number;
  /** Side of the square grid. Weekday row and rule match it so columns line up. */
  gridSide: number;
  /** Breathing room above the month title, inside the panel. */
  topPadding: number;
  /** Gap between the weekday letters and the first row of dates. */
  weekdayGap: number;
  /** Content inset matching the home tab's carousel card. */
  contentInset: number;
  colors: { active: string; inactive: string };
  isDarkMode: boolean;
  /** Which system leads the month bar and the day cells. */
  primaryDateSystem: PrimaryDateSystem;
  onDayPress: (iso: string) => void;
}

export const MonthGridPager = forwardRef<MonthGridPagerRef, MonthGridPagerProps>(
  (
    {
      pages,
      initialIndex,
      todayIso,
      selectedIso,
      cellHeight,
      gridSide,
      topPadding,
      weekdayGap,
      contentInset,
      colors,
      isDarkMode,
      primaryDateSystem,
      onDayPress,
    },
    ref
  ) => {
    const listRef = useRef<FlatList<MonthPageData>>(null);
    const [pageWidth, setPageWidth] = useState(0);
    const [pageIndex, setPageIndex] = useState(initialIndex);
    // Mirrors pageIndex synchronously: onScroll can fire again before React has
    // committed the previous setState, which would double-fire the update.
    const pageIndexRef = useRef(initialIndex);

    const cellStyles = useCellStyles(colors, isDarkMode);

    const inkColor = isDarkMode ? darkModeColors.text : lightModeColors.text;
    const titleStyle = useAnimatedTextColor(inkColor);
    // Theme accent, so the second line retints with the prayer alongside the
    // chevrons beside it and the key-date name in the strip below. The
    // treatment belongs to the slot, not to the system in it: the heading is
    // ink and the line under it is accent, whichever date each holds.
    const spanStyle = useAnimatedTextColor(colors.active);
    // The theme's secondary tone, matching the Hijri numerals in the grid.
    const weekdayStyle = useAnimatedTextColor(colors.inactive);

    // Raw layout width, deliberately unrounded: on Android this is often
    // fractional, and rounding it while pagingEnabled snaps to the scroll view's
    // own frame width accumulates ~0.4pt of drift per page.
    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setPageWidth((current) => (width > 0 && width !== current ? width : current));
    }, []);

    const goToPage = useCallback(
      (target: number, animated: boolean) => {
        const clamped = Math.max(0, Math.min(pages.length - 1, target));
        if (clamped === pageIndexRef.current) return;
        pageIndexRef.current = clamped;
        setPageIndex(clamped);
        listRef.current?.scrollToIndex({ index: clamped, animated });
      },
      [pages.length]
    );

    useImperativeHandle(
      ref,
      () => ({
        goToToday: (animated) => {
          const target = pages.findIndex((page) => page.key === todayIso.slice(0, 7));
          if (target < 0) return;
          // Animating across many pages is a long blur — only animate a
          // neighbouring jump unless the caller insists.
          const distance = Math.abs(target - pageIndexRef.current);
          goToPage(target, animated ?? distance <= 1);
        },
        goToIso: (iso, animated = false) => {
          const target = pages.findIndex((page) => page.key === iso.slice(0, 7));
          if (target < 0) return;
          goToPage(target, animated);
        },
      }),
      [pages, todayIso, goToPage]
    );

    // Keep the offset when the width changes (rotation, iPad split). Remounting
    // via key={pageWidth} would work too but would silently reset to today,
    // losing wherever the user had paged to.
    useLayoutEffect(() => {
      if (pageWidth > 0) {
        listRef.current?.scrollToOffset({
          offset: pageIndexRef.current * pageWidth,
          animated: false,
        });
      }
    }, [pageWidth]);

    const syncPageIndex = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (pageWidth <= 0) return;
        const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
        if (next === pageIndexRef.current || next < 0 || next >= pages.length) return;
        pageIndexRef.current = next;
        setPageIndex(next);
      },
      [pageWidth, pages.length]
    );

    const getItemLayout = useCallback(
      (_: unknown, index: number) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      }),
      [pageWidth]
    );

    const renderItem = useCallback(
      ({ item }: { item: MonthPageData }) => (
        <MonthGrid
          cells={item.cells}
          width={pageWidth}
          cellHeight={cellHeight}
          gridSide={gridSide}
          selectedIso={selectedIso}
          primaryDateSystem={primaryDateSystem}
          onDayPress={onDayPress}
          styles={cellStyles}
        />
      ),
      [
        pageWidth,
        cellHeight,
        gridSide,
        selectedIso,
        primaryDateSystem,
        onDayPress,
        cellStyles,
      ]
    );

    const extraData = useMemo(
      () => [selectedIso, cellStyles, cellHeight, primaryDateSystem],
      [selectedIso, cellStyles, cellHeight, primaryDateSystem]
    );

    const current = pages[pageIndex];
    const atStart = pageIndex <= 0;
    const atEnd = pageIndex >= pages.length - 1;

    // Paging stays Gregorian whichever system leads (see the screen), so the
    // page is still a Gregorian month — this only decides which of its two
    // names is the heading and which is the span beneath it. Both are shown in
    // either mode; until the cache lands there is no span, and the month's
    // Gregorian name heads the bar on its own.
    const monthLabels = resolveBothDateLabels(primaryDateSystem, {
      gregorian: current?.title ?? null,
      hijri: current?.hijriSpan ?? null,
    });

    return (
      <View style={{ paddingTop: topPadding }}>
        {/* Month bar — the only thing that moves as you page */}
        <View
          className="flex-row items-center justify-between"
          style={{ height: MONTH_BAR_HEIGHT, paddingHorizontal: contentInset }}
        >
          <View className="flex-1">
            {/* Only a few points above the day numerals, per the mockup: weight
                and the Hijri span beneath it are what mark this as a heading,
                not size. It out-ranked the whole panel at 32. */}
            <Animated.Text
              className="text-[25px] font-bold"
              style={titleStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {monthLabels.leading}
            </Animated.Text>
            <Animated.Text
              className="text-[14px] font-semibold mt-0.5"
              style={spanStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {monthLabels.trailing}
            </Animated.Text>
          </View>

          <View className="flex-row items-center gap-5 pl-3">
            <Pressable
              onPress={() => goToPage(pageIndex - 1, true)}
              disabled={atStart}
              hitSlop={10}
              style={{ opacity: atStart ? 0.25 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <AnimatedTintIcon source={chevronIcon} size={22} tintColor={colors.active} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => goToPage(pageIndex + 1, true)}
              disabled={atEnd}
              hitSlop={10}
              style={{ opacity: atEnd ? 0.25 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <View style={{ transform: [{ rotate: "-90deg" }] }}>
                <AnimatedTintIcon source={chevronIcon} size={22} tintColor={colors.active} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Weekday letters. Exactly gridSide wide and centred, so they sit over
            their own columns even on a device where the square is narrower than
            the panel. */}
        <View className="items-center">
          <View
            className="flex-row items-center"
            style={{
              width: gridSide,
              height: WEEKDAY_ROW_HEIGHT,
              marginTop: WEEKDAY_TOP_OFFSET,
            }}
          >
            {WEEKDAYS.map((letter, index) => (
              <Animated.Text
                key={index}
                className="flex-1 text-center text-[14px] font-bold uppercase"
                style={weekdayStyle}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>
        </View>

        {/* Pages — mounted only once the width is known, so initialScrollIndex
            and getItemLayout agree from the very first frame. */}
        <View
          style={{ height: gridSide, marginTop: weekdayGap }}
          onLayout={handleLayout}
        >
          {pageWidth > 0 && (
            <FlatList
              ref={listRef}
              data={pages}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              extraData={extraData}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              onScroll={syncPageIndex}
              onMomentumScrollEnd={syncPageIndex}
              onScrollEndDrag={syncPageIndex}
              scrollEventThrottle={16}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={false}
              onScrollToIndexFailed={({ index }) =>
                listRef.current?.scrollToOffset({
                  offset: index * pageWidth,
                  animated: false,
                })
              }
            />
          )}
        </View>
      </View>
    );
  }
);

MonthGridPager.displayName = "MonthGridPager";
