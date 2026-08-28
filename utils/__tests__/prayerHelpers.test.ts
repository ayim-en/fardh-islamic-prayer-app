import {
  formatClockTime,
  formatHijriDateShort,
  formatTimeWithPreference,
  getCurrentPrayerFromDay,
  getLastThirdOfNight,
  isWithinLastThird,
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

describe("getLastThirdOfNight", () => {
  it("opens two thirds of the way from Maghrib to the following Fajr", () => {
    // 18:05 -> 05:12 is 11h07; two thirds of that is 7h24.
    const night = getLastThirdOfNight("2026-03-14", "18:05", "05:12");
    expect(night?.start).toEqual(new Date(2026, 2, 15, 1, 29, 0));
    expect(night?.end).toEqual(new Date(2026, 2, 15, 5, 12, 0));
  });

  it("divides the night from Maghrib, not from Isha", () => {
    // Isha at 19:35 would put the last third at 22:59; from Maghrib it is 01:29.
    const night = getLastThirdOfNight("2026-03-14", "18:05", "05:12");
    expect(night?.start.getHours()).toBe(1);
  });

  it("handles a short summer night", () => {
    // 21:45 -> 02:15 is 4h30; two thirds is 3h00.
    const night = getLastThirdOfNight("2026-06-21", "21:45", "02:15");
    expect(night?.start).toEqual(new Date(2026, 5, 22, 0, 45, 0));
  });

  it("handles a long winter night", () => {
    // 16:10 -> 06:40 is 14h30; two thirds is 9h40.
    const night = getLastThirdOfNight("2026-12-21", "16:10", "06:40");
    expect(night?.start).toEqual(new Date(2026, 11, 22, 1, 50, 0));
  });

  it("puts Fajr on the following calendar day across a month boundary", () => {
    const night = getLastThirdOfNight("2026-01-31", "17:00", "06:00");
    expect(night?.start).toEqual(new Date(2026, 1, 1, 1, 40, 0));
    expect(night?.end).toEqual(new Date(2026, 1, 1, 6, 0, 0));
  });

  it("puts Fajr on the following calendar day across a year boundary", () => {
    const night = getLastThirdOfNight("2026-12-31", "16:15", "06:45");
    expect(night?.start).toEqual(new Date(2027, 0, 1, 1, 55, 0));
  });

  it("floors the start to the whole minute it is displayed as", () => {
    // 18:00 -> 05:01 is 661 minutes; two thirds is 440m40s, shown as 01:20.
    const night = getLastThirdOfNight("2026-03-14", "18:00", "05:01");
    expect(night?.start).toEqual(new Date(2026, 2, 15, 1, 20, 0));
  });

  it("strips the timezone suffix the API appends", () => {
    const night = getLastThirdOfNight("2026-03-14", "18:05 (GMT)", "05:12 (GMT)");
    expect(night?.start).toEqual(new Date(2026, 2, 15, 1, 29, 0));
  });

  it("returns null when the following day's Fajr is unavailable", () => {
    expect(getLastThirdOfNight("2026-03-14", "18:05", undefined)).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "18:05", "")).toBeNull();
  });

  // An out-of-range time would otherwise roll into a neighbouring day and put
  // the whole window on the wrong night.
  it("returns null for an out-of-range clock time", () => {
    expect(getLastThirdOfNight("2026-03-14", "25:99", "05:12")).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "18:05", "24:00")).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "-1:30", "05:12")).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "18:5.5", "05:12")).toBeNull();
  });

  it("returns null for malformed input rather than an invalid date", () => {
    expect(getLastThirdOfNight("2026-03-14", "", "05:12")).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "not a time", "05:12")).toBeNull();
    expect(getLastThirdOfNight("2026-03-14", "18:05", "half five")).toBeNull();
    expect(getLastThirdOfNight("", "18:05", "05:12")).toBeNull();
    expect(
      getLastThirdOfNight("2026-03-14", undefined as unknown as string, "05:12")
    ).toBeNull();
  });

  // Regression guard for parsing Fajr onto Maghrib's own date: that would make
  // identical clock times a night of zero length instead of a full day.
  it("treats identical clock times as a night spanning the date boundary", () => {
    const night = getLastThirdOfNight("2026-03-14", "18:05", "18:05");
    expect(night?.start).toEqual(new Date(2026, 2, 15, 10, 5, 0));
    expect(night?.end).toEqual(new Date(2026, 2, 15, 18, 5, 0));
  });
});

describe("isWithinLastThird", () => {
  const night = getLastThirdOfNight("2026-03-14", "18:05", "05:12");

  it("is false before the window opens", () => {
    expect(isWithinLastThird(night, new Date(2026, 2, 15, 1, 28, 59))).toBe(false);
  });

  it("is true from the moment the window opens", () => {
    expect(isWithinLastThird(night, new Date(2026, 2, 15, 1, 29, 0))).toBe(true);
  });

  it("is true inside the window", () => {
    expect(isWithinLastThird(night, new Date(2026, 2, 15, 3, 0, 0))).toBe(true);
  });

  it("is false once Fajr has arrived", () => {
    expect(isWithinLastThird(night, new Date(2026, 2, 15, 5, 12, 0))).toBe(false);
    expect(isWithinLastThird(night, new Date(2026, 2, 15, 9, 0, 0))).toBe(false);
  });

  it("is false during the evening the night begins", () => {
    expect(isWithinLastThird(night, new Date(2026, 2, 14, 20, 0, 0))).toBe(false);
  });

  it("is false when there is no window", () => {
    expect(isWithinLastThird(null, new Date(2026, 2, 15, 3, 0, 0))).toBe(false);
  });
});

describe("formatClockTime", () => {
  it("renders a 24-hour clock time with both parts padded", () => {
    expect(formatClockTime(new Date(2026, 2, 15, 1, 29, 0))).toBe("01:29");
  });

  it("renders midnight as 00:00", () => {
    expect(formatClockTime(new Date(2026, 2, 15, 0, 0, 0))).toBe("00:00");
  });

  // The output feeds the existing formatter, so the two must agree on shape.
  it("produces a string the time-format preference can render", () => {
    const clock = formatClockTime(new Date(2026, 2, 15, 13, 5, 0));
    expect(formatTimeWithPreference(clock, "12h")).toBe("1:05 PM");
  });
});
