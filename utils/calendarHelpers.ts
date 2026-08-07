import { FUTURE_MONTHS, PAST_MONTHS } from "@/constants/calendar";
import { INCLUDED_IMPORTANT_DATES, MANUAL_KEY_DATES } from "@/constants/importantDates";
import { CalendarDay } from "@/prayer-api/islamicCalendarAPI";

// Convert DD-MM-YYYY format to YYYY-MM-DD format
export const convertDDMMYYYYToISO = (ddmmyyyyDate: string): string => {
  const [day, month, year] = ddmmyyyyDate.split('-');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Get ISO date (YYYY-MM-DD) for a given Date in local time
export const getLocalISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Get the current local date as ISO string (YYYY-MM-DD)
export const getTodayISO = (): string => {
  return getLocalISODate(new Date());
};

// Generate array of months to fetch (12 months before and 12 months after current month)
export const getMonthsForCurrentYear = (): { month: number; year: number }[] => {
  const today = new Date();
  const monthsToFetch = [];

  for (let i = -PAST_MONTHS; i <= FUTURE_MONTHS; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    monthsToFetch.push({
      month: date.getMonth() + 1,
      year: date.getFullYear()
    });
  }

  return monthsToFetch;
};

// Check if a calendar day has any included important dates
export const hasIncludedImportantDate = (day: CalendarDay): boolean => {
  const allImportantDates = [...day.hijri.holidays, ...day.hijri.adjustedHolidays];
  if (allImportantDates.some((importantDate) => INCLUDED_IMPORTANT_DATES.includes(importantDate))) {
    return true;
  }

  // Manually mark historical events as key dates (not provided by API)
  const [dayNumStr, monthStr] = day.hijri.date.split("-");
  const dayNum = parseInt(dayNumStr, 10);
  return MANUAL_KEY_DATES.some(
    (d) => d.month === monthStr && d.day === dayNum
  );
};

// Filter included important dates from a calendar day
export const getIncludedImportantDatesFromDay = (day: CalendarDay): string[] => {
  const allImportantDates = [...day.hijri.holidays, ...day.hijri.adjustedHolidays];
  const included = allImportantDates.filter((d) => INCLUDED_IMPORTANT_DATES.includes(d));

  // Add manual historical event entries
  const [dayNumStr, monthStr] = day.hijri.date.split("-");
  const dayNum = parseInt(dayNumStr, 10);
  const manualMatch = MANUAL_KEY_DATES.find(
    (d) => d.month === monthStr && d.day === dayNum
  );
  if (manualMatch) {
    included.push(manualMatch.label);
  }

  return included;
};

// Find the next upcoming important date from a list of calendar days
export const findNextUpcomingImportantDate = (days: CalendarDay[]): CalendarDay | null => {
  const todayISO = getTodayISO();

  const upcomingImportantDates = days.filter(day => {
    const dayDate = convertDDMMYYYYToISO(day.gregorian.date);
    if (dayDate < todayISO) return false;
    return hasIncludedImportantDate(day);
  });

  return upcomingImportantDates.length > 0 ? upcomingImportantDates[0] : null;
};

// A single day row in the vertical calendar list
export interface CalendarListDay {
  dateString: string; // "YYYY-MM-DD"
  dayOfMonth: number;
  dayOfWeek: string; // e.g. "Sat"
}

// A month group with a sticky header title
export interface CalendarListSection {
  title: string; // e.g. "July 2026"
  data: CalendarListDay[];
}

// Generate month sections (12 months before and 12 months after current month)
// with one entry per day. Used for the vertical calendar list.
export const generateCalendarSections = (): CalendarListSection[] => {
  const sections: CalendarListSection[] = [];
  const today = new Date();

  for (let i = -PAST_MONTHS; i <= FUTURE_MONTHS; i++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    ).getDate();

    const data: CalendarListDay[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      data.push({
        dateString: getLocalISODate(date),
        dayOfMonth: day,
        dayOfWeek: date.toLocaleDateString(undefined, { weekday: "short" }),
      });
    }

    sections.push({
      title: monthStart.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      data,
    });
  }

  return sections;
};

// Locate a specific date's row within the generated sections
export const findDateLocation = (
  sections: CalendarListSection[],
  dateString: string
): { sectionIndex: number; itemIndex: number } | null => {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const itemIndex = sections[sectionIndex].data.findIndex(
      (day) => day.dateString === dateString
    );
    if (itemIndex !== -1) {
      return { sectionIndex, itemIndex };
    }
  }

  return null;
};

// Locate today's row within the generated sections
export const findTodayLocation = (
  sections: CalendarListSection[]
): { sectionIndex: number; itemIndex: number } => {
  return findDateLocation(sections, getTodayISO()) ?? { sectionIndex: 0, itemIndex: 0 };
};
