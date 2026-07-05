import { darkModeColors, lightModeColors } from "@/constants/prayers";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import {
  CalendarListDay,
  CalendarListSection,
  findTodayLocation,
  generateCalendarSections,
  getTodayISO,
} from "@/utils/calendarHelpers";
import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

type AnimatedTextStyle = ReturnType<typeof useAnimatedTextColor>;

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 44;

interface CalendarCardProps {
  selectedDate: string;
  onDayPress: (day: { dateString: string }) => void;
  holidayMarks: Record<string, any>;
  colors: { active: string; inactive: string };
  isDarkMode?: boolean;
}

export interface CalendarCardRef {
  scrollToToday: () => void;
}

interface DayRowProps {
  dateString: string;
  dayOfMonth: number;
  dayOfWeek: string;
  isSelected: boolean;
  isToday: boolean;
  marking?: { marked?: boolean; holidays?: string[] };
  onDayPress: (day: { dateString: string }) => void;
  activeColor: string;
  disabledTextColor: string;
  animatedDayTextStyle: AnimatedTextStyle;
}

const DayRow = memo(function DayRow({
  dateString,
  dayOfMonth,
  dayOfWeek,
  isSelected,
  isToday,
  marking,
  onDayPress,
  activeColor,
  disabledTextColor,
  animatedDayTextStyle,
}: DayRowProps) {
  const holidays = marking?.holidays ?? [];

  return (
    <Pressable
      onPress={() => onDayPress({ dateString })}
      className="flex-row items-center px-4 gap-3"
      style={{ height: ROW_HEIGHT }}
    >
      <Text
        className="w-12 text-sm uppercase"
        style={{ color: disabledTextColor }}
      >
        {dayOfWeek}
      </Text>
      <View
        className="items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isSelected ? activeColor : "transparent",
        }}
      >
        <Animated.Text
          // Detaching a Reanimated style doesn't reset colors it already
          // applied on the UI thread, so remount whenever the visual state
          // changes to guarantee the static selected/today colors win.
          key={isSelected ? "selected" : isToday ? "today" : "default"}
          style={[
            { fontSize: 16, fontFamily: "System" },
            isSelected
              ? { color: "#ffffff" }
              : isToday
                ? { color: activeColor }
                : animatedDayTextStyle,
          ]}
        >
          {dayOfMonth}
        </Animated.Text>
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        {holidays.length > 0 && (
          <Text
            className="flex-1 text-lg font-semibold ml-3"
            numberOfLines={1}
            style={{ color: activeColor }}
          >
            {holidays.join(" · ")}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export const CalendarCard = forwardRef<CalendarCardRef, CalendarCardProps>(
  (
    { selectedDate, onDayPress, holidayMarks, colors, isDarkMode = false },
    ref,
  ) => {
    const listRef =
      useRef<SectionList<CalendarListDay, CalendarListSection>>(null);

    const sections = useMemo(() => generateCalendarSections(), []);
    const todayISO = useMemo(() => getTodayISO(), []);
    const todayLocation = useMemo(
      () => findTodayLocation(sections),
      [sections],
    );

    // SectionList flattens each section into: header + items + footer, where
    // the footer occupies an index even when not rendered. Precompute every
    // flat index's layout so getItemLayout is exact and O(1).
    const flatLayout = useMemo(() => {
      const layouts: { length: number; offset: number }[] = [];
      let offset = 0;
      for (const section of sections) {
        layouts.push({ length: HEADER_HEIGHT, offset });
        offset += HEADER_HEIGHT;
        for (let i = 0; i < section.data.length; i++) {
          layouts.push({ length: ROW_HEIGHT, offset });
          offset += ROW_HEIGHT;
        }
        layouts.push({ length: 0, offset });
      }
      return layouts;
    }, [sections]);

    const initialScrollOffset = useMemo(() => {
      let flatIndex = 0;
      for (let s = 0; s < todayLocation.sectionIndex; s++) {
        flatIndex += sections[s].data.length + 2;
      }
      flatIndex += 1 + todayLocation.itemIndex;
      const rowOffset = flatLayout[flatIndex]?.offset ?? 0;
      return Math.max(0, rowOffset - HEADER_HEIGHT);
    }, [sections, todayLocation, flatLayout]);

    useImperativeHandle(ref, () => ({
      scrollToToday: () => {
        listRef.current?.scrollToLocation({
          sectionIndex: todayLocation.sectionIndex,
          itemIndex: todayLocation.itemIndex,
          viewOffset: HEADER_HEIGHT,
          animated: true,
        });
      },
    }));

    const bgColor = isDarkMode
      ? darkModeColors.background
      : lightModeColors.background;
    const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
    const dayTextColor = isDarkMode ? darkModeColors.text : colors.active;
    const disabledTextColor = isDarkMode
      ? darkModeColors.disabledText
      : lightModeColors.disabledText;
    const animatedDayTextStyle = useAnimatedTextColor(dayTextColor);
    const animatedSectionTitleStyle = useAnimatedTextColor(colors.inactive);

    const getItemLayout = useCallback(
      (_: unknown, index: number) => ({
        length: flatLayout[index]?.length ?? ROW_HEIGHT,
        offset: flatLayout[index]?.offset ?? 0,
        index,
      }),
      [flatLayout],
    );

    const renderItem = useCallback(
      ({ item }: { item: CalendarListDay }) => (
        <DayRow
          dateString={item.dateString}
          dayOfMonth={item.dayOfMonth}
          dayOfWeek={item.dayOfWeek}
          isSelected={item.dateString === selectedDate}
          isToday={item.dateString === todayISO}
          marking={holidayMarks[item.dateString]}
          onDayPress={onDayPress}
          activeColor={colors.active}
          disabledTextColor={disabledTextColor}
          animatedDayTextStyle={animatedDayTextStyle}
        />
      ),
      [
        selectedDate,
        todayISO,
        holidayMarks,
        onDayPress,
        colors.active,
        disabledTextColor,
        animatedDayTextStyle,
      ],
    );

    const renderSectionHeader = useCallback(
      ({ section }: { section: CalendarListSection }) => (
        <Animated.View
          className="justify-center px-4"
          style={[
            {
              height: HEADER_HEIGHT,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: disabledTextColor,
            },
            animatedBgStyle,
          ]}
        >
          <Animated.Text
            className="text-xl font-bold"
            style={animatedSectionTitleStyle}
          >
            {section.title}
          </Animated.Text>
        </Animated.View>
      ),
      [animatedBgStyle, animatedSectionTitleStyle, disabledTextColor],
    );

    return (
      <Animated.View
        className="flex-1 w-full rounded-t-3xl overflow-hidden"
        style={animatedBgStyle}
      >
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.dateString}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          getItemLayout={getItemLayout}
          contentOffset={{ x: 0, y: initialScrollOffset }}
          extraData={[selectedDate, holidayMarks]}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          initialNumToRender={24}
          windowSize={15}
          maxToRenderPerBatch={36}
          updateCellsBatchingPeriod={20}
        />
      </Animated.View>
    );
  },
);

CalendarCard.displayName = "CalendarCard";
