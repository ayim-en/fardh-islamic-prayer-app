import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import type { CellStyleBundle } from "./cellStyles";

// Type scales with the cell so a taller row reads as a bigger calendar rather
// than the same small numerals adrift in whitespace. Floors keep a cramped
// device legible; ceilings stop the Hijri label outgrowing its ~51pt column —
// "1 Rab II" is the longest string any cell has to hold.
//
// Ratios come from the mockup, where a 58pt row carried a 20.6pt numeral over a
// 13.8pt Hijri line.
const scaleType = (height: number) => ({
  gregorian: Math.round(Math.max(16, Math.min(24, height * 0.34))),
  hijri: Math.round(Math.max(11, Math.min(15, height * 0.23))),
});

// Faded rather than recoloured. A plain opacity adds no useAnimatedStyle
// allocations — the whole point of hoisting those into cellStyles — composes
// with the theme crossfade for free, and dims the key-date dot and the accent
// month-boundary label in step without needing faded variants of each.
const OUTSIDE_OPACITY = 0.35;

export interface DayCellProps {
  iso: string;
  gregorianDay: number;
  hijriLabel: string | null;
  isHijriMonthStart: boolean;
  /** Belongs to the previous or next month. */
  isOutside: boolean;
  isSelected: boolean;
  hasKeyDate: boolean;
  height: number;
  onPress: (iso: string) => void;
  styles: CellStyleBundle;
}

// One grid cell.
//
// Today carries no marker: the header already states the current date, and a
// filled block here would only compete with the selected day for the same
// accent colour.
//
// Every Animated.Text below has exactly ONE style source for its whole
// lifetime. `isHijriMonthStart` and `isOutside` are fixed properties of a date
// in a given month, and FlatList mounts/unmounts pages rather than recycling
// views, so a mounted cell can never cross between animated styles. That is
// what lets us skip the key-remount hack the old CalendarCard needed —
// detaching a Reanimated style does not reset a colour it already applied on
// the UI thread.
export const DayCell = memo(function DayCell({
  iso,
  gregorianDay,
  hijriLabel,
  isHijriMonthStart,
  isOutside,
  isSelected,
  hasKeyDate,
  height,
  onPress,
  styles,
}: DayCellProps) {
  const type = scaleType(height);

  return (
    <Pressable
      onPress={() => onPress(iso)}
      style={{
        flex: 1,
        height,
        alignItems: "center",
        justifyContent: "center",
        opacity: isOutside ? OUTSIDE_OPACITY : 1,
      }}
      accessibilityRole="button"
    >
      {/* Selection is the ONE property here that flips while a cell stays
          mounted, so this is the one place the single-style-source rule can't
          hold. The key forces a remount on toggle: without it, Reanimated
          leaves the previously applied colour on the UI thread and the day
          stays accent-coloured after being deselected. */}
      <Animated.Text
        key={isSelected ? "selected" : "default"}
        style={[
          sheet.gregorian,
          { fontSize: type.gregorian, lineHeight: type.gregorian + 3 },
          isSelected ? styles.accent : styles.gregorian,
        ]}
      >
        {gregorianDay}
      </Animated.Text>

      {/* Rendered unconditionally with a fixed line height so the grid does not
          grow when the Hijri cache resolves mid-session. */}
      <Animated.Text
        style={[
          sheet.hijri,
          { fontSize: type.hijri, lineHeight: type.hijri + 3 },
          isHijriMonthStart ? styles.accent : styles.hijri,
          isHijriMonthStart && sheet.hijriStrong,
        ]}
        numberOfLines={1}
        // Month-boundary cells carry "1 Rab II" rather than a bare numeral;
        // shrink to fit rather than clipping if a column runs narrow.
        adjustsFontSizeToFit
      >
        {hijriLabel ?? ""}
      </Animated.Text>

      {hasKeyDate && <Animated.View style={[sheet.dot, styles.dot]} />}
    </Pressable>
  );
});

// Sizes live inline (see scaleType) — these hold only what doesn't vary.
const sheet = StyleSheet.create({
  gregorian: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  hijri: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  hijriStrong: {
    fontWeight: "700",
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
