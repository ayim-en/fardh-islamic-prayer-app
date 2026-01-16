import { Prayers } from "@/constants/prayers";
import { tuneSettingsToString } from "@/constants/prayerSettings";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { getPrayerDict, PrayerDict } from "@/prayer-api/prayerTimesAPI";
import { getLocalISODate } from "@/utils/calendarHelpers";
import { getCurrentPrayer } from "@/utils/prayerHelpers";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";

export const usePrayerTimes = (location: Location.LocationObject | null) => {
  const { settings, loading: settingsLoading } = usePrayerSettings();
  const [prayerDict, setPrayerDict] = useState<PrayerDict>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches prayer times when location or settings change
  // Fetches previous, current, and next month for better carousel experience
  useEffect(() => {
    if (!location || settingsLoading) return;

    (async () => {
      setLoading(true);
      try {
        const baseUrl = "https://api.aladhan.com/v1";
        const now = new Date();

        // Calculate previous, current, and next month/year
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const prevDate = new Date(currentYear, currentMonth - 2, 1); // -2 because month is 0-indexed in Date constructor
        const nextDate = new Date(currentYear, currentMonth, 1);

        const months = [
          { year: prevDate.getFullYear(), month: prevDate.getMonth() + 1 },
          { year: currentYear, month: currentMonth },
          { year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 },
        ];

        const params = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          method: settings.method,
          school: settings.school,
          latitudeAdjustmentMethod: settings.latitudeAdjustmentMethod,
          tune: tuneSettingsToString(settings.tune),
        };

        // Fetch all three months in parallel
        const results = await Promise.all(
          months.map(({ year, month }) =>
            getPrayerDict(baseUrl, year, month, params)
          )
        );

        // Combine all three months into a single dictionary
        const combinedData = results.reduce(
          (acc, monthData) => ({ ...acc, ...monthData }),
          {}
        );

        setPrayerDict(combinedData);
      } catch (err: any) {
        const errorMessage = err?.message ?? "Failed to fetch prayer times";
        console.error("Prayer times fetch error:", errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [location, settings, settingsLoading]);

  // Sorts prayerDict dates in numerical order which is chronological for ISO strings
  const sortedDates = useMemo(
    () => Object.keys(prayerDict).sort(),
    [prayerDict]
  );

  // Finds index of today's date using ISO string
  const now = new Date();
  const todayISO = getLocalISODate(now);
  const todayIndex = useMemo(
    () =>
      Math.max(
        0,
        sortedDates.findIndex((d) => d === todayISO)
      ),
    [sortedDates, todayISO]
  );

  // State that holds the current prayer and its time
  const [currentPrayer, setCurrentPrayer] = useState<{
    prayer: string;
    time: string;
  } | null>(null);

  // Updates currentPrayer when prayerDict changes and schedules update for next prayer time
  useEffect(() => {
    if (Object.keys(prayerDict).length === 0) return;

    const updateCurrentPrayer = () => {
      setCurrentPrayer(getCurrentPrayer(prayerDict));
    };

    // Initial update
    updateCurrentPrayer();

    // Schedule timeout for when the next prayer time arrives (to update current prayer)
    const scheduleNextUpdate = () => {
      const todayISO = getLocalISODate(new Date());
      const todayPrayers = prayerDict[todayISO];
      if (!todayPrayers) return null;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find the next prayer that hasn't started yet
      let nextPrayerTime: Date | null = null;

      for (const prayer of Prayers) {
        const timeStr = todayPrayers.timings[prayer];
        const cleanTime = timeStr.split(" ")[0];
        const [hours, minutes] = cleanTime.split(":").map(Number);
        const prayerMinutes = hours * 60 + minutes;

        if (prayerMinutes > currentMinutes) {
          nextPrayerTime = new Date();
          nextPrayerTime.setHours(hours, minutes, 0, 0);
          break;
        }
      }

      // If no more prayers today, schedule for Fajr tomorrow
      if (!nextPrayerTime) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowISO = getLocalISODate(tomorrow);
        const tomorrowPrayers = prayerDict[tomorrowISO];

        if (tomorrowPrayers) {
          const fajrTime = tomorrowPrayers.timings.Fajr.split(" ")[0];
          const [hours, minutes] = fajrTime.split(":").map(Number);
          nextPrayerTime = new Date(tomorrow);
          nextPrayerTime.setHours(hours, minutes, 0, 0);
        }
      }

      if (!nextPrayerTime) return null;

      const msUntilPrayer = nextPrayerTime.getTime() - now.getTime();

      // Add 1 second buffer to ensure we're past the prayer time
      return setTimeout(() => {
        updateCurrentPrayer();
        // Schedule the next one
        const nextTimeout = scheduleNextUpdate();
        if (nextTimeout) timeoutRef = nextTimeout;
      }, msUntilPrayer + 1000);
    };

    let timeoutRef = scheduleNextUpdate();

    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [prayerDict]);

  // Updates currentPrayer when prayer screen is focused
  useFocusEffect(
    useCallback(() => {
      if (Object.keys(prayerDict).length > 0) {
        setCurrentPrayer(getCurrentPrayer(prayerDict));
      }
    }, [prayerDict])
  );

  return {
    prayerDict,
    loading,
    error,
    sortedDates,
    todayISO,
    todayIndex,
    currentPrayer,
  };
};
