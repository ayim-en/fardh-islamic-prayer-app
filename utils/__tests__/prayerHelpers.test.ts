import {
  formatHijriDateShort,
  formatTimeWithPreference,
  getCurrentPrayerFromDay,
} from "@/utils/prayerHelpers";

// A single ordinary day, reused across the current-prayer cases.
const DAY = {
  fajr: "05:12",
  sunrise: "06:40",
  dhuhr: "12:15",
  asr: "15:30",
  maghrib: "18:05",
  isha: "19:35",
};

// Builds a Date for a clock time on the same arbitrary day as DAY.
const at = (hours: number, minutes: number) =>
  new Date(2026, 2, 14, hours, minutes, 0);

describe("formatTimeWithPreference", () => {
  it("renders an afternoon time in 12-hour form", () => {
    expect(formatTimeWithPreference("18:05", "12h")).toBe("6:05 PM");
  });

  it("leaves a 24-hour time alone in 24-hour form", () => {
    expect(formatTimeWithPreference("18:05", "24h")).toBe("18:05");
  });

  it("renders midnight as 12 AM rather than 0 AM", () => {
    expect(formatTimeWithPreference("00:30", "12h")).toBe("12:30 AM");
  });

  it("renders noon as 12 PM rather than 0 PM", () => {
    expect(formatTimeWithPreference("12:00", "12h")).toBe("12:00 PM");
  });

  it("strips the timezone suffix the API appends", () => {
    expect(formatTimeWithPreference("05:12 (GMT)", "24h")).toBe("05:12");
    expect(formatTimeWithPreference("05:12 (GMT)", "12h")).toBe("5:12 AM");
  });
});

describe("getCurrentPrayerFromDay", () => {
  it("returns the prayer that started most recently", () => {
    expect(getCurrentPrayerFromDay(DAY, at(13, 0))).toBe("Dhuhr");
  });

  it("counts a prayer as current from the moment it starts", () => {
    expect(getCurrentPrayerFromDay(DAY, at(5, 12))).toBe("Fajr");
  });

  it("returns null before the day's first prayer", () => {
    expect(getCurrentPrayerFromDay(DAY, at(4, 0))).toBeNull();
  });

  it("stays on Isha for the rest of the night", () => {
    expect(getCurrentPrayerFromDay(DAY, at(23, 59))).toBe("Isha");
  });

  it("handles times carrying the API's timezone suffix", () => {
    const suffixed = Object.fromEntries(
      Object.entries(DAY).map(([prayer, time]) => [prayer, `${time} (GMT)`])
    ) as typeof DAY;
    expect(getCurrentPrayerFromDay(suffixed, at(18, 30))).toBe("Maghrib");
  });
});

describe("formatHijriDateShort", () => {
  it("renders the day and month name", () => {
    expect(formatHijriDateShort("09-07-1447")).toBe("9 Rajab");
  });

  it("prefixes the Hijri weekday when given the ISO date", () => {
    // 2026-08-27 is a Thursday.
    expect(formatHijriDateShort("09-07-1447", "2026-08-27")).toBe(
      "Al-Khamis, 9 Rajab"
    );
  });

  it("falls back to Unknown for an out-of-range month", () => {
    expect(formatHijriDateShort("09-13-1447")).toBe("9 Unknown");
  });

  // Both systems are formatted on every render now, so a missing Hijri date
  // would otherwise throw for Gregorian users who never see the value.
  it("returns empty rather than throwing when the date is missing", () => {
    expect(formatHijriDateShort("")).toBe("");
    expect(
      formatHijriDateShort(undefined as unknown as string, "2026-08-27")
    ).toBe("");
  });
});
