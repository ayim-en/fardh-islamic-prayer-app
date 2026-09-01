import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import { IMPORTANT_DATE_DESCRIPTIONS } from "@/constants/importantDates";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import type { NextKeyDate } from "@/utils/hijriCalendar";
import { formatKeyDateLabels } from "@/utils/keyDateLabels";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const chevronIcon = require("../../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png");

// Ceiling on the description block. Descriptions run 200-plus characters, and
// on a short device an uncapped one would climb far enough to swallow the grid;
// past this the block scrolls instead of growing.
const MAX_BODY_HEIGHT = 190;

export interface NextKeyDateStripProps {
  /** Collapsed height. The expanded body is added on top of this. */
  height: number;
  /** Content inset matching the home tab's carousel card. */
  contentInset: number;
  nextKeyDate: NextKeyDate | null;
  /** Null while the calendar cache is still loading. */
  isLoading: boolean;
  /** Which system the row's date is stated in; the body shows the other. */
  primaryDateSystem: PrimaryDateSystem;
  colors: { active: string; inactive: string };
  isDarkMode: boolean;
}

const formatDaysAway = (days: number): string => {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days}d`;
};

// Sits at the bottom of the panel. Always relative to the REAL today, never to
// whichever month is on screen — it answers "what's coming", which only has one
// meaning. Paired with the pinned header above the grid, both ends of the screen
// stay anchored to now while only the grid between them moves.
//
// Pressing it expands the description in place rather than opening the day
// sheet. The sheet is for a day you pointed at in the grid; this row is a
// standing note about a date that may be months away, and reading it should
// cost you neither the month you'd browsed to nor a modal to dismiss.
//
// Absolutely positioned so that growth has somewhere to go: bottom-anchored, the
// row rides upward as the body opens beneath it, and the grid's layout above is
// untouched either way.
export const NextKeyDateStrip = ({
  height,
  contentInset,
  nextKeyDate,
  isLoading,
  primaryDateSystem,
  colors,
  isDarkMode,
}: NextKeyDateStripProps) => {
  const themeColors = isDarkMode ? darkModeColors : lightModeColors;
  const separatorColor = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.06)";

  const labelStyle = useAnimatedTextColor(themeColors.textSecondary);
  // Theme accent, matching the day numerals — the name and the grid are the
  // same kind of thing, so they retint together with the prayer.
  const nameStyle = useAnimatedTextColor(colors.active);
  // Opaque, and the panel's own colour: expanded, this covers the bottom rows
  // of the grid, so it cannot be transparent.
  const backgroundStyle = useAnimatedBackgroundColor(themeColors.background);
  // The key-date card, taking the day sheet's fill, radius and type so a
  // holiday's write-up looks the same wherever you meet it.
  const cardStyle = useAnimatedBackgroundColor(themeColors.backgroundSecondary);

  const [isExpanded, setIsExpanded] = useState(false);

  // A rollover past midnight (or a fresh cache) can swap the key date out from
  // under an open body. Collapse rather than leave the previous date's text.
  useEffect(() => {
    setIsExpanded(false);
  }, [nextKeyDate?.iso]);

  // The row's date and the body's, resolved together so the two can never
  // state the same system twice. Null while there is no key date to state.
  const dateLabels = nextKeyDate
    ? formatKeyDateLabels(nextKeyDate, primaryDateSystem)
    : null;

  const daysAway = nextKeyDate ? formatDaysAway(nextKeyDate.daysAway) : null;

  const label = isLoading
    ? "Loading key dates…"
    : nextKeyDate
      ? null
      : "No upcoming key date";

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[
        sheet.container,
        { paddingHorizontal: contentInset, borderTopColor: separatorColor },
        backgroundStyle,
      ]}
    >
      {label !== null ? (
        <View style={{ height, justifyContent: "center" }}>
          <Animated.Text className="text-[16px] font-semibold" style={labelStyle}>
            {label}
          </Animated.Text>
        </View>
      ) : (
        <>
          <Pressable
            className="flex-row items-center gap-3"
            style={{ height }}
            onPress={() => setIsExpanded((previous) => !previous)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={`Next key date: ${nextKeyDate!.name}, ${dateLabels!.row}, ${daysAway}`}
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
              {dateLabels!.row} · {daysAway}
            </Animated.Text>
            {/* Points the way the content travels: up while the body is still
                folded away below the row, down once it's open and the arrow's
                job is to put it back. */}
            <View
              style={{ transform: [{ rotate: isExpanded ? "0deg" : "180deg" }] }}
            >
              <AnimatedTintIcon source={chevronIcon} size={18} tintColor={colors.active} />
            </View>
          </Pressable>

          {isExpanded && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(110)}
              className="pb-5"
            >
              {/* The full date in whichever system the row above is not
                  using: with the row now leading in the primary system, a
                  heading in that same system would only restate the line above
                  it. Accent and type taken from the day sheet's secondary date
                  line, which answers the same question one level down. */}
              <Animated.Text
                className="text-[11.5px] font-semibold mb-2"
                style={nameStyle}
              >
                {dateLabels!.body}
              </Animated.Text>

              <ScrollView
                style={{ maxHeight: MAX_BODY_HEIGHT }}
                showsVerticalScrollIndicator={false}
              >
                {/* Description only — no header row and no "More info" to
                    press. The sheet's card needs both because it opens on a
                    date you tapped blind; here the row above already names the
                    holiday, and every description opens with that name anyway.
                    A day can carry several key dates, so the row names the
                    first and the body carries a card each. */}
                {nextKeyDate!.names.map((name, index) => (
                  <Animated.View
                    key={name}
                    className={`overflow-hidden ${index > 0 ? "mt-2" : ""}`}
                    style={[cardStyle, { borderRadius: 13 }]}
                  >
                    <Animated.Text
                      className="text-[12.5px] px-3 py-3"
                      style={[labelStyle, { lineHeight: 19.5 }]}
                    >
                      {IMPORTANT_DATE_DESCRIPTIONS[name] ??
                        "Description not available."}
                    </Animated.Text>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </>
      )}
    </Animated.View>
  );
};

const sheet = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
