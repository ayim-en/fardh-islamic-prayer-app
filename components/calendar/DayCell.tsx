import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import { resolveBothDateLabels } from "@/utils/dateSystemHelpers";
import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import type { CellStyleBundle } from "./cellStyles";

// Type scales with the cell so a taller row reads as a bigger calendar rather
// than the same small numerals adrift in whitespace. Floors keep a cramped
// device legible; ceilings stop a label outgrowing its ~51pt column —
// "1 Rab II" is the longest string any cell has to hold.
//
// Sizes belong to the slot, not to the system: the primary date leads at the
// larger size whichever system it is, and both lines shrink to fit rather than
// clipping when the Hijri label lands in the leading one on a month boundary.
//
// Ratios come from the mockup, where a 58pt row carried a 20.6pt numeral over a
// 13.8pt Hijri line.
const scaleType = (height: number) => ({
  leading: Math.round(Math.max(16, Math.min(24, height * 0.34))),
  trailing: Math.round(Math.max(11, Math.min(15, height * 0.23))),
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
  /** Which system this cell leads with, at the larger size. */
  primaryDateSystem: PrimaryDateSystem;
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
  primaryDateSystem,
  hasKeyDate,
  height,
  onPress,
  styles,
}: DayCellProps) {
  const type = scaleType(height);

  // Both dates, sorted into the slot each belongs in. The Hijri label carries
  // its own month-boundary marker ("1 Rab I") and the accent that goes with it,
  // so what is accented travels with the label rather than with the slot —
  // except selection, which marks the day itself and so lands on whichever
  // label leads. A day the cache hasn't reached has no Hijri label at all, and
  // the resolver promotes the Gregorian numeral into the leading slot rather
  // than leaving the cell headed by a blank.
  const labels = resolveBothDateLabels(primaryDateSystem, {
    gregorian: String(gregorianDay),
    hijri: hijriLabel,
  });
  const hijriLeads = primaryDateSystem === "hijri";
  const leadingIsAccented = isSelected || (hijriLeads && isHijriMonthStart);
  const trailingIsAccented = !hijriLeads && isHijriMonthStart;

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
      {/* Selection and the primary date system are the two properties here
          that flip while a cell stays mounted, so this is where the
          single-style-source rule can't hold. The key forces a remount on
          either: without it, Reanimated leaves the previously applied colour on
          the UI thread and the day stays accent-coloured after being
          deselected — or after the system it was leading with changed. */}
      <Animated.Text
        key={`${primaryDateSystem}-${isSelected ? "selected" : "default"}`}
        style={[
          sheet.leading,
          { fontSize: type.leading, lineHeight: type.leading + 3 },
          leadingIsAccented ? styles.accent : styles.ink,
        ]}
        numberOfLines={1}
        // A leading Hijri label carries "1 Rab II" rather than a bare numeral;
        // shrink to fit rather than clipping if a column runs narrow. The width
        // below keeps that shrink local to this cell — see the sheet.
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {labels.leading}
      </Animated.Text>

      {/* Rendered unconditionally with a fixed line height so the grid does not
          grow when the Hijri cache resolves mid-session. */}
      <Animated.Text
        key={primaryDateSystem}
        style={[
          sheet.trailing,
          { fontSize: type.trailing, lineHeight: type.trailing + 3 },
          trailingIsAccented ? styles.accent : styles.muted,
          trailingIsAccented && sheet.trailingStrong,
        ]}
        numberOfLines={1}
        // Deliberately NOT adjustsFontSizeToFit. In this slot it shrank every
        // label in the week to the same illegible size whenever one cell held a
        // month boundary ("1 Rab II"), rather than shrinking just that cell.
        // "1 Rab II"/"1 Jum II" are the widest labels the grid can produce and
        // both fit the column unaided down to the narrowest supported phone, so
        // the fitting bought nothing and cost the whole row.
      >
        {labels.trailing}
      </Animated.Text>

      {hasKeyDate && <Animated.View style={[sheet.dot, styles.dot]} />}
    </Pressable>
  );
});

// Sizes live inline (see scaleType) — these hold only what doesn't vary.
const sheet = StyleSheet.create({
  leading: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    // Gives adjustsFontSizeToFit a frame that is the column, so a long label
    // scales against its own cell instead of against auto-sized content.
    width: "100%",
    textAlign: "center",
  },
  trailing: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    width: "100%",
    textAlign: "center",
  },
  trailingStrong: {
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
