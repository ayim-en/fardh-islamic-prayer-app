import {
  DEFAULT_PRAYER_SETTINGS,
  DEFAULT_TUNE_SETTINGS,
  PrayerSettings,
  TunablePrayer,
} from "@/constants/prayerSettings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "prayerSettings";

interface PrayerSettingsContextType {
  settings: PrayerSettings;
  updateSettings: (newSettings: Partial<PrayerSettings>) => Promise<void>;
  updateTune: (prayer: TunablePrayer, minutes: number) => Promise<void>;
  updateAllTune: (tune: Record<TunablePrayer, number>) => Promise<void>;
  loading: boolean;
}

const PrayerSettingsContext = createContext<
  PrayerSettingsContextType | undefined
>(undefined);

export const PrayerSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [settings, setSettings] = useState<PrayerSettings>(
    DEFAULT_PRAYER_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge settings properly (handle existing users without tune or timeFormat)
          setSettings({
            ...DEFAULT_PRAYER_SETTINGS,
            ...parsed,
            tune: { ...DEFAULT_TUNE_SETTINGS, ...parsed.tune },
            // Ensure timeFormat has a valid value for existing users
            timeFormat: parsed.timeFormat || DEFAULT_PRAYER_SETTINGS.timeFormat,
          });
        }
      } catch (error) {
        console.error("Error loading prayer settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings and persist to AsyncStorage
  const updateSettings = async (newSettings: Partial<PrayerSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving prayer settings:", error);
    }
  };

  // Update a single tune value
  const updateTune = async (prayer: TunablePrayer, minutes: number) => {
    try {
      const updatedTune = { ...settings.tune, [prayer]: minutes };
      const updated = { ...settings, tune: updatedTune };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving tune settings:", error);
    }
  };

  // Update all tune values at once (for batch saves)
  const updateAllTune = async (tune: Record<TunablePrayer, number>) => {
    try {
      const updated = { ...settings, tune };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving tune settings:", error);
    }
  };

  return (
    <PrayerSettingsContext.Provider
      value={{ settings, updateSettings, updateTune, updateAllTune, loading }}
    >
      {children}
    </PrayerSettingsContext.Provider>
  );
};

export const usePrayerSettings = () => {
  const context = useContext(PrayerSettingsContext);
  if (!context) {
    throw new Error(
      "usePrayerSettings must be used within PrayerSettingsProvider"
    );
  }
  return context;
};
