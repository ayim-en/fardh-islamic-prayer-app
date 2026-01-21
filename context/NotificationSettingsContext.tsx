import { Prayers } from "@/constants/prayers";
import {
  cancelAllPrayerNotifications,
  requestNotificationPermissions,
} from "@/utils/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const NOTIFICATIONS_ENABLED_KEY = "prayerNotifications";
const MASTER_TOGGLE_KEY = "notificationsMasterToggle";
const ADHAN_ENABLED_KEY = "adhanEnabled";

interface NotificationSettingsContextType {
  masterToggle: boolean;
  notificationsEnabled: Record<string, boolean>;
  adhanEnabled: Record<string, boolean>;
  toggleMasterNotifications: () => Promise<void>;
  toggleNotification: (prayer: string) => Promise<void>;
  toggleAdhan: (prayer: string) => Promise<void>;
  loading: boolean;
}

const NotificationSettingsContext = createContext<
  NotificationSettingsContextType | undefined
>(undefined);

export const NotificationSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [masterToggle, setMasterToggle] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    Record<string, boolean>
  >({});
  const [adhanEnabled, setAdhanEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedNotifications, savedMasterToggle, savedAdhan] =
          await Promise.all([
            AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
            AsyncStorage.getItem(MASTER_TOGGLE_KEY),
            AsyncStorage.getItem(ADHAN_ENABLED_KEY),
          ]);
        if (savedNotifications) {
          setNotificationsEnabled(JSON.parse(savedNotifications));
        }
        if (savedMasterToggle !== null) {
          setMasterToggle(JSON.parse(savedMasterToggle));
        }
        if (savedAdhan) {
          setAdhanEnabled(JSON.parse(savedAdhan));
        }
      } catch (err: any) {
        console.error(
          "Failed to load notification settings:",
          err?.message ?? err
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Toggles master notification on/off
  const toggleMasterNotifications = async () => {
    const willBeEnabled = !masterToggle;

    // Request permission if enabling
    if (willBeEnabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log("Notification permission denied");
        return;
      }

      // If no prayers are enabled yet, enable all of them
      if (!Object.values(notificationsEnabled).some((enabled) => enabled)) {
        const allEnabled: Record<string, boolean> = {};
        Prayers.forEach((prayer) => {
          allEnabled[prayer] = true;
        });
        setNotificationsEnabled(allEnabled);
        await AsyncStorage.setItem(
          NOTIFICATIONS_ENABLED_KEY,
          JSON.stringify(allEnabled)
        );
      }
    } else {
      // Cancel all notifications when turning off
      await cancelAllPrayerNotifications();
    }

    setMasterToggle(willBeEnabled);
    try {
      await AsyncStorage.setItem(
        MASTER_TOGGLE_KEY,
        JSON.stringify(willBeEnabled)
      );
    } catch (err: any) {
      console.error("AsyncStorage save error:", err?.message ?? err);
    }
  };

  // Toggles notification for a specific prayer
  const toggleNotification = async (prayer: string) => {
    const willBeEnabled = !notificationsEnabled[prayer];

    if (willBeEnabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log("Notification permission denied");
        return;
      }
    }

    const updated = { ...notificationsEnabled, [prayer]: willBeEnabled };
    setNotificationsEnabled(updated);

    // If disabling notification, also disable adhan for this prayer
    if (!willBeEnabled && adhanEnabled[prayer]) {
      const updatedAdhan = { ...adhanEnabled, [prayer]: false };
      setAdhanEnabled(updatedAdhan);
      try {
        await AsyncStorage.setItem(
          ADHAN_ENABLED_KEY,
          JSON.stringify(updatedAdhan)
        );
      } catch (err: any) {
        console.error("AsyncStorage save error:", err?.message ?? err);
      }
    }

    try {
      await AsyncStorage.setItem(
        NOTIFICATIONS_ENABLED_KEY,
        JSON.stringify(updated)
      );
    } catch (err: any) {
      console.error("AsyncStorage save error:", err?.message ?? err);
    }
  };

  // Toggles adhan for a specific prayer
  const toggleAdhan = async (prayer: string) => {
    // No adhan for Sunrise
    if (prayer === "Sunrise") return;

    const willBeEnabled = !adhanEnabled[prayer];
    const updated = { ...adhanEnabled, [prayer]: willBeEnabled };
    setAdhanEnabled(updated);

    try {
      await AsyncStorage.setItem(ADHAN_ENABLED_KEY, JSON.stringify(updated));
    } catch (err: any) {
      console.error("AsyncStorage save error:", err?.message ?? err);
    }
  };

  return (
    <NotificationSettingsContext.Provider
      value={{
        masterToggle,
        notificationsEnabled,
        adhanEnabled,
        toggleMasterNotifications,
        toggleNotification,
        toggleAdhan,
        loading,
      }}
    >
      {children}
    </NotificationSettingsContext.Provider>
  );
};

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error(
      "useNotificationSettings must be used within NotificationSettingsProvider"
    );
  }
  return context;
};
