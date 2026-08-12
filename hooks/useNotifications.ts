import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import {
  cancelAllPrayerNotifications,
  scheduleAllPrayerNotifications,
} from "@/utils/notificationService";
import { useCallback, useEffect } from "react";
import { Alert } from "react-native";

// Notification states for cycling: off → on → adhan → off
export type NotificationState = "off" | "on" | "adhan";

export const useNotifications = (prayerDict: PrayerDict = {}) => {
  const {
    masterToggle,
    notificationsEnabled,
    adhanMasterToggle,
    adhanEnabled,
    toggleNotification,
    toggleAdhanMaster,
    toggleAdhan,
    toggleMasterNotifications,
    loading,
  } = useNotificationSettings();

  // Notification contain prayer time, so they have to be rebuilt whenever the 12h/24h preference changes.
  const { settings: prayerSettings, loading: prayerSettingsLoading } =
    usePrayerSettings();
  const { timeFormat } = prayerSettings;

  // Get the current notification state for a prayer
  // Sunrise never has adhan state
  const getNotificationState = useCallback(
    (prayer: string): NotificationState => {
      if (!masterToggle || !notificationsEnabled[prayer]) {
        return "off";
      }
      // Sunrise doesn't have adhan
      if (prayer !== "Sunrise" && adhanMasterToggle && adhanEnabled[prayer]) {
        return "adhan";
      }
      return "on";
    },
    [masterToggle, notificationsEnabled, adhanMasterToggle, adhanEnabled]
  );

  // Cycle through notification states: off → on → adhan → off
  // For Sunrise: off → on → off (no adhan)
  const cycleNotificationState = useCallback(
    async (prayer: string): Promise<NotificationState> => {
      const currentState = getNotificationState(prayer);

      if (currentState === "off") {
        // If master toggle is off, prompt user to enable it in settings
        if (!masterToggle) {
          Alert.alert(
            "Notifications Disabled",
            "Enable notifications in Settings to receive prayer time reminders.",
            [{ text: "OK" }]
          );
          return "off";
        }

        // off → on: Enable notification
        await toggleNotification(prayer);
        return "on";
      } else if (currentState === "on") {
        // For Sunrise, no adhan - go directly to off
        if (prayer === "Sunrise") {
          await toggleNotification(prayer);
          return "off";
        }
        // on → adhan: Enable adhan (also enables adhan master if needed)
        if (!adhanMasterToggle) {
          await toggleAdhanMaster();
        }
        await toggleAdhan(prayer);
        return "adhan";
      } else {
        // adhan → off: Disable notification (which also disables adhan)
        await toggleNotification(prayer);
        return "off";
      }
    },
    [
      getNotificationState,
      toggleNotification,
      toggleAdhan,
      toggleAdhanMaster,
      adhanMasterToggle,
      masterToggle,
    ]
  );

  // Reschedule when prayer times, enabled prayers, or the time format change.
  useEffect(() => {
    if (loading || prayerSettingsLoading) return;

    // Only schedule if master toggle is on and there are enabled prayers
    if (
      masterToggle &&
      Object.keys(prayerDict).length > 0 &&
      Object.values(notificationsEnabled).some((enabled) => enabled)
    ) {
      // Only pass adhanEnabled if adhanMasterToggle is on
      const effectiveAdhanEnabled = adhanMasterToggle ? adhanEnabled : {};
      scheduleAllPrayerNotifications(
        prayerDict,
        notificationsEnabled,
        effectiveAdhanEnabled,
        timeFormat
      );
    } else if (!masterToggle) {
      // Cancel all if master toggle is off
      cancelAllPrayerNotifications();
    }
  }, [
    prayerDict,
    notificationsEnabled,
    adhanMasterToggle,
    adhanEnabled,
    masterToggle,
    loading,
    timeFormat,
    prayerSettingsLoading,
  ]);

  return {
    notificationsEnabled,
    adhanMasterToggle,
    adhanEnabled,
    toggleNotification,
    toggleAdhanMaster,
    toggleAdhan,
    masterToggle,
    toggleMasterNotifications,
    loading,
    getNotificationState,
    cycleNotificationState,
  };
};
