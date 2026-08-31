import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import { getLocalISODate, getNextISODate, isISODate } from "./calendarHelpers";
import { cleanTimeString } from "./prayerHelpers";
import { DayPrayerTimes } from "./widgetStorage";

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
 * The Gregorian months the widget's window, starting at `from`, touches — in
 * order. The window can reach a third month, since 31 January runs to 1 March,
 * so a fetcher filling it asks rather than assuming two.
 */
export const monthsSpanning = (from: Date): CalendarMonth[] => {
  const months: CalendarMonth[] = [];

  const last = new Date(from);
  last.setDate(last.getDate() + WIDGET_WINDOW_DAYS - 1);

  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);

  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};
