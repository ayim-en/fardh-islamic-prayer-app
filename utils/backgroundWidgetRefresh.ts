import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { DEFAULT_PRAYER_SETTINGS, tuneSettingsToString } from "@/constants/prayerSettings";
import {
  getPrayerDict,
  PrayerDict,
  PrayerTimesParams,
} from "@/prayer-api/prayerTimesAPI";
import { getCurrentPrayerFromDay } from "./prayerHelpers";
import {
  buildLastThirdNights,
  buildWidgetDays,
  monthsSpanning,
  widgetExpiryDate,
} from "./widgetPayload";
import { WidgetPrayerData, updateWidgetPrayerTimes } from "./widgetStorage";

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

    // Load prayer settings with defaults
    const settingsStr = await AsyncStorage.getItem("prayerSettings");
    const settings = settingsStr
      ? { ...DEFAULT_PRAYER_SETTINGS, ...JSON.parse(settingsStr) }
      : DEFAULT_PRAYER_SETTINGS;

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

    // Fetch every month the widget's window touches — up to three, since 30
    // days from the 31st of a month can reach past the next one. The run also
    // covers a day either side of the cached days: the evening before opened
    // the night that may still be in progress, and the morning after holds the
    // Fajr that ends the last one. Neither joins the day list.
    const now = new Date();
    const baseUrl = "https://api.aladhan.com/v1";

    let prayerDict: PrayerDict = {};
    for (const { year, month } of monthsSpanning(now)) {
      try {
        const monthDict = await getPrayerDict(baseUrl, year, month, params);
        prayerDict = { ...prayerDict, ...monthDict };
      } catch (error) {
        // A month we can't reach shortens the window rather than failing the
        // refresh; the expiry below shrinks to match what we actually have.
        console.warn(`[BackgroundTask] Skipping month ${month}/${year}:`, error);
      }
    }

    const days = buildWidgetDays(prayerDict, now);

    if (days.length === 0) {
      console.log("[BackgroundTask] No prayer data found for upcoming days");
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Load other settings for widget data
    const [themePrayer, locationName] = await Promise.all([
      AsyncStorage.getItem("themePrayer"),
      AsyncStorage.getItem("cachedLocationName"),
    ]);

    // Determine current prayer based on time (use shared logic)
    const currentPrayer = getCurrentPrayerFromDay(days[0], now) || "Isha";

    // Get theme colors based on current prayer
    const { accentColor, isDarkMode } = getThemeForPrayer(
      themePrayer || currentPrayer
    );

    // Update widget storage
    const widgetData: WidgetPrayerData = {
      days,
      lastThirdNights: buildLastThirdNights(prayerDict, days),
      expiresOn: widgetExpiryDate(days),
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
