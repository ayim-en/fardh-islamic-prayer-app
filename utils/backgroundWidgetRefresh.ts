import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { tuneSettingsToString } from "@/constants/prayerSettings";
import { getPrayerDict, PrayerTimesParams } from "@/prayer-api/prayerTimesAPI";
import { cleanTimeString } from "./prayerHelpers";
import {
  DayPrayerTimes,
  WidgetPrayerData,
  updateWidgetPrayerTimes,
} from "./widgetStorage";

const BACKGROUND_TASK_NAME = "WIDGET_REFRESH_TASK";

// Define the background task at module level
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    console.log("[BackgroundTask] Starting widget refresh...");

    // Load saved location from AsyncStorage
    const locationStr = await AsyncStorage.getItem("cachedLocation");
    if (!locationStr) {
      console.log("[BackgroundTask] No cached location found");
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    const location = JSON.parse(locationStr);

    // Load prayer settings
    const settingsStr = await AsyncStorage.getItem("prayerSettings");
    const settings = settingsStr ? JSON.parse(settingsStr) : {};

    // Build params for API
    const params: PrayerTimesParams = {
      latitude: location.latitude,
      longitude: location.longitude,
      method: settings.method,
      school: settings.school,
      latitudeAdjustmentMethod: settings.latitudeAdjustmentMethod,
    };

    // Add tune if available
    if (settings.tune) {
      params.tune = tuneSettingsToString(settings.tune);
    }

    // Fetch prayer times for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const baseUrl = "https://api.aladhan.com/v1";

    // Fetch current month
    let prayerDict = await getPrayerDict(
      baseUrl,
      currentYear,
      currentMonth,
      params
    );

    // Check if we need next month's data (for days near end of month)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentDay = now.getDate();
    if (currentDay > daysInMonth - 7) {
      // Fetch next month as well
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const nextMonthDict = await getPrayerDict(
        baseUrl,
        nextYear,
        nextMonth,
        params
      );
      prayerDict = { ...prayerDict, ...nextMonthDict };
    }

    // Extract 7 days starting from today
    const days: DayPrayerTimes[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const isoDate = date.toISOString().split("T")[0];
      const dayData = prayerDict[isoDate];
      if (dayData?.timings) {
        days.push({
          date: isoDate,
          fajr: cleanTimeString(dayData.timings.Fajr),
          sunrise: cleanTimeString(dayData.timings.Sunrise),
          dhuhr: cleanTimeString(dayData.timings.Dhuhr),
          asr: cleanTimeString(dayData.timings.Asr),
          maghrib: cleanTimeString(dayData.timings.Maghrib),
          isha: cleanTimeString(dayData.timings.Isha),
        });
      }
    }

    if (days.length === 0) {
      console.log("[BackgroundTask] No prayer data found for upcoming days");
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Load other settings for widget data
    const [themePrayer, locationName] = await Promise.all([
      AsyncStorage.getItem("themePrayer"),
      AsyncStorage.getItem("cachedLocationName"),
    ]);

    // Determine current prayer based on time
    const currentPrayer = getCurrentPrayer(days[0], now);

    // Get theme colors based on current prayer
    const { accentColor, isDarkMode } = getThemeForPrayer(
      themePrayer || currentPrayer
    );

    // Update widget storage
    const widgetData: WidgetPrayerData = {
      days,
      currentPrayer,
      locationName: locationName || null,
      lastUpdated: new Date().toISOString(),
      accentColor,
      isDarkMode,
      themePrayer: themePrayer || null,
      timeFormat: settings.timeFormat || "24h",
    };

    await updateWidgetPrayerTimes(widgetData);

    console.log("[BackgroundTask] Widget refresh completed successfully");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[BackgroundTask] Failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Helper to determine current prayer based on time
function getCurrentPrayer(day: DayPrayerTimes, now: Date): string | null {
  const prayers = [
    { name: "Fajr", time: day.fajr },
    { name: "Sunrise", time: day.sunrise },
    { name: "Dhuhr", time: day.dhuhr },
    { name: "Asr", time: day.asr },
    { name: "Maghrib", time: day.maghrib },
    { name: "Isha", time: day.isha },
  ];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the current prayer (the last prayer time that has passed)
  let currentPrayer = "Isha"; // Default to Isha (previous day's)
  for (const prayer of prayers) {
    const [hours, minutes] = prayer.time.split(":").map(Number);
    const prayerMinutes = hours * 60 + minutes;
    if (currentMinutes >= prayerMinutes) {
      currentPrayer = prayer.name;
    } else {
      break;
    }
  }

  return currentPrayer;
}

// Helper to get theme colors for a prayer
function getThemeForPrayer(prayer: string | null): {
  accentColor: string;
  isDarkMode: boolean;
} {
  switch (prayer) {
    case "Fajr":
      return { accentColor: "#568FAF", isDarkMode: false };
    case "Sunrise":
      return { accentColor: "#ff9a13", isDarkMode: false };
    case "Dhuhr":
      return { accentColor: "#55bddf", isDarkMode: false };
    case "Asr":
      return { accentColor: "#ff9a13", isDarkMode: false };
    case "Maghrib":
      return { accentColor: "#9B59B6", isDarkMode: true };
    case "Isha":
      return { accentColor: "#854ab4", isDarkMode: true };
    default:
      return { accentColor: "#568FAF", isDarkMode: false };
  }
}

// Register the background task
export async function registerBackgroundTask(): Promise<void> {
  if (Platform.OS !== "ios") {
    console.log("[BackgroundTask] Only supported on iOS");
    return;
  }

  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME
    );
    if (isRegistered) {
      console.log("[BackgroundTask] Task already registered");
      return;
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 60 * 60 * 6, // 6 hours minimum (iOS decides actual timing)
    });
    console.log("[BackgroundTask] Registered successfully");
  } catch (error) {
    console.error("[BackgroundTask] Failed to register:", error);
  }
}

// Unregister the background task if needed
export async function unregisterBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME
    );
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
      console.log("[BackgroundTask] Unregistered successfully");
    }
  } catch (error) {
    console.error("[BackgroundTask] Failed to unregister:", error);
  }
}
