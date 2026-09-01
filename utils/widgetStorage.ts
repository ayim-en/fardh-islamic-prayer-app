import { Platform } from "react-native";

// App Group identifier for sharing data with widgets
const APP_GROUP = "group.com.ayimen.fardh";
const PRAYER_TIMES_KEY = "prayerTimes";

// Import the native module conditionally for iOS
let ExtensionStorageClass: any = null;
let storageInstance: any = null;

if (Platform.OS === "ios") {
  try {
    const module = require("@bacons/apple-targets");
    ExtensionStorageClass = module.ExtensionStorage;
    if (ExtensionStorageClass) {
      storageInstance = new ExtensionStorageClass(APP_GROUP);
    }
  } catch (e) {
    console.log("ExtensionStorage not available");
  }
}

export interface DayPrayerTimes {
  date: string; // ISO date YYYY-MM-DD
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/**
 * A night's last third, as the widget carries it: the evening it opened on,
 * and the two moments it runs between.
 *
 * The moments are absolute instants, not clock times. The window opens after
 * midnight, so its clock time falls on the day after the Maghrib that began
 * the night — the crossing every implementation of this gets wrong. Carrying
 * instants answers it once, in the app, and leaves the widget with nothing to
 * infer. See buildLastThirdNights in widgetPayload.ts.
 */
export interface LastThirdNight {
  // ISO date of the Maghrib the night was divided from.
  date: string;
  start: string;
  end: string;
}

export interface WidgetPrayerData {
  days: DayPrayerTimes[]; // A contiguous run of days starting today
  // The last third of each night the days cover, plus the night already in
  // progress when the payload was written. Absolute instants, so the widget
  // does no arithmetic across the midnight the window opens after.
  lastThirdNights: LastThirdNight[];
  // ISO date of the first day `days` does not cover. Past it the widget shows
  // placeholders rather than the last cached day's times; see ADR-0002.
  expiresOn: string;
  currentPrayer: string | null;
  locationName: string | null;
  lastUpdated: string;
  // Theme colors
  accentColor: string;
  isDarkMode: boolean;
  // Theme override prayer (if user has set a theme)
  themePrayer: string | null;
  // Time format preference
  timeFormat: "12h" | "24h";
}

/**
 * Updates the widget with the latest prayer times
 * @param data Prayer times data to share with the widget
 */
export const updateWidgetPrayerTimes = async (
  data: WidgetPrayerData
): Promise<boolean> => {
  if (Platform.OS !== "ios" || !storageInstance || !ExtensionStorageClass) {
    return false;
  }

  try {
    storageInstance.set(PRAYER_TIMES_KEY, data);

    // Small delay to ensure data is flushed before widget reload
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reload every widget, rather than an enumerated list of kinds: a widget
    // missing from such a list looks right on install and then silently
    // freezes a day later, and nothing about adding one makes you remember it.
    ExtensionStorageClass.reloadWidget(null);

    return true;
  } catch (error) {
    console.error("[WidgetStorage] Failed to update:", error);
    return false;
  }
};

/**
 * Reloads all prayer widgets
 */
export const reloadPrayerWidgets = async (): Promise<void> => {
  if (Platform.OS !== "ios" || !ExtensionStorageClass) {
    return;
  }

  try {
    ExtensionStorageClass.reloadWidget(null); // Reload all widgets
  } catch (error) {
    console.error("Failed to reload widgets:", error);
  }
};
