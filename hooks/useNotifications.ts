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
    adhanMasterToggle,
    adhanEnabled,
    toggleNotification,
    toggleAdhanMaster,
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
      // Only pass adhanEnabled if adhanMasterToggle is on
      const effectiveAdhanEnabled = adhanMasterToggle ? adhanEnabled : {};
      scheduleAllPrayerNotifications(prayerDict, notificationsEnabled, effectiveAdhanEnabled);
    } else if (!masterToggle) {
      // Cancel all if master toggle is off
      cancelAllPrayerNotifications();
    }
  }, [prayerDict, notificationsEnabled, adhanMasterToggle, adhanEnabled, masterToggle, loading]);

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
  };
};
