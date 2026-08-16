import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { useAnimatedTextColor } from "@/hooks/useAnimatedColor";
import type { NextKeyDate } from "@/utils/hijriCalendar";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

const chevronIcon = require("../../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png");

export interface NextKeyDateStripProps {
  height: number;
  /** Content inset matching the home tab's carousel card. */
  contentInset: number;
  nextKeyDate: NextKeyDate | null;
  /** Null while the calendar cache is still loading. */
  isLoading: boolean;
  colors: { active: string; inactive: string };
  isDarkMode: boolean;
  onPress: (iso: string) => void;
}

// "5 Jan" — short form, since the count carries the precision.
const formatShortDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const formatDaysAway = (days: number): string => {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days}d`;
};

// Sits at the bottom of the panel. Always relative to the REAL today, never to
// whichever month is on screen — it answers "what's coming", which only has one
// meaning. Paired with the pinned header above the grid, both ends of the screen
// stay anchored to now while only the grid between them moves.
export const NextKeyDateStrip = ({
  height,
  contentInset,
  nextKeyDate,
  isLoading,
  colors,
  isDarkMode,
  onPress,
}: NextKeyDateStripProps) => {
  const mutedColor = isDarkMode
    ? darkModeColors.textSecondary
    : lightModeColors.textSecondary;
  const separatorColor = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.06)";

  const labelStyle = useAnimatedTextColor(mutedColor);
  // Theme accent, matching the day numerals — the name and the grid are the
  // same kind of thing, so they retint together with the prayer.
  const nameStyle = useAnimatedTextColor(colors.active);

  const label = isLoading
    ? "Loading key dates…"
    : nextKeyDate
      ? null
      : "No upcoming key date";

  return (
    <View
      style={[
        sheet.container,
        {
          height,
          paddingHorizontal: contentInset,
          borderTopColor: separatorColor,
        },
      ]}
    >
      {label !== null ? (
        <Animated.Text className="text-[16px] font-semibold" style={labelStyle}>
          {label}
        </Animated.Text>
      ) : (
        <Pressable
          className="flex-row items-center gap-3"
          onPress={() => nextKeyDate && onPress(nextKeyDate.iso)}
          accessibilityRole="button"
          accessibilityLabel={`Next key date: ${nextKeyDate!.name}`}
        >
          <Animated.Text
            className="text-[11px] font-bold uppercase tracking-wider"
            style={labelStyle}
          >
            Next
          </Animated.Text>
          {/* Below the day numerals, not above them: this strip annotates the
              grid rather than competing with it, and at 27 it was reading as a
              second header. */}
          <Animated.Text
            className="flex-1 text-[16px] font-semibold"
            style={nameStyle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {nextKeyDate!.name}
          </Animated.Text>
          <Animated.Text
            className="text-[14px] font-semibold"
            style={labelStyle}
            numberOfLines={1}
          >
            {formatShortDate(nextKeyDate!.iso)} · {formatDaysAway(nextKeyDate!.daysAway)}
          </Animated.Text>
          {/* Up, not right: what this opens is a sheet that rises from the
              bottom of the screen, so the arrow points the way the thing
              actually travels. */}
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <AnimatedTintIcon source={chevronIcon} size={18} tintColor={colors.active} />
          </View>
        </Pressable>
      )}
    </View>
  );
};

const sheet = StyleSheet.create({
  container: {
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
