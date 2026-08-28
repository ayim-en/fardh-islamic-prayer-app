import { TimeFormat } from "@/constants/prayerSettings";
import { useCurrentMinute } from "@/hooks/useCurrentMinute";
import {
  formatClockTime,
  formatTimeWithPreference,
  getLastThirdOfNight,
  isWithinLastThird,
} from "@/utils/prayerHelpers";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

// How far the label is dimmed while the window is shut. Enough to read as
// upcoming rather than current, without becoming unreadable.
const DIMMED_OPACITY = 0.55;

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

    return (
      <View
        className="items-end"
        style={{ opacity: isActive ? 1 : DIMMED_OPACITY }}
        // Read as one phrase carrying the full term, rather than as a bare
        // time followed by an abbreviated label.
        accessible
        accessibilityLabel={`Last third of the night begins at ${startTime}`}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold", color }}>
          {startTime}
        </Text>
        <Text className="text-sm font-semibold mt-1" style={{ color }}>
          Last third
        </Text>
      </View>
    );
  }
);

LastThirdOfNight.displayName = "LastThirdOfNight";
