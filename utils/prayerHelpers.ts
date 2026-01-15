import { Prayers } from "@/constants/prayers";
import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import { getLocalISODate } from "@/utils/calendarHelpers";

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

// Converts prayer time to minutes for comparison
export const prayerTimeToMinutes = (prayerTime: string): number => {
  const cleanedPrayerTime = prayerTime.split(" ")[0];
  const [hours, minutes] = cleanedPrayerTime.split(":").map(Number);
  return hours * 60 + minutes;
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
