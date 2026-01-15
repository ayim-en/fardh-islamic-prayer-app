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

export interface WidgetPrayerData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  tomorrowFajr: string | null;
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

    // Reload all widgets
    ExtensionStorageClass.reloadWidget("MorningPrayerWidget");
    ExtensionStorageClass.reloadWidget("EveningPrayerWidget");
    ExtensionStorageClass.reloadWidget("AllPrayersWidget");
    ExtensionStorageClass.reloadWidget("UpcomingPrayerWidget");

    return true;
  } catch (error) {
    console.error("Failed to update widget prayer times:", error);
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
