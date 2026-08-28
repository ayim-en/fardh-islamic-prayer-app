import {
  CalendarSettings,
  DEFAULT_CALENDAR_SETTINGS,
} from "@/constants/calendarSettings";
import { clearCalendarCache } from "@/utils/cacheHelpers";
import { saveCalendarSettings } from "@/utils/calendarSettingsHelpers";
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
          // No migration shim, by decision (#6): a blob written before
          // `carouselDateFormat` became `primaryDateSystem` simply falls back
          // to the Gregorian default, and the dead key rides along harmlessly.
          // The installed base is small enough that a reset is acceptable.
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

  // Update settings and persist to AsyncStorage. The normalisation, the
  // decision to clear the cache and the order of the two writes all live in
  // saveCalendarSettings, where they are tested; this supplies the storage.
  const updateSettings = async (newSettings: Partial<CalendarSettings>) => {
    try {
      const updated = await saveCalendarSettings(settings, newSettings, {
        persist: (next) =>
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
        clearCache: clearCalendarCache,
      });

      setSettings(updated);
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
