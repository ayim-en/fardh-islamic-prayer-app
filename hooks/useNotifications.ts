import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import {
  cancelAllPrayerNotifications,
  scheduleAllPrayerNotifications,
} from "@/utils/notificationService";
import { useEffect } from "react";

export const useNotifications = (prayerDict: PrayerDict = {}) => {
  const {
    masterToggle,
    notificationsEnabled,
    adhanEnabled,
    toggleNotification,
    toggleAdhan,
    toggleMasterNotifications,
    loading,
  } = useNotificationSettings();

  // Schedule notifications when prayer times or enabled prayers change
  useEffect(() => {
    if (loading) return;

    // Only schedule if master toggle is on and there are enabled prayers
    if (
      masterToggle &&
      Object.keys(prayerDict).length > 0 &&
      Object.values(notificationsEnabled).some((enabled) => enabled)
    ) {
      scheduleAllPrayerNotifications(prayerDict, notificationsEnabled, adhanEnabled);
    } else if (!masterToggle) {
      // Cancel all if master toggle is off
      cancelAllPrayerNotifications();
    }
  }, [prayerDict, notificationsEnabled, adhanEnabled, masterToggle, loading]);

  return {
    notificationsEnabled,
    adhanEnabled,
    toggleNotification,
    toggleAdhan,
    masterToggle,
    toggleMasterNotifications,
    loading,
  };
};
