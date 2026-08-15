import { cacheCalendar, getCachedCalendar } from "@/utils/cacheHelpers";
import { getMonthsForCurrentYear } from "@/utils/calendarHelpers";

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

// Calendar type definitions
export interface CalendarDay {
    hijri: {
        date: string;
        holidays: string[];
        adjustedHolidays: string[];
        // The API returns these too and they survive into the cache untouched
        // (fetchHijriCalendar returns json.data verbatim; cacheCalendar
        // stringifies it whole). Optional so a partial or older cache entry
        // can never crash a consumer — derive day/month/year from `date`
        // instead, which is always present.
        day?: string;
        month?: { number: number; en: string; ar: string; days: number };
        year?: string;
        weekday?: { en: string; ar: string };
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

export type CalendarMethod = "HJCoSA" | "UAQ" | "DIYANET" | "MATHEMATICAL";

export interface CalendarOptions {
    calendarMethod?: CalendarMethod;
    adjustment?: number; // Only used with MATHEMATICAL method
}

const API_BASE_URL = "https://api.aladhan.com/v1";

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

// Return the full cached calendar window, fetching and caching it on a miss.
// This is the whole 25-month range (see getMonthsForCurrentYear) flattened.
export const ensureCachedCalendar = async (
    options?: CalendarOptions
): Promise<CalendarDay[] | null> => {
    // Try to get cached calendar data first
    const cached = await getCachedCalendar();
    if (cached) return cached;

    const monthsToFetch = getMonthsForCurrentYear();

    // Fetch months sequentially with delay to avoid rate limiting
    // Skip failed months instead of failing entirely
    const calendars: CalendarDay[][] = [];
    for (const { month, year } of monthsToFetch) {
        try {
            const calendar = await fetchHijriCalendar(month, year, options);
            calendars.push(calendar);
        } catch (error) {
            console.warn(`[ensureCachedCalendar] Skipping month ${month}/${year} due to error:`, error);
            // Continue with other months
        }
        // Add small delay between requests to avoid rate limiting
        await delay(100);
    }

    if (calendars.length === 0) {
        console.error("[ensureCachedCalendar] All months failed to load");
        return null;
    }

    const allDays = calendars.flat();

    // Only cache if we got most months (at least 20 of 25). Partial results
    // below that are still returned, just not persisted.
    if (calendars.length >= 20) {
        await cacheCalendar(allDays);
    }

    return allDays;
};
