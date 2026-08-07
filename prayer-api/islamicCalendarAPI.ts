import { INCLUDED_IMPORTANT_DATES } from "@/constants/importantDates";
import { cacheCalendar, getCachedCalendar } from "@/utils/cacheHelpers";
import {
    findNextUpcomingImportantDate,
    getIncludedImportantDatesFromDay,
    getMonthsForCurrentYear,
} from "@/utils/calendarHelpers";

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

// Calendar type definitions
export interface ImportantDateData {
    year: number;
    importantDates: string[];
}

export interface ImportantDateResponse {
    code: number;
    status: string;
    data: ImportantDateData;
}

export interface CalendarDay {
    hijri: {
        date: string;
        holidays: string[];
        adjustedHolidays: string[];
    };
    gregorian: {
        date: string;
        day: string;
        month: {
            number: number;
            en: string;
        };
        year: string;
    };
}

export interface CalendarResponse {
    code: number;
    status: string;
    data: CalendarDay[];
}

export interface NextHijriImportantDateResponse {
    code: number;
    status: string;
    data: {
        gregorian: {
            date: string;
            holidays?: string[];
            adjustedHolidays?: string[];
        };
        hijri?: {
            holidays?: string[];
            adjustedHolidays?: string[];
        };
    };
}

export type NextHijriImportantDateData = NextHijriImportantDateResponse["data"];

export type CalendarMethod = "HJCoSA" | "UAQ" | "DIYANET" | "MATHEMATICAL";

export interface CalendarOptions {
    calendarMethod?: CalendarMethod;
    adjustment?: number; // Only used with MATHEMATICAL method
}

const API_BASE_URL = "https://api.aladhan.com/v1";

// Fetch Islamic important dates for a specific Hijri year
export const fetchHijriImportantDatesByYear = async (year: number): Promise<ImportantDateData> => {
    try {
        const url = `${API_BASE_URL}/islamicHolidaysByHijriYear/${year}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json: ImportantDateResponse = await response.json();

        if (!json || !json.data) {
            throw new Error("Invalid API response structure");
        }

        // Filter important dates to only include those in INCLUDED_IMPORTANT_DATES
        const filteredImportantDates = json.data.importantDates.filter(importantDate =>
            INCLUDED_IMPORTANT_DATES.includes(importantDate)
        );

        return {
            ...json.data,
            importantDates: filteredImportantDates
        };
    } catch (error) {
        console.error("Error fetching Hijri important dates:", error);
        throw error;
    }
};


// Fetch Hijri calendar data for a specific Gregorian month and year

export const fetchHijriCalendar = async (
    month: number,
    year: number,
    options?: CalendarOptions
): Promise<CalendarDay[]> => {
    const params = new URLSearchParams();
    if (options?.calendarMethod) {
        params.append("calendarMethod", options.calendarMethod);
    }
    // Adjustment only works with MATHEMATICAL method
    // Negate the value: user expects +1 = important date 1 day later, but API works inversely
    if (
        options?.adjustment !== undefined &&
        options.adjustment !== 0 &&
        options?.calendarMethod === "MATHEMATICAL"
    ) {
        params.append("adjustment", (-options.adjustment).toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/gToHCalendar/${month}/${year}${queryString ? `?${queryString}` : ""}`;

    try {
        console.log(`[fetchHijriCalendar] Fetching ${month}/${year}...`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json: CalendarResponse = await response.json();

        if (!json || !json.data) {
            throw new Error("Invalid API response structure");
        }

        console.log(`[fetchHijriCalendar] ${month}/${year} - Got ${json.data.length} days`);
        return json.data;
    } catch (error) {
        console.error(`Error fetching Hijri calendar for ${month}/${year}:`, error);
        throw error;
    }
};

// Fetch the next included Islamic important date from the calendar

export const fetchNextIncludedHijriImportantDate = async (
    options?: CalendarOptions
): Promise<NextHijriImportantDateData | null> => {
    try {
        // Try to get cached calendar data first
        let allDays = await getCachedCalendar();

        // If no cached data or cache expired, fetch from API
        if (!allDays) {
            const monthsToFetch = getMonthsForCurrentYear();

            // Fetch months sequentially with delay to avoid rate limiting
            // Skip failed months instead of failing entirely
            const calendars: CalendarDay[][] = [];
            for (const { month, year } of monthsToFetch) {
                try {
                    const calendar = await fetchHijriCalendar(month, year, options);
                    calendars.push(calendar);
                } catch (error) {
                    console.warn(`[fetchNextIncludedHijriImportantDate] Skipping month ${month}/${year} due to error:`, error);
                    // Continue with other months
                }
                // Add small delay between requests to avoid rate limiting
                await delay(100);
            }

            if (calendars.length === 0) {
                console.error("[fetchNextIncludedHijriImportantDate] All months failed to load");
                return null;
            }

            allDays = calendars.flat();

            // Only cache if we got most months (at least 20 of 25)
            if (calendars.length >= 20) {
                await cacheCalendar(allDays);
            }
        }

        // Find the next upcoming important date
        const nextDay = findNextUpcomingImportantDate(allDays);

        if (nextDay) {
            const includedImportantDates = getIncludedImportantDatesFromDay(nextDay);

            return {
                gregorian: {
                    date: nextDay.gregorian.date,
                    holidays: includedImportantDates
                },
                hijri: {
                    holidays: includedImportantDates
                }
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching next included Hijri important date:", error);
        throw error;
    }
};

// Fetch the next upcoming Hijri important date directly from API

export const fetchNextHijriImportantDate = async (
    options?: CalendarOptions
): Promise<NextHijriImportantDateData> => {
    const params = new URLSearchParams();

    if (options?.calendarMethod) {
        params.append("calendarMethod", options.calendarMethod);
    }
    // Adjustment only works with MATHEMATICAL method
    // Negate the value: user expects +1 = important date 1 day later, but API works inversely
    if (
        options?.adjustment !== undefined &&
        options.adjustment !== 0 &&
        options?.calendarMethod === "MATHEMATICAL"
    ) {
        params.append("adjustment", (-options.adjustment).toString());
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/nextHijriHoliday${queryString ? `?${queryString}` : ""}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json: NextHijriImportantDateResponse = await response.json();

        if (!json || !json.data) {
            throw new Error("Invalid API response structure");
        }

        // Filter important dates to only include those in INCLUDED_IMPORTANT_DATES
        const filteredData = { ...json.data };

        if (filteredData.gregorian.holidays) {
            filteredData.gregorian.holidays = filteredData.gregorian.holidays.filter(
                importantDate => INCLUDED_IMPORTANT_DATES.includes(importantDate)
            );
        }

        if (filteredData.gregorian.adjustedHolidays) {
            filteredData.gregorian.adjustedHolidays = filteredData.gregorian.adjustedHolidays.filter(
                importantDate => INCLUDED_IMPORTANT_DATES.includes(importantDate)
            );
        }

        if (filteredData.hijri?.holidays) {
            filteredData.hijri.holidays = filteredData.hijri.holidays.filter(
                importantDate => INCLUDED_IMPORTANT_DATES.includes(importantDate)
            );
        }

        if (filteredData.hijri?.adjustedHolidays) {
            filteredData.hijri.adjustedHolidays = filteredData.hijri.adjustedHolidays.filter(
                importantDate => INCLUDED_IMPORTANT_DATES.includes(importantDate)
            );
        }

        return filteredData;
    } catch (error) {
        console.error("Error fetching next Hijri important date:", error);
        throw error;
    }
};
