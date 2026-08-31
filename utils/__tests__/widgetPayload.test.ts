import { PrayerDict, PrayerDay, Timings } from "@/prayer-api/prayerTimesAPI";
import {
  WIDGET_WINDOW_DAYS,
  buildWidgetDays,
  isWidgetPayloadExpired,
  monthsSpanning,
  widgetExpiryDate,
} from "@/utils/widgetPayload";

// The widget only ever reads timings off a day, so the fixtures carry the
// timings and leave the calendar fields the API also returns unfilled.
const timings = (fajr: string): Timings => ({
  Fajr: fajr,
  Sunrise: "06:40",
  Dhuhr: "12:15",
  Asr: "15:30",
  Maghrib: "18:05",
  Isha: "19:35",
});

// Builds a dict keyed by ISO date, one entry per date given. Fajr's minutes
// are the day of the month, so a test can tell whose times it is looking at.
const fajrOn = (isoDate: string): string => `05:${isoDate.slice(-2)}`;

const dictOf = (isoDates: string[]): PrayerDict =>
  isoDates.reduce<PrayerDict>((acc, isoDate) => {
    acc[isoDate] = { timings: timings(fajrOn(isoDate)) } as PrayerDay;
    return acc;
  }, {});

// Every ISO date in [start, start + count).
const runOf = (start: string, count: number): string[] => {
  const [year, month, day] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(year, month - 1, day + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
};

const on = (isoDate: string, hours = 12) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, hours, 0, 0);
};

describe("buildWidgetDays", () => {
  it("carries thirty days when the dictionary has them", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-03-01", 40)), on("2026-03-01"));

    expect(days).toHaveLength(WIDGET_WINDOW_DAYS);
    expect(days[0].date).toBe("2026-03-01");
    expect(days[29].date).toBe("2026-03-30");
  });

  it("starts at the given day, not at the start of the dictionary", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-03-01", 40)), on("2026-03-10"));

    expect(days[0].date).toBe("2026-03-10");
    expect(days[0].fajr).toBe("05:10");
  });

  it("crosses a month boundary without a break", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-01-20", 60)), on("2026-01-20"));

    expect(days).toHaveLength(WIDGET_WINDOW_DAYS);
    expect(days.map((day) => day.date)).toContain("2026-02-01");
    expect(days[29].date).toBe("2026-02-18");
  });

  it("crosses a leap-year February", () => {
    const days = buildWidgetDays(dictOf(runOf("2028-02-20", 60)), on("2028-02-20"));

    expect(days.map((day) => day.date)).toContain("2028-02-29");
    expect(days[29].date).toBe("2028-03-20");
  });

  it("stops at the first gap rather than skipping over it", () => {
    const dict = dictOf([...runOf("2026-03-01", 5), ...runOf("2026-03-07", 10)]);

    const days = buildWidgetDays(dict, on("2026-03-01"));

    expect(days.map((day) => day.date)).toEqual(runOf("2026-03-01", 5));
  });

  it("returns nothing when the starting day itself is missing", () => {
    expect(buildWidgetDays(dictOf(runOf("2026-03-02", 30)), on("2026-03-01"))).toEqual([]);
  });

  it("stops at the end of the dictionary", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-03-01", 12)), on("2026-03-01"));

    expect(days).toHaveLength(12);
  });

  it("strips the timezone suffix the API appends to a time", () => {
    const dict: PrayerDict = {
      "2026-03-01": { timings: timings("05:12 (GMT)") } as PrayerDay,
    };

    expect(buildWidgetDays(dict, on("2026-03-01"))[0].fajr).toBe("05:12");
  });

  it("carries every prayer of the day", () => {
    const [day] = buildWidgetDays(dictOf(["2026-03-01"]), on("2026-03-01"));

    expect(day).toEqual({
      date: "2026-03-01",
      fajr: "05:01",
      sunrise: "06:40",
      dhuhr: "12:15",
      asr: "15:30",
      maghrib: "18:05",
      isha: "19:35",
    });
  });
});

describe("widgetExpiryDate", () => {
  it("expires on the day after the last day carried", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-03-01", 30)), on("2026-03-01"));

    expect(widgetExpiryDate(days)).toBe("2026-03-31");
  });

  it("rolls into the next month when the last day ends one", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-03-20", 12)), on("2026-03-20"));

    expect(days[days.length - 1].date).toBe("2026-03-31");
    expect(widgetExpiryDate(days)).toBe("2026-04-01");
  });

  it("rolls into the next year on New Year's Eve", () => {
    const days = buildWidgetDays(dictOf(runOf("2026-12-31", 1)), on("2026-12-31"));

    expect(widgetExpiryDate(days)).toBe("2027-01-01");
  });

  it("shortens with a window truncated by a gap", () => {
    const dict = dictOf([...runOf("2026-03-01", 5), ...runOf("2026-03-07", 10)]);

    expect(widgetExpiryDate(buildWidgetDays(dict, on("2026-03-01")))).toBe("2026-03-06");
  });

  it("is empty when there are no days to expire", () => {
    expect(widgetExpiryDate([])).toBe("");
  });
});

describe("isWidgetPayloadExpired", () => {
  const expiresOn = "2026-03-31";

  it("is live the day before expiry", () => {
    expect(isWidgetPayloadExpired(expiresOn, on("2026-03-30", 23))).toBe(false);
  });

  it("is live through the last moment of the last day carried", () => {
    expect(isWidgetPayloadExpired(expiresOn, new Date(2026, 2, 30, 23, 59, 59))).toBe(false);
  });

  it("is expired the moment the expiry day begins", () => {
    expect(isWidgetPayloadExpired(expiresOn, new Date(2026, 2, 31, 0, 0, 0))).toBe(true);
  });

  it("is expired well past the expiry day", () => {
    expect(isWidgetPayloadExpired(expiresOn, on("2026-04-15"))).toBe(true);
  });

  it("is expired when the payload carries no expiry", () => {
    expect(isWidgetPayloadExpired(undefined, on("2026-03-01"))).toBe(true);
    expect(isWidgetPayloadExpired(null, on("2026-03-01"))).toBe(true);
    expect(isWidgetPayloadExpired("", on("2026-03-01"))).toBe(true);
  });

  it("is expired when the expiry is not an ISO date", () => {
    expect(isWidgetPayloadExpired("31-03-2026", on("2026-03-01"))).toBe(true);
  });
});

describe("monthsSpanning", () => {
  it("is one month when the window stays inside it", () => {
    expect(monthsSpanning(on("2026-03-01"))).toEqual([{ year: 2026, month: 3 }]);
  });

  it("adds the next month when the window runs past this one", () => {
    expect(monthsSpanning(on("2026-03-15"))).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
    ]);
  });

  it("reaches a third month when a short February sits in the window", () => {
    expect(monthsSpanning(on("2026-01-31"))).toEqual([
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
    ]);
  });

  it("rolls the year over in December", () => {
    expect(monthsSpanning(on("2026-12-15"))).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});
