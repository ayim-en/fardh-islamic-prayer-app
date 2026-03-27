import { NextHijriHolidayData } from "@/prayer-api/islamicCalendarAPI";
import { convertDDMMYYYYToISO, getTodayISO } from "@/utils/calendarHelpers";
import React from "react";
import { Text, View } from "react-native";
import { AnimatedCrossfadeImage } from "./AnimatedCrossfadeImage";

interface CalendarHeaderProps {
  currentPrayer: { prayer: string; time: string } | null;
  locationName: string;
  backgroundImage: any | null;
  nextHoliday: NextHijriHolidayData | null;
}

export const CalendarHeader = ({
  currentPrayer,
  locationName,
  backgroundImage,
  nextHoliday,
}: CalendarHeaderProps) => {
  const holidayName =
    nextHoliday?.hijri?.holidays?.[0] || nextHoliday?.gregorian?.holidays?.[0];
  const hasHoliday = holidayName !== undefined;
  const isToday =
    hasHoliday &&
    nextHoliday?.gregorian?.date != null &&
    convertDDMMYYYYToISO(nextHoliday.gregorian.date) === getTodayISO();

  return (
    <>
      <AnimatedCrossfadeImage source={backgroundImage} resizeMode="cover" />

      <View className="absolute left-0 right-0 justify-center items-center pt-24 gap-2">
        <Text
          className="font-bold text-5xl text-white text-center"
          style={{
            textShadowColor: "rgba(0,0,0,0.4)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {nextHoliday
            ? hasHoliday
              ? isToday ? "Current Holiday:" : "Upcoming Holiday:"
              : "No Upcoming Holiday"
            : "Loading upcoming holiday..."}
        </Text>
        {nextHoliday && hasHoliday && (
          <Text
            className="font-bold text-5xl text-white text-center"
            style={{
              textShadowColor: "rgba(0,0,0,0.4)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {holidayName}
          </Text>
        )}
      </View>
    </>
  );
};
