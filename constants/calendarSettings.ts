// Calendar calculation settings constants

export type CalendarMethodId = "HJCoSA" | "UAQ" | "DIYANET" | "MATHEMATICAL";

export type CalendarMethodOption = {
  id: CalendarMethodId;
  name: string;
  description: string;
};

// All 4 calendar calculation methods from aladhan.com API
export const CALENDAR_METHODS: CalendarMethodOption[] = [
  {
    id: "HJCoSA",
    name: "Saudi Arabia (HJCoSA)",
    description: "High Judiciary Council of Saudi Arabia",
  },
  {
    id: "UAQ",
    name: "Umm Al Qura",
    description: "Astronomical calculation",
  },
  {
    id: "DIYANET",
    name: "Turkey (Diyanet)",
    description: "Turkish Diyanet calculation",
  },
  {
    id: "MATHEMATICAL",
    name: "Mathematical",
    description: "Supports day adjustment",
  },
];

export type CarouselDateFormat = "gregorian" | "hijri";

// Default settings
export const DEFAULT_CALENDAR_SETTINGS = {
  calendarMethod: "HJCoSA" as CalendarMethodId,
  adjustment: 0,
  carouselDateFormat: "gregorian" as CarouselDateFormat,
};

export type CalendarSettings = typeof DEFAULT_CALENDAR_SETTINGS;

// The fields whose values the cached calendar was computed from. A change to
// any of them makes the cache wrong; a change to anything else is cosmetic and
// the cache stays. Adding a field that affects the fetch means adding it here.
const CACHE_INVALIDATING_FIELDS = ["calendarMethod", "adjustment"] as const;

// Whether saving `next` over `previous` must clear the calendar cache.
// Callers pass the settings they are about to persist, after any normalisation,
// so that a reset adjustment counts as the change it is.
export const invalidatesCalendarCache = (
  previous: CalendarSettings,
  next: CalendarSettings
): boolean =>
  CACHE_INVALIDATING_FIELDS.some((field) => previous[field] !== next[field]);
