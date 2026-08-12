import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { Prayers } from "@/constants/prayers";
import { DEFAULT_PRAYER_SETTINGS, TimeFormat, tuneSettingsToString } from "@/constants/prayerSettings";
import { getPrayerDict, PrayerDict, PrayerTimesParams } from "@/prayer-api/prayerTimesAPI";
import { getLocalISODate } from "./calendarHelpers";
import { parsePrayerTime } from "./prayerHelpers";
import { schedulePrayerNotification } from "./notificationService";

const TASK_NAME = "NOTIFICATION_CHECK_TASK";

// Define the background task at module level
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    console.log("[NotificationCheck] Starting notification verification...");

    // Check if master toggle is enabled
    const masterToggle = await AsyncStorage.getItem("notificationsMasterToggle");
    if (!masterToggle || !JSON.parse(masterToggle)) {
      console.log("[NotificationCheck] Master toggle is off, skipping");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Load notification settings
    const notificationsEnabledStr = await AsyncStorage.getItem("prayerNotifications");
    if (!notificationsEnabledStr) {
      console.log("[NotificationCheck] No notification settings found");
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    const notificationsEnabled: Record<string, boolean> = JSON.parse(notificationsEnabledStr);

    // Check if any prayers are enabled
    if (!Object.values(notificationsEnabled).some((enabled) => enabled)) {
      console.log("[NotificationCheck] No prayers enabled for notifications");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Load adhan settings
    const adhanMasterStr = await AsyncStorage.getItem("adhanMasterToggle");
    const adhanEnabledStr = await AsyncStorage.getItem("adhanEnabled");
    const adhanMasterToggle = adhanMasterStr ? JSON.parse(adhanMasterStr) : false;
    const adhanEnabled: Record<string, boolean> = adhanEnabledStr
      ? JSON.parse(adhanEnabledStr)
      : {};
    const effectiveAdhanEnabled = adhanMasterToggle ? adhanEnabled : {};
    const timeFormat = await getStoredTimeFormat();

    // Get currently scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledPrayerCount = scheduled.filter(
      (n) => n.content.data?.prayer
    ).length;

    console.log(
      `[NotificationCheck] Currently ${scheduledPrayerCount} prayer notifications scheduled`
    );

    // Calculate expected: enabled prayers × remaining days (up to 10)
    const enabledPrayerCount = Object.values(notificationsEnabled).filter(Boolean).length;
    // We expect at least half of a full schedule (to account for past-time prayers today)
    const minimumExpected = Math.floor(enabledPrayerCount * 5);

    if (scheduledPrayerCount >= minimumExpected) {
      console.log("[NotificationCheck] Notification count looks healthy, no action needed");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    console.warn(
      `[NotificationCheck] Only ${scheduledPrayerCount} notifications, expected at least ${minimumExpected}. Rescheduling...`
    );

    // Fetch prayer times and reschedule
    const prayerDict = await fetchPrayerTimesForBackground();
    if (!prayerDict) {
      console.error("[NotificationCheck] Failed to fetch prayer times");
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Cancel all and reschedule
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const todayISO = getLocalISODate(now);
    const sortedDates = Object.keys(prayerDict)
      .filter((date) => date >= todayISO)
      .sort();
    const datesToSchedule = sortedDates.slice(0, 10);

    let scheduledCount = 0;
    for (const isoDate of datesToSchedule) {
      const dayPrayers = prayerDict[isoDate];
      if (!dayPrayers) continue;

      for (const prayer of Prayers) {
        if (!notificationsEnabled[prayer]) continue;

        const timeString = dayPrayers.timings[prayer];
        if (!timeString) continue;

        const prayerTime = parsePrayerTime(isoDate, timeString);
        const useAdhan = effectiveAdhanEnabled[prayer] ?? false;
        const id = await schedulePrayerNotification(
          prayer,
          prayerTime,
          isoDate,
          timeString,
          useAdhan,
          timeFormat
        );
        if (id) scheduledCount++;
      }
    }

    console.log(
      `[NotificationCheck] Rescheduled ${scheduledCount} notifications`
    );
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[NotificationCheck] Failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Read the user's 12h/24h preference from the persisted prayer settings
async function getStoredTimeFormat(): Promise<TimeFormat> {
  try {
    const settingsStr = await AsyncStorage.getItem("prayerSettings");
    if (!settingsStr) return DEFAULT_PRAYER_SETTINGS.timeFormat;
    const parsed = JSON.parse(settingsStr);
    return parsed?.timeFormat ?? DEFAULT_PRAYER_SETTINGS.timeFormat;
  } catch (error) {
    console.warn("[NotificationCheck] Failed to read time format:", error);
    return DEFAULT_PRAYER_SETTINGS.timeFormat;
  }
}

// Fetch prayer times from API using cached location and settings
async function fetchPrayerTimesForBackground(): Promise<PrayerDict | null> {
  const locationStr = await AsyncStorage.getItem("cachedLocation");
  if (!locationStr) {
    console.log("[NotificationCheck] No cached location found");
    return null;
  }

  const location = JSON.parse(locationStr);

  const settingsStr = await AsyncStorage.getItem("prayerSettings");
  const settings = settingsStr
    ? { ...DEFAULT_PRAYER_SETTINGS, ...JSON.parse(settingsStr) }
    : DEFAULT_PRAYER_SETTINGS;

  const params: PrayerTimesParams = {
    latitude: location.latitude,
    longitude: location.longitude,
    method: settings.method,
    school: settings.school,
    latitudeAdjustmentMethod: settings.latitudeAdjustmentMethod,
  };

  if (settings.tune) {
    params.tune = tuneSettingsToString(settings.tune);
  }

  const baseUrl = "https://api.aladhan.com/v1";
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let prayerDict = await getPrayerDict(baseUrl, currentYear, currentMonth, params);

  // Fetch next month if near end of current month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  if (now.getDate() > daysInMonth - 10) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    try {
      const nextMonthDict = await getPrayerDict(baseUrl, nextYear, nextMonth, params);
      prayerDict = { ...prayerDict, ...nextMonthDict };
    } catch (error) {
      console.warn("[NotificationCheck] Failed to fetch next month:", error);
    }
  }

  return prayerDict;
}

export async function registerNotificationCheckTask(): Promise<void> {
  if (Platform.OS !== "ios") {
    console.log("[NotificationCheck] Only supported on iOS");
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      console.log("[NotificationCheck] Task already registered");
      return;
    }

    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60 * 4, // 4 hours minimum
    });
    console.log("[NotificationCheck] Registered successfully");
  } catch (error) {
    console.error("[NotificationCheck] Failed to register:", error);
  }
}

export async function unregisterNotificationCheckTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
      console.log("[NotificationCheck] Unregistered successfully");
    }
  } catch (error) {
    console.error("[NotificationCheck] Failed to unregister:", error);
  }
}
