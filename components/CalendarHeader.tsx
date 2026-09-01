import { AnimatedCrossfadeImage } from "@/components/AnimatedCrossfadeImage";
import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import { resolveBothDateLabels, resolveBySystem } from "@/utils/dateSystemHelpers";
import React from "react";
import { Text, useWindowDimensions, View } from "react-native";

// Self-contained header for the Calendar tab, mirroring PrayerHeader and
// QiblaHeader. It owns the background image, its own height, and all of its own
// spacing — the screen passes data in and never styles it. Layout changes to the
// grid below therefore can't disturb it.

// Deliberately smaller than the home screen's HOME_HEADER_HEIGHT_RATIO of 0.4:
// a calendar earns its space by showing dates. 0.31 matches the design mockup,
// where the panel starts a little under a third of the way down the screen.
//
// This is past the point where the square grid below stays width-limited on
// every phone — a mid-size device now loses a point or two off the square's
// side, and a 13 mini around five, leaving a small gap either side of the grid.
// That trade is deliberate: the gap is barely visible, the extra header is not.
const HEIGHT_RATIO = 0.31;

// Still tall enough to keep the date clear of the notch — the app mounts no
// SafeAreaProvider, so useSafeAreaInsets would throw. This mirrors
// PrayerHeader's own paddingTop as insurance on short devices.
const TEXT_PADDING_TOP = 24;
// Tight, because the width bound below is what caps the type size — every point
// of padding here comes straight off the font.
const HORIZONTAL_PADDING = 10;

const TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.4)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
} as const;

// Gives adjustsFontSizeToFit something to measure against; padding lives here
// rather than on the container so the text's own box is what gets bounded.
const TEXT_BOUNDS = {
  width: "100%",
  textAlign: "center",
  paddingHorizontal: HORIZONTAL_PADDING,
} as const;

// Type scales with the header, which ranges ~176pt to ~256pt across devices —
// a fixed size looks oversized on a compact phone and lost on a large one.
//
// Bounded by WIDTH as well as height, so the size stays put all year. Without
// the width bound the declared size holds for "May 13, 2026" but
// adjustsFontSizeToFit quietly shrinks "September 13, 2026", and the header
// changes size from one month to the next. Longest strings each system has to
// hold: 18 chars Gregorian, 25 Hijri ("28 Jumādá al-ākhirah 1448"). The budget
// follows the label into whichever line it lands in, so a Hijri-primary header
// sizes its big line against 25 characters rather than 18.
//
// Width is the binding constraint on every phone, so these two char-width
// figures set the type size in practice — the height ratios below only bite on
// unusually short screens. Both were measured off the design mockup rather than
// estimated: "11 August 2026" set 6.65em wide over 14 characters.
const MAX_CHARS = { gregorian: 18, hijri: 25 };
const BOLD_CHAR_WIDTH = 0.475; // em, measured against the system face
const SEMIBOLD_CHAR_WIDTH = 0.46;

// The mockup sets the secondary line at just under half the primary one (digit
// heights 27px against 57px). Deriving it as a ratio rather than clamping it
// independently is what keeps that relationship intact on every screen — the
// two lines previously drifted to 0.74 on a mid-size phone, which read as two
// headings rather than a date and its subtitle.
const SECONDARY_RATIO = 0.55;

const scaleType = (
  headerHeight: number,
  width: number,
  maxChars: { leading: number; trailing: number }
) => {
  const usable = width - HORIZONTAL_PADDING * 2;
  // Width caps both lines outright — a floor allowed to overrule it would hand
  // the fitting back to adjustsFontSizeToFit, which measures the string in
  // front of it, and the header would change size from one month to the next.
  // That matters most with Hijri leading, where 25 characters buy a smaller
  // line than the floor would like.
  const leading = Math.floor(
    Math.min(
      usable / (maxChars.leading * BOLD_CHAR_WIDTH),
      Math.max(34, Math.min(52, headerHeight * 0.24))
    )
  );
  return {
    leading,
    trailing: Math.floor(
      Math.min(
        usable / (maxChars.trailing * SEMIBOLD_CHAR_WIDTH),
        Math.max(18, Math.min(26, leading * SECONDARY_RATIO))
      )
    ),
  };
};

export interface CalendarHeaderProps {
  /** Measured height of the screen container (already excludes the tab bar). */
  containerHeight: number;
  /** Today's Gregorian date, e.g. "13 August 2026". */
  gregorianLabel: string;
  /** Today's Hijri date, e.g. "28 Ṣafar 1448". Null until the cache resolves. */
  hijriLabel: string | null;
  /** Which system leads. Both are always shown; this sets which one is larger. */
  primaryDateSystem: PrimaryDateSystem;
  backgroundImage: any | null;
}

export const CalendarHeader = ({
  containerHeight,
  gregorianLabel,
  hijriLabel,
  primaryDateSystem,
  backgroundImage,
}: CalendarHeaderProps) => {
  const { width } = useWindowDimensions();
  const height = containerHeight * HEIGHT_RATIO;
  const type = scaleType(height, width, resolveBySystem(primaryDateSystem, MAX_CHARS));
  // Until the cache lands there is no Hijri date, so with Hijri primary the
  // known Gregorian one leads and the second line is briefly empty. Only the
  // content moves: both sizes are fixed by the setting, not by what is in them.
  const labels = resolveBothDateLabels(primaryDateSystem, {
    gregorian: gregorianLabel,
    hijri: hijriLabel,
  });

  return (
    <>
      <AnimatedCrossfadeImage source={backgroundImage} resizeMode="cover" />

      <View
        className="items-center justify-center"
        style={{ height, paddingTop: TEXT_PADDING_TOP }}
      >
        {/* width + textAlign are load-bearing, not decorative: adjustsFontSizeToFit
            needs a bounded width to shrink against. Under `items-center` alone the
            Text sizes to its content, so a long date renders at full size and
            overflows instead of scaling down. Same pattern as PrayerHeader. */}
        <Text
          className="font-bold text-white"
          style={[
            TEXT_SHADOW,
            TEXT_BOUNDS,
            { fontSize: type.leading, lineHeight: type.leading * 1.15 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {labels.leading || " "}
        </Text>
        {/* Space is reserved even before the Hijri date resolves, so the
            header doesn't reflow when the calendar cache lands — whichever of
            the two lines that date happens to be in. */}
        <Text
          className="font-semibold mt-1"
          style={[
            TEXT_SHADOW,
            TEXT_BOUNDS,
            {
              // Muted rather than near-white, so it reads as secondary to the
              // leading line at its larger size. Kept light enough to stay
              // legible over the darker prayer backgrounds.
              color: "rgba(255,255,255,0.72)",
              fontSize: type.trailing,
              lineHeight: type.trailing * 1.3,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {labels.trailing || " "}
        </Text>
      </View>
    </>
  );
};
