import {
  CalendarSettings,
  DEFAULT_CALENDAR_SETTINGS,
  invalidatesCalendarCache,
} from "@/constants/calendarSettings";
import { clearCalendarCache } from "@/utils/cacheHelpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "calendarSettings";

interface CalendarSettingsContextType {
  settings: CalendarSettings;
  updateSettings: (newSettings: Partial<CalendarSettings>) => Promise<void>;
  loading: boolean;
}

const CalendarSettingsContext = createContext<
  CalendarSettingsContextType | undefined
>(undefined);

export const CalendarSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [settings, setSettings] = useState<CalendarSettings>(
    DEFAULT_CALENDAR_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({
            ...DEFAULT_CALENDAR_SETTINGS,
            ...parsed,
          });
        }
      } catch (error) {
        console.error("Error loading calendar settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings and persist to AsyncStorage
  const updateSettings = async (newSettings: Partial<CalendarSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };

      // If adjustment is set but method is not MATHEMATICAL, reset adjustment
      if (
        updated.calendarMethod !== "MATHEMATICAL" &&
        updated.adjustment !== 0
      ) {
        updated.adjustment = 0;
      }

      // Decided before the write, while `settings` is still the previous value.
      // Only a change the cached data was computed from is worth a refetch;
      // cosmetic changes leave the 25-month window intact.
      // Cleared before setSettings, because that re-runs the calendar screen's
      // fetch effect and it would otherwise read the cache we are dropping.
      if (invalidatesCalendarCache(settings, updated)) {
        await clearCalendarCache();
      }

      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving calendar settings:", error);
    }
  };

  return (
    <CalendarSettingsContext.Provider
      value={{ settings, updateSettings, loading }}
    >
      {children}
    </CalendarSettingsContext.Provider>
  );
};

export const useCalendarSettings = () => {
  const context = useContext(CalendarSettingsContext);
  if (!context) {
    throw new Error(
      "useCalendarSettings must be used within CalendarSettingsProvider"
    );
  }
  return context;
};
