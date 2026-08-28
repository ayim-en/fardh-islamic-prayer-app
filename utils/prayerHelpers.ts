import { Prayers } from "@/constants/prayers";
import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import {
  getLocalISODate,
  getNextISODate,
  isISODate,
} from "@/utils/calendarHelpers";

// Hijri month names
const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qa'dah",
  "Dhul Hijjah",
];

// Hijri weekday names (Sunday = 0)
const HIJRI_WEEKDAYS = [
  "Al-Ahad",
  "Al-Ithnayn",
  "Ath-Thulatha",
  "Al-Arba'a",
  "Al-Khamis",
  "Al-Jumu'ah",
  "As-Sabt",
];

// Formats Hijri DD-MM-YYYY date string to "Al-Ithnayn, 9 Rajab" format
// Optionally accepts ISO date to include weekday
export const formatHijriDateShort = (hijriDate: string, isoDate?: string): string => {
  // Both date systems are now formatted on every render regardless of which
  // one leads, so a day whose cached record is missing its Hijri date must not
  // take the prayer screen down with it — including for Gregorian users, who
  // never see this value.
  if (!hijriDate) return "";

  const [dayStr, monthStr] = hijriDate.split("-");
  const day = Number(dayStr);
  const monthIndex = Number(monthStr) - 1;
  const monthName = HIJRI_MONTHS[monthIndex] || "Unknown";

  if (isoDate) {
    const [year, month, dayOfMonth] = isoDate.split("-").map(Number);
    const date = new Date(year, month - 1, dayOfMonth);
    const weekday = HIJRI_WEEKDAYS[date.getDay()];
    return `${weekday}, ${day} ${monthName}`;
  }

  return `${day} ${monthName}`;
};

