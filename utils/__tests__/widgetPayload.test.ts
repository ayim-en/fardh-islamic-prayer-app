import { PrayerDict, PrayerDay, Timings } from "@/prayer-api/prayerTimesAPI";
import {
  WIDGET_WINDOW_DAYS,
  buildLastThirdNights,
  buildWidgetDays,
  isWidgetPayloadExpired,
  monthsSpanning,
  widgetExpiryDate,
} from "@/utils/widgetPayload";
import { LastThirdNight } from "@/utils/widgetStorage";

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
  // The run is thirty days plus one either side, so it never fits in a month:
  // two is the floor.
  it("is this month and the next when the run stays inside them", () => {
    expect(monthsSpanning(on("2026-03-15"))).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
    ]);
  });

  it("reaches the month holding the Fajr that ends the last night", () => {
    // The window's last day is 31 March; its night ends at 1 April's Fajr.
    expect(monthsSpanning(on("2026-03-02"))).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
    ]);
  });

  it("reaches back a month on the first, for the night already in progress", () => {
    expect(monthsSpanning(on("2026-03-01"))).toEqual([
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
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

// A dict with Maghrib and Fajr given per day — the two times a night is
// divided by. Everything else is filler the last third never reads.
const nightDictOf = (
  nights: { date: string; maghrib?: string; fajr?: string }[]
): PrayerDict =>
  nights.reduce<PrayerDict>((acc, { date, maghrib, fajr }) => {
    acc[date] = {
      timings: {
        ...timings(fajr ?? fajrOn(date)),
        Maghrib: maghrib ?? "18:05",
      },
    } as PrayerDay;
    return acc;
  }, {});

// The instant a local clock time falls on, written the way the payload carries
// it: UTC, to the second.
const instantAt = (isoDate: string, hours: number, minutes: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
    .toISOString()
    .replace(/\.000Z$/, "Z");
};

const nightOn = (nights: LastThirdNight[], isoDate: string) =>
  nights.find((night) => night.date === isoDate);

describe("buildLastThirdNights", () => {
  it("opens two thirds of the way from Maghrib to the following Fajr", () => {
    // 18:05 -> 05:12 is 11h07; two thirds of that is 7h24.
    const dict = nightDictOf([
      { date: "2026-03-14", maghrib: "18:05" },
      { date: "2026-03-15", fajr: "05:12" },
    ]);
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-03-14")));

    expect(nightOn(nights, "2026-03-14")).toEqual({
      date: "2026-03-14",
      start: instantAt("2026-03-15", 1, 29),
      end: instantAt("2026-03-15", 5, 12),
    });
  });

  it("dates a night by the evening it opened, though its clock time is the next day", () => {
    const dict = nightDictOf([
      { date: "2026-03-14", maghrib: "18:05" },
      { date: "2026-03-15", fajr: "05:12" },
    ]);
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-03-14")));

    expect(nightOn(nights, "2026-03-14")?.start).toBe(instantAt("2026-03-15", 1, 29));
  });

  it("carries absolute instants rather than clock times", () => {
    const dict = nightDictOf([
      { date: "2026-03-14", maghrib: "18:05" },
      { date: "2026-03-15", fajr: "05:12" },
    ]);
    const [night] = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-03-14")));

    expect(night.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(night.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("handles a short summer night", () => {
    // 21:45 -> 02:15 is 4h30; two thirds is 3h00.
    const dict = nightDictOf([
      { date: "2026-06-21", maghrib: "21:45" },
      { date: "2026-06-22", fajr: "02:15" },
    ]);
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-06-21")));

    expect(nightOn(nights, "2026-06-21")?.start).toBe(instantAt("2026-06-22", 0, 45));
  });

  it("handles a long winter night", () => {
    // 16:10 -> 06:40 is 14h30; two thirds is 9h40.
    const dict = nightDictOf([
      { date: "2026-12-21", maghrib: "16:10" },
      { date: "2026-12-22", fajr: "06:40" },
    ]);
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-12-21")));

    expect(nightOn(nights, "2026-12-21")?.start).toBe(instantAt("2026-12-22", 1, 50));
  });

  it("ends every night exactly on the Fajr the payload carries for the next day", () => {
    const dict = dictOf(runOf("2026-03-01", 40));
    const days = buildWidgetDays(dict, on("2026-03-01"));
    const nights = buildLastThirdNights(dict, days);

    days.forEach((day, index) => {
      const nextDay = days[index + 1];
      if (!nextDay) return;
      const [hours, minutes] = nextDay.fajr.split(":").map(Number);
      expect(nightOn(nights, day.date)?.end).toBe(
        instantAt(nextDay.date, hours, minutes)
      );
    });
  });

  it("computes the final cached day's night from a Fajr outside the day list", () => {
    const dict = dictOf(runOf("2026-03-01", 40));
    const days = buildWidgetDays(dict, on("2026-03-01"));
    const nights = buildLastThirdNights(dict, days);

    // The window stays thirty days; the extra Fajr is consumed here and never
    // joins the day list.
    expect(days).toHaveLength(WIDGET_WINDOW_DAYS);
    expect(days[days.length - 1].date).toBe("2026-03-30");
    expect(nightOn(nights, "2026-03-30")?.end).toBe(instantAt("2026-03-31", 5, 31));
  });

  it("leaves out the final day's night when no following Fajr is known", () => {
    const dict = dictOf(runOf("2026-03-01", WIDGET_WINDOW_DAYS));
    const days = buildWidgetDays(dict, on("2026-03-01"));
    const nights = buildLastThirdNights(dict, days);

    expect(days).toHaveLength(WIDGET_WINDOW_DAYS);
    expect(nightOn(nights, "2026-03-30")).toBeUndefined();
    expect(nightOn(nights, "2026-03-29")).toBeDefined();
  });

  it("carries the night that opened the evening before the first cached day", () => {
    const dict = dictOf(runOf("2026-02-28", 5));
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-03-01")));

    // A payload written after midnight still holds the night in progress.
    expect(nightOn(nights, "2026-02-28")).toBeDefined();
    expect(nightOn(nights, "2026-02-28")?.end).toBe(instantAt("2026-03-01", 5, 1));
  });

  it("leaves out a night whose times are unusable", () => {
    const dict = nightDictOf([
      { date: "2026-03-14", maghrib: "not a time" },
      { date: "2026-03-15", maghrib: "18:06", fajr: "05:13" },
      { date: "2026-03-16", fajr: "05:14" },
    ]);
    const nights = buildLastThirdNights(dict, buildWidgetDays(dict, on("2026-03-14")));

    expect(nightOn(nights, "2026-03-14")).toBeUndefined();
    expect(nightOn(nights, "2026-03-15")).toBeDefined();
  });

  it("is empty for malformed or missing days", () => {
    const dict = dictOf(runOf("2026-03-01", 5));

    expect(buildLastThirdNights(dict, [])).toEqual([]);
    expect(
      buildLastThirdNights(dict, [{ ...buildWidgetDays(dict, on("2026-03-01"))[0], date: "01-03-2026" }])
    ).toEqual([]);
  });
});
