import {
  CalendarSettings,
  DEFAULT_CALENDAR_SETTINGS,
  invalidatesCalendarCache,
} from "@/constants/calendarSettings";

const settings = (overrides: Partial<CalendarSettings> = {}): CalendarSettings => ({
  ...DEFAULT_CALENDAR_SETTINGS,
  ...overrides,
});

describe("invalidatesCalendarCache", () => {
  it("clears the cache when the calculation method changes", () => {
    expect(
      invalidatesCalendarCache(
        settings({ calendarMethod: "HJCoSA" }),
        settings({ calendarMethod: "UAQ" })
      )
    ).toBe(true);
  });

  it("clears the cache when the day adjustment changes", () => {
    expect(
      invalidatesCalendarCache(
        settings({ calendarMethod: "MATHEMATICAL", adjustment: 0 }),
        settings({ calendarMethod: "MATHEMATICAL", adjustment: 1 })
      )
    ).toBe(true);
  });

  it("clears the cache when the adjustment is reset back to zero", () => {
    expect(
      invalidatesCalendarCache(
        settings({ calendarMethod: "MATHEMATICAL", adjustment: -1 }),
        settings({ calendarMethod: "MATHEMATICAL", adjustment: 0 })
      )
    ).toBe(true);
  });

  // The original bug: a cosmetic preference wiped the whole 25-month window.
  it("keeps the cache when only the primary date system changes", () => {
    expect(
      invalidatesCalendarCache(
        settings({ carouselDateFormat: "gregorian" }),
        settings({ carouselDateFormat: "hijri" })
      )
    ).toBe(false);
  });

  it("keeps the cache when nothing changed", () => {
    expect(invalidatesCalendarCache(settings(), settings())).toBe(false);
  });

  it("keeps the cache when saving the same non-default settings again", () => {
    const saved = settings({ calendarMethod: "MATHEMATICAL", adjustment: 2 });
    expect(invalidatesCalendarCache(saved, saved)).toBe(false);
  });

  it("clears the cache when a cosmetic change accompanies an invalidating one", () => {
    expect(
      invalidatesCalendarCache(
        settings({ calendarMethod: "HJCoSA", carouselDateFormat: "gregorian" }),
        settings({ calendarMethod: "DIYANET", carouselDateFormat: "hijri" })
      )
    ).toBe(true);
  });

  it("clears the cache when the method and the adjustment both change", () => {
    expect(
      invalidatesCalendarCache(
        settings({ calendarMethod: "MATHEMATICAL", adjustment: 3 }),
        settings({ calendarMethod: "UAQ", adjustment: 0 })
      )
    ).toBe(true);
  });
});