// Formats DD-MM-YYYY date string for display (local time)
export const formatHijriDate = (ddmmyyyyDate: string): string => {
  const [dayStr, monthStr, yearStr] = ddmmyyyyDate.split("-");
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const date = new Date(year, month - 1, day);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

// Formats ISO date string (YYYY-MM-DD) for display (local time)
export const formatDate = (isoDate: string): string => {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(year, month - 1, day);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

// Removes timezone suffix from time string
export const cleanTimeString = (timeString: string): string => {
  return timeString.split(" ")[0]; // e.g., "05:30 (GMT)" -> "05:30"
};

// Converts 24-hour time string to 12-hour format with AM/PM
export const formatTime12Hour = (timeString: string): string => {
  const cleanTime = cleanTimeString(timeString);
  const [hoursStr, minutesStr] = cleanTime.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${hours}:${minutes} ${ampm}`;
};

// Formats time string based on user's time format preference
export const formatTimeWithPreference = (
  timeString: string,
  timeFormat: "12h" | "24h"
): string => {
  if (timeFormat === "12h") {
    return formatTime12Hour(timeString);
  }
  return cleanTimeString(timeString);
};

// Parses prayer time string to Date object for a given ISO date
export const parsePrayerTime = (isoDate: string, timeString: string): Date => {
  const cleanTime = cleanTimeString(timeString);
  const [hours, minutes] = cleanTime.split(":").map(Number);
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
};

// The last third of the night, as the moment it opens and the moment it closes.
// The closing moment is Fajr; it travels with the start so callers can tell
// whether the current time falls inside the window without redoing the
// arithmetic that produced it.
export type LastThirdWindow = { start: Date; end: Date };

const MINUTE_MS = 60 * 1000;

// Parses a prayer time onto an ISO date, returning null rather than an invalid
// or silently rolled-over Date when the date or the time is unusable. Guards
// the input, then leaves the parsing itself to parsePrayerTime.
const parseTimeOnDate = (isoDate: string, timeString: string): Date | null => {
  if (!isISODate(isoDate)) return null;

  const [hours, minutes] = cleanTimeString(timeString ?? "")
    .split(":")
    .map(Number);
  // An out-of-range clock time would roll into a neighbouring day rather than
  // fail, which would put the window on the wrong night.
  const inRange = (value: number, max: number) =>
    Number.isInteger(value) && value >= 0 && value <= max;
  if (!inRange(hours, 23) || !inRange(minutes, 59)) return null;

  return parsePrayerTime(isoDate, timeString);
};

// The last third of the night for the night beginning on `isoDate`: the final
// third of the interval from that day's Maghrib to the following day's Fajr.
// The night is divided from Maghrib, not from Isha.
//
// Fajr falls on the day after Maghrib, so the two times never share a date and
// the caller passes only the Maghrib date. The start is floored to the whole
// minute it is displayed as, so the moment the label reads is the moment the
// window opens. Returns null when either time is missing or unusable, or when
// the night has no length.
export const getLastThirdOfNight = (
  isoDate: string,
  maghribTime: string,
  nextFajrTime: string | undefined
): LastThirdWindow | null => {
  const maghrib = parseTimeOnDate(isoDate, maghribTime);
  const fajr = parseTimeOnDate(getNextISODate(isoDate), nextFajrTime ?? "");
  if (!maghrib || !fajr) return null;

  const nightMs = fajr.getTime() - maghrib.getTime();
  if (nightMs <= 0) return null;

  const startMs = maghrib.getTime() + (nightMs * 2) / 3;
  return {
    start: new Date(Math.floor(startMs / MINUTE_MS) * MINUTE_MS),
    end: fajr,
  };
};

// Whether the given moment falls inside the last third. The window is open
// from its start up to but not including Fajr.
export const isWithinLastThird = (
  window: LastThirdWindow | null,
  now: Date
): boolean =>
  window !== null && now >= window.start && now < window.end;

// Renders a Date as a 24-hour "HH:MM" clock time, the shape the time-format
// preference formatter consumes.
export const formatClockTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Converts prayer time to minutes for comparison
export const prayerTimeToMinutes = (prayerTime: string): number => {
  const cleanedPrayerTime = prayerTime.split(" ")[0];
  const [hours, minutes] = cleanedPrayerTime.split(":").map(Number);
  return hours * 60 + minutes;
};

// Determines the current prayer from a single day's times
// Returns the prayer that has started most recently based on current time
export const getCurrentPrayerFromDay = (
  dayTimes: { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string },
  now: Date
): string | null => {
  const prayers = [
    { name: "Fajr", time: dayTimes.fajr },
    { name: "Sunrise", time: dayTimes.sunrise },
    { name: "Dhuhr", time: dayTimes.dhuhr },
    { name: "Asr", time: dayTimes.asr },
    { name: "Maghrib", time: dayTimes.maghrib },
    { name: "Isha", time: dayTimes.isha },
  ];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let currentPrayer: string | null = null;

  for (const prayer of prayers) {
    const prayerMinutes = prayerTimeToMinutes(prayer.time);
    if (currentMinutes >= prayerMinutes) {
      currentPrayer = prayer.name;
    } else {
      break;
    }
  }
  return currentPrayer;
};

// Determines the current prayer based on current time
// Returns the prayer that has started most recently (its time has passed)
export const getCurrentPrayer = (
  prayerDict: PrayerDict
): { prayer: string; time: string } | null => {
  const now = new Date();
  const todayISO = getLocalISODate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayPrayers = prayerDict[todayISO];
  if (!todayPrayers) return null;

  // Find the most recent prayer that has started (iterate in reverse)
  for (let i = Prayers.length - 1; i >= 0; i--) {
    const prayer = Prayers[i];
    const prayerTime = todayPrayers.timings[prayer];
    const prayerMinutes = prayerTimeToMinutes(prayerTime);

    if (prayerMinutes <= currentMinutes) {
      return { prayer, time: cleanTimeString(prayerTime) };
    }
  }

  // If no prayer has started yet today (before Fajr), return Isha from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayISO = getLocalISODate(yesterday);
  const yesterdayPrayers = prayerDict[yesterdayISO];

  if (yesterdayPrayers) {
    return {
      prayer: "Isha",
      time: cleanTimeString(yesterdayPrayers.timings.Isha),
    };
  }

  // Fallback to Isha from today if yesterday not available
  return {
    prayer: "Isha",
    time: cleanTimeString(todayPrayers.timings.Isha),
  };
};

// Convert degrees to cardinal direction (N, NE, E, SE, S, SW, W, NW)
export const getCardinalDirection = (degrees: number): string => {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  const directions = [
    { name: "N", min: 337.5, max: 360 },
    { name: "N", min: 0, max: 22.5 },
    { name: "NE", min: 22.5, max: 67.5 },
    { name: "E", min: 67.5, max: 112.5 },
    { name: "SE", min: 112.5, max: 157.5 },
    { name: "S", min: 157.5, max: 202.5 },
    { name: "SW", min: 202.5, max: 247.5 },
    { name: "W", min: 247.5, max: 292.5 },
    { name: "NW", min: 292.5, max: 337.5 },
  ];

  for (const dir of directions) {
    if (normalizedDegrees >= dir.min && normalizedDegrees < dir.max) {
      return dir.name;
    }
  }

  return "N";
};
