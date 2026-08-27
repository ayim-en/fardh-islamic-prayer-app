import {
  CalendarSettings,
  invalidatesCalendarCache,
} from "@/constants/calendarSettings";

// The two side effects saving a settings change can have. Injected so the
// sequence below can be tested without AsyncStorage or the cache module.
export type CalendarSettingsIO = {
  persist: (settings: CalendarSettings) => Promise<void>;
  clearCache: () => Promise<void>;
};

// The day adjustment only applies to the MATHEMATICAL method; under any other
// method it is stored as zero rather than lingering invisibly.
const normalise = (settings: CalendarSettings): CalendarSettings => ({
  ...settings,
  adjustment:
    settings.calendarMethod === "MATHEMATICAL" ? settings.adjustment : 0,
});

// Applies `changes` to `previous` and writes the result, returning the settings
// the caller should now adopt. Rejects without touching the cache if the write
// fails, leaving stored settings and cache agreeing with each other.
export const saveCalendarSettings = async (
  previous: CalendarSettings,
  changes: Partial<CalendarSettings>,
  io: CalendarSettingsIO
): Promise<CalendarSettings> => {
  const updated = normalise({ ...previous, ...changes });

  await io.persist(updated);

  // Cleared before returning, not after: adopting the returned settings re-runs
  // the calendar screen's fetch effect, which would otherwise read the cache
  // being dropped. Cosmetic changes leave the 25-month window intact.
  if (invalidatesCalendarCache(previous, updated)) {
    await io.clearCache();
  }

  return updated;
};
