import {
  CalendarSettings,
  DEFAULT_CALENDAR_SETTINGS,
} from "@/constants/calendarSettings";
import { saveCalendarSettings } from "@/utils/calendarSettingsHelpers";

const settings = (overrides: Partial<CalendarSettings> = {}): CalendarSettings => ({
  ...DEFAULT_CALENDAR_SETTINGS,
  ...overrides,
});

// Records the order the two side effects ran in, so the sequence itself can be
// asserted rather than only the fact that each one happened.
const spyIO = () => {
  const calls: string[] = [];
  return {
    calls,
    persist: jest.fn(async () => {
      calls.push("persist");
    }),
    clearCache: jest.fn(async () => {
      calls.push("clearCache");
    }),
  };
};

describe("saveCalendarSettings", () => {
  it("returns the previous settings with the changes applied", async () => {
    const io = spyIO();
    const saved = await saveCalendarSettings(
      settings({ calendarMethod: "HJCoSA" }),
      { primaryDateSystem: "hijri" },
      io
    );
    expect(saved).toEqual(
      settings({ calendarMethod: "HJCoSA", primaryDateSystem: "hijri" })
    );
  });

  it("persists exactly what it returns", async () => {
    const io = spyIO();
    const saved = await saveCalendarSettings(settings(), { adjustment: 0 }, io);
    expect(io.persist).toHaveBeenCalledWith(saved);
  });

  it("clears the cache when the calculation method changes", async () => {
    const io = spyIO();
    await saveCalendarSettings(settings(), { calendarMethod: "UAQ" }, io);
    expect(io.clearCache).toHaveBeenCalled();
  });

  it("leaves the cache alone when only the primary date system changes", async () => {
    const io = spyIO();
    await saveCalendarSettings(settings(), { primaryDateSystem: "hijri" }, io);
    expect(io.clearCache).not.toHaveBeenCalled();
  });

  // The hazard this seam exists to remove: the caller adopts the returned
  // settings, which re-runs the calendar screen's fetch effect. Clearing after
  // that would let the effect read the cache being dropped.
  it("clears the cache before returning, so the caller cannot race it", async () => {
    const io = spyIO();
    await saveCalendarSettings(settings(), { calendarMethod: "UAQ" }, io);
    expect(io.calls).toEqual(["persist", "clearCache"]);
  });

  it("does not clear the cache when persisting failed", async () => {
    const io = spyIO();
    io.persist.mockRejectedValueOnce(new Error("storage full"));
    await expect(
      saveCalendarSettings(settings(), { calendarMethod: "UAQ" }, io)
    ).rejects.toThrow("storage full");
    expect(io.clearCache).not.toHaveBeenCalled();
  });

  it("zeroes the day adjustment for a method that does not support it", async () => {
    const io = spyIO();
    const saved = await saveCalendarSettings(
      settings({ calendarMethod: "MATHEMATICAL", adjustment: 2 }),
      { calendarMethod: "HJCoSA" },
      io
    );
    expect(saved.adjustment).toBe(0);
    expect(io.persist).toHaveBeenCalledWith(saved);
  });

  it("keeps the day adjustment for the method that supports it", async () => {
    const io = spyIO();
    const saved = await saveCalendarSettings(
      settings({ calendarMethod: "MATHEMATICAL" }),
      { adjustment: -1 },
      io
    );
    expect(saved.adjustment).toBe(-1);
  });

  // Zeroing a stale adjustment changes what the calendar is fetched with, so it
  // invalidates the cache even though the user only touched a cosmetic field.
  it("clears the cache when zeroing the adjustment is the only real change", async () => {
    const io = spyIO();
    await saveCalendarSettings(
      settings({ calendarMethod: "HJCoSA", adjustment: 2 }),
      { primaryDateSystem: "hijri" },
      io
    );
    expect(io.clearCache).toHaveBeenCalled();
  });
});
