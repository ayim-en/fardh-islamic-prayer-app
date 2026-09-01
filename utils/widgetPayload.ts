import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import {
  getLocalISODate,
  getNextISODate,
  getPreviousISODate,
  isISODate,
} from "./calendarHelpers";
import { cleanTimeString, getLastThirdOfNight } from "./prayerHelpers";
import { DayPrayerTimes, LastThirdNight } from "./widgetStorage";

// How many days of prayer times the widget payload carries. Deliberately not
// the notification window — see ADR-0002; the two are unrelated and the iOS cap
// on pending notifications has no bearing here.
export const WIDGET_WINDOW_DAYS = 30;

/**
 * The day array the widget payload carries: a contiguous run of days starting
 * at `from`, at most `windowDays` long.
 *
 * A hole in the dictionary ends the run. Skipping over one would leave the
 * widget with a day array whose positions no longer line up with the calendar,
 * and the widget's whole job past its window is to fail visibly rather than
 * render someone else's times as today's.
 */
export const buildWidgetDays = (
  prayerDict: PrayerDict,
  from: Date
): DayPrayerTimes[] => {
  const days: DayPrayerTimes[] = [];

  for (let i = 0; i < WIDGET_WINDOW_DAYS; i++) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const isoDate = getLocalISODate(date);

    const timings = prayerDict[isoDate]?.timings;
    if (!timings) break;

    days.push({
      date: isoDate,
      fajr: cleanTimeString(timings.Fajr),
      sunrise: cleanTimeString(timings.Sunrise),
      dhuhr: cleanTimeString(timings.Dhuhr),
      asr: cleanTimeString(timings.Asr),
      maghrib: cleanTimeString(timings.Maghrib),
      isha: cleanTimeString(timings.Isha),
    });
  }

  return days;
};

// An instant in the shape the payload carries it: UTC, to the second. The
// milliseconds a Date prints are noise the widget would have to parse around.
const toInstant = (date: Date): string =>
  date.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * The last third of every night the payload can speak for: one per cached day,
 * plus the night that opened the evening before the first of them, so a
 * payload written after midnight still holds the night in progress.
 *
 * Maghrib and the following Fajr come from the day list wherever it has them,
 * so a night's end is exactly the Fajr the payload carries for the next day
 * and the two cannot disagree. The dictionary fills the two edges the day list
 * cannot reach: the evening before it starts, and the Fajr that closes its
 * final night. That last day must not join the day list — the expiry is
 * derived from it and the window is pinned at thirty days (ADR-0002) — so it
 * is consumed here and appears only as a night's end.
 *
 * A night whose times are missing or unusable is left out rather than guessed
 * at. The widget shows placeholders for a night it has no window for, which is
 * the honest answer and the one opening the app repairs.
 */
export const buildLastThirdNights = (
  prayerDict: PrayerDict,
  days: DayPrayerTimes[]
): LastThirdNight[] => {
  const lastDay = days[days.length - 1];
  if (!lastDay) return [];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const maghribOn = (isoDate: string): string =>
    byDate.get(isoDate)?.maghrib ??
    cleanTimeString(prayerDict[isoDate]?.timings.Maghrib ?? "");
  const fajrOn = (isoDate: string): string =>
    byDate.get(isoDate)?.fajr ??
    cleanTimeString(prayerDict[isoDate]?.timings.Fajr ?? "");

  const nights: LastThirdNight[] = [];

  // ISO dates order lexicographically, so the run ends where the day list does.
  let date = getPreviousISODate(days[0].date);
  while (date && date <= lastDay.date) {
    const window = getLastThirdOfNight(
      date,
      maghribOn(date),
      fajrOn(getNextISODate(date))
    );
    if (window) {
      nights.push({
        date,
        start: toInstant(window.start),
        end: toInstant(window.end),
      });
    }
    date = getNextISODate(date);
  }

  return nights;
};

/**
 * The expiry stamped into the payload: the ISO date of the first day the day
 * array does not cover. The payload is good through the end of the last day it
 * carries, and stale from this date onwards.
 *
 * Empty for an empty day array, which reads as already expired.
 */
export const widgetExpiryDate = (days: DayPrayerTimes[]): string => {
  const lastDay = days[days.length - 1];
  return lastDay ? getNextISODate(lastDay.date) : "";
};

/**
 * Whether a payload stamped with `expiresOn` is stale at `now`. The rule the
 * widget applies, kept here where it can be tested: the widget compares the
 * current date against this expiry and does no window arithmetic of its own.
 *
 * A payload with no expiry — one written before the app stamped them — is
 * stale by definition. Its age is unknowable, so it cannot be trusted.
 */
export const isWidgetPayloadExpired = (
  expiresOn: string | null | undefined,
  now: Date
): boolean => {
  if (!expiresOn || !isISODate(expiresOn)) return true;
  return getLocalISODate(now) >= expiresOn;
};

export type CalendarMonth = { year: number; month: number };

/**
 * The Gregorian months a fetcher filling the widget's window, starting at
 * `from`, must ask for — in order. The run can reach a third month, since 30
 * January runs to 2 March, so a fetcher asks rather than assuming two.
 *
 * The run reaches a day either side of the cached days. The morning after the
 * last one holds the Fajr that ends its night; the evening before the first
 * one opened the night that may still be in progress. Neither joins the day
 * list — both are consumed by buildLastThirdNights.
 */
export const monthsSpanning = (from: Date): CalendarMonth[] => {
  const months: CalendarMonth[] = [];

  const first = new Date(from);
  first.setDate(first.getDate() - 1);

  const last = new Date(from);
  last.setDate(last.getDate() + WIDGET_WINDOW_DAYS);

  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);

  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};
