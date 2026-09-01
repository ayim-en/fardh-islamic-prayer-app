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
// changes size from one month to the next. The budget follows the label into
// whichever line it lands in, so a Hijri-primary header sizes its big line
// against "30 Jumādá al-ākhirah 1448" rather than against a Gregorian date.
//
// Width is the binding constraint on every phone, so these figures set the type
// size in practice — the height clamps below only bite on unusually short
// screens. They are label widths in ems of the rendered size, measured with
// CoreText in the system face across all twelve months of both systems.
//
// The heading is budgeted at the ninth-widest of the twelve rather than the
// widest. Both systems have a long tail: "September 30, 2026" runs 9.55em
// against a 7.97em median, and "30 Jumādá al-ākhirah 1448" runs 12.82em where
// the other eleven Hijri months all fit inside 10.84em. Sizing for those
// outliers docks every other month of the year — 18% in the Hijri case — for a
// string seen one month in twelve. So nine months render at the full size and
// the longest few shrink a little: September by 8%, Jumādá al-ākhirah by 15%,
// the rest imperceptibly.
//
// The width bound is still what keeps that shrinking bounded and rare. What it
// is budgeted against is the judgement: the label most months actually carry,
// not the worst one the year can produce.
const LEADING_EM = { gregorian: 8.6, hijri: 10.8 }; // bold, as the heading renders
// The second line is sized by the ratio below rather than by its own width, so
// these are the true maxima — they only ever act as a ceiling, and at the sizes
// that line takes they never bind.
const TRAILING_EM = { gregorian: 9.3, hijri: 12.7 }; // semibold

// Width caps the heading outright — a floor allowed to overrule it would hand
// the fitting back to adjustsFontSizeToFit, which measures the string in front
// of it, and the header would change size from one month to the next.
const leadingSize = (headerHeight: number, widthCap: number) =>
  Math.min(widthCap, Math.max(34, Math.min(52, headerHeight * 0.24)));

// The second line is sized on its own terms, not as a fraction of the heading.
//
// A fraction was the original rule, from the mockup's 27px under 57px. It only
// works while the two lines carry similar amounts of text. With Hijri leading
// they do not: the heading is long and the date beneath it short, so matching
// point sizes leaves the second line covering barely half the width the first
// one does — and it reads as a caption, however the numbers compare.
//
// So it fills a set share of the width its own longest label would need, which
// gives a short label the points it takes to carry the same weight as a long
// one. The cap against the heading keeps the pair a heading and a date rather
// than two headings; the ceiling stops a large phone running away with it.
const SECONDARY_FILL = 0.85; // of the width its own longest label needs
const SECONDARY_MAX_RATIO = 0.85; // of the heading above it
const SECONDARY_CEILING = 30;
const SECONDARY_FLOOR = 18;

const scaleType = (
  headerHeight: number,
  width: number,
  em: { leading: number; trailing: number }
) => {
  const usable = width - HORIZONTAL_PADDING * 2;
  const leading = leadingSize(headerHeight, usable / em.leading);
  return {
    leading: Math.floor(leading),
    trailing: Math.floor(
      Math.max(
        SECONDARY_FLOOR,
        Math.min(
          SECONDARY_CEILING,
          (usable / em.trailing) * SECONDARY_FILL,
          leading * SECONDARY_MAX_RATIO
        )
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
  // Each line is measured against the system whose label lands in it.
  const type = scaleType(height, width, {
    leading: resolveBySystem(primaryDateSystem, LEADING_EM).leading,
    trailing: resolveBySystem(primaryDateSystem, TRAILING_EM).trailing,
  });
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
