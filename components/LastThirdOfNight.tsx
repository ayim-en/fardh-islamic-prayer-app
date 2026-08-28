import { TimeFormat } from "@/constants/prayerSettings";
import { useAnimatedTextColor } from "@/hooks/useAnimatedColor";
import { useCurrentMinute } from "@/hooks/useCurrentMinute";
import {
  formatClockTime,
  formatTimeWithPreference,
  getLastThirdOfNight,
  isWithinLastThird,
} from "@/utils/prayerHelpers";
import React, { useMemo } from "react";
import { StyleProp, Text, TextStyle, View } from "react-native";
import Animated from "react-native-reanimated";

// How far the label is dimmed while the window is shut. Enough to read as
// upcoming rather than current, without becoming unreadable.
const DIMMED_OPACITY = 0.55;

type LabelBodyProps = {
  startTime: string;
  isActive: boolean;
  activeColor: string;
  textStyle: StyleProp<TextStyle>;
};

// The caption sits above the time and takes the TODAY badge's colour, size and
// weight, so the two sides of the date row read as a pair. Caption and time dim
// together as one block while the window is shut.
const LabelBody = ({
  startTime,
  isActive,
  activeColor,
  textStyle,
}: LabelBodyProps) => (
  <View
    className="items-end"
    style={{ opacity: isActive ? 1 : DIMMED_OPACITY }}
    // Read as one phrase carrying the full term, rather than as an
    // abbreviated label followed by a bare time.
    accessible
    accessibilityLabel={`Last third of the night begins at ${startTime}`}
  >
    <Text className="text-sm font-semibold" style={{ color: activeColor }}>
      LAST THIRD
    </Text>
    <Animated.Text
      style={[{ fontSize: 18, fontWeight: "bold", marginTop: 4 }, textStyle]}
    >
      {startTime}
    </Animated.Text>
  </View>
);

// Same label, with the colour cross-faded rather than snapped. Only the page
// in view mounts this: an animated style per page would put a reanimated
// mapper on every day in the carousel to animate a value nobody is looking at.
const CrossfadingLabel = ({
  color,
  ...body
}: Omit<LabelBodyProps, "textStyle"> & { color: string }) => {
  const animatedTextStyle = useAnimatedTextColor(color);
  return <LabelBody {...body} textStyle={animatedTextStyle} />;
};

interface LastThirdOfNightProps {
  // The day Maghrib falls on; Fajr belongs to the day after it.
  isoDate: string;
  maghribTime: string;
  // Fajr from the following day's record, absent when that day isn't loaded.
  nextFajrTime?: string;
  timeFormat: TimeFormat;
  // Accent colour, used while the current time is inside the window — the same
  // colour the prayer rows use to mark the current prayer.
  activeColor: string;
  // Secondary text colour, used dimmed while the window is shut.
  secondaryColor: string;
  // Whether this is the carousel page the user is looking at.
  isCurrentPage: boolean;
}

// The start of the last third of the night for one day of the prayer carousel.
// Every page renders its own night, so a user can plan more than one night
// ahead; only the night that is actually open renders highlighted.
export const LastThirdOfNight = React.memo(
  ({
    isoDate,
    maghribTime,
    nextFajrTime,
    timeFormat,
    activeColor,
    secondaryColor,
    isCurrentPage,
  }: LastThirdOfNightProps) => {
    const now = useCurrentMinute();
    const night = useMemo(
      () => getLastThirdOfNight(isoDate, maghribTime, nextFajrTime),
      [isoDate, maghribTime, nextFajrTime]
    );

    // The last page of the carousel has no following day to take Fajr from.
    if (!night) return null;

    const isActive = isWithinLastThird(night, now);
    const color = isActive ? activeColor : secondaryColor;
    const startTime = formatTimeWithPreference(
      formatClockTime(night.start),
      timeFormat
    );

    return isCurrentPage ? (
      <CrossfadingLabel
        startTime={startTime}
        isActive={isActive}
        activeColor={activeColor}
        color={color}
      />
    ) : (
      <LabelBody
        startTime={startTime}
        isActive={isActive}
        activeColor={activeColor}
        textStyle={{ color }}
      />
    );
  }
);

LastThirdOfNight.displayName = "LastThirdOfNight";
