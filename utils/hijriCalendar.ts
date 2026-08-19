import { getHijriMonthAbbr, getHijriMonthName } from "@/constants/hijri";
import { CalendarDay } from "@/prayer-api/islamicCalendarAPI";
import {
  convertDDMMYYYYToISO,
  getIncludedImportantDatesFromDay,
  getLocalISODate,
  getMonthsForCurrentYear,
} from "@/utils/calendarHelpers";

// Pure data layer for the paged month grid. No React, no I/O — everything here
// is derived from the cached CalendarDay[] and is safe to call from a useMemo.

const DAYS_IN_GRID = 42; // 7 columns x 6 rows, always

// ---------------------------------------------------------------- day index

export interface HijriDayInfo {
  iso: string; // "2026-08-11"
  hijriDay: number;
  hijriMonth: number; // 1-12
  hijriYear: number;
  isHijriMonthStart: boolean;
  /** Grid sub-line: "28", or "1 Rab I" on the day a Hijri month begins. */
  hijriLabel: string;
  /** Sheet + header: "28 Ṣafar 1448". */
  hijriFullLabel: string;
  keyDates: string[];
}

export interface CalendarIndex {
  byIso: Map<string, HijriDayInfo>;
  /** Every ISO date carrying at least one key date, ascending. */
  keyDateIsos: string[];
}

export const EMPTY_CALENDAR_INDEX: CalendarIndex = {
  byIso: new Map(),
  keyDateIsos: [],
};

// Builds the lookup used by every other function here. Runs once per cache
// load — never during render, since getIncludedImportantDatesFromDay allocates
// and scans per call.
export const buildCalendarIndex = (
  days: CalendarDay[] | null
): CalendarIndex => {
  if (!days || days.length === 0) return EMPTY_CALENDAR_INDEX;

  const byIso = new Map<string, HijriDayInfo>();
  const keyDateIsos: string[] = [];

  for (const day of days) {
    // hijri.date is "DD-MM-YYYY". Parsing the number here rather than reading
    // hijri.month.en keeps us off the diacritic strings entirely.
    const [dayStr, monthStr, yearStr] = day.hijri.date.split("-");
    const hijriDay = parseInt(dayStr, 10);
    const hijriMonth = parseInt(monthStr, 10);
    const hijriYear = parseInt(yearStr, 10);
    if (!hijriDay || !hijriMonth || !hijriYear) continue;

    const iso = convertDDMMYYYYToISO(day.gregorian.date);
    const isHijriMonthStart = hijriDay === 1;
    const abbr = getHijriMonthAbbr(hijriMonth);
    const name = getHijriMonthName(hijriMonth);
    const keyDates = getIncludedImportantDatesFromDay(day);

    byIso.set(iso, {
      iso,
      hijriDay,
      hijriMonth,
      hijriYear,
      isHijriMonthStart,
      hijriLabel:
        isHijriMonthStart && abbr ? `${hijriDay} ${abbr}` : String(hijriDay),
      hijriFullLabel: name
        ? `${hijriDay} ${name} ${hijriYear}`
        : `${hijriDay}-${hijriMonth}-${hijriYear}`,
      keyDates,
    });

    if (keyDates.length > 0) keyDateIsos.push(iso);
  }

  // ISO strings sort chronologically, so a plain sort is enough.
  keyDateIsos.sort();

  return { byIso, keyDateIsos };
};

// ---------------------------------------------------------------- next key date

export interface NextKeyDate {
  iso: string;
  name: string; // first entry when a day carries several
  names: string[];
  daysAway: number; // 0 = today
  hijriLabel: string; // "1 Shawwāl 1448" — shown when the strip expands
}

// Whole days between two ISO dates. Uses Date.UTC because subtracting two local
// Dates across a DST boundary yields e.g. 29.958 days, which floors to 29.
export const daysBetweenIso = (from: string, to: string): number => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
  );
};

export const findNextKeyDate = (
  index: CalendarIndex,
  todayIso: string
): NextKeyDate | null => {
  const iso = index.keyDateIsos.find((candidate) => candidate >= todayIso);
  if (!iso) return null;

  const info = index.byIso.get(iso);
  if (!info || info.keyDates.length === 0) return null;

  return {
    iso,
    name: info.keyDates[0],
    names: info.keyDates,
    daysAway: daysBetweenIso(todayIso, iso),
    hijriLabel: info.hijriFullLabel,
  };
};

// ---------------------------------------------------------------- month pages

export interface MonthPageMeta {
  key: string; // "2026-08"
  year: number;
  month: number; // 1-12
  title: string; // "August 2026"
}

// Derived from getMonthsForCurrentYear so the page list and the cached window
// can never drift apart.
export const buildMonthPages = (): MonthPageMeta[] =>
  getMonthsForCurrentYear().map(({ month, year }) => ({
    key: `${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
    title: new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
  }));

// Index of the page containing today, i.e. where the pager should open.
export const findPageIndexForIso = (
  pages: MonthPageMeta[],
  iso: string
): number => {
  const key = iso.slice(0, 7); // "YYYY-MM"
  return pages.findIndex((page) => page.key === key);
};

// ---------------------------------------------------------------- grid cells

export interface GridCell {
  iso: string;
  gregorianDay: number;
  /** Belongs to the previous or next month; rendered faded. */
  isOutside: boolean;
  hijriLabel: string | null;
  isHijriMonthStart: boolean;
  hasKeyDate: boolean;
}

// Always returns exactly 42 cells, every one a real date: the tail of the
// previous month, this month, then the head of the next.
//
// Drawing the neighbours rather than leaving blanks is what makes all 25 pages
// identical in density. Without them, 19 of the 25 render an entirely empty
// sixth row — February 2026 leaves its last TWO rows empty — and the empty band
// jumps position as you swipe.
export const buildMonthCells = (
  year: number,
  month: number,
  index: CalendarIndex
): GridCell[] => {
  const lead = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  // Walking forward from the first visible date lets Date arithmetic carry the
  // month and year rollovers, so neither end of December needs a special case.
  const start = new Date(year, month - 1, 1 - lead);
  const cells: GridCell[] = [];

  for (let i = 0; i < DAYS_IN_GRID; i++) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );
    const iso = getLocalISODate(date);
    // Outside days take the same lookup as in-month ones, so they carry real
    // Hijri numerals, month-boundary labels and key-date dots.
    const info = index.byIso.get(iso);
    cells.push({
      iso,
      gregorianDay: date.getDate(),
      isOutside: date.getMonth() !== month - 1,
      // null (not "") when uncached, so the cell can reserve the slot without
      // rendering a stray character.
      hijriLabel: info?.hijriLabel ?? null,
      isHijriMonthStart: info?.isHijriMonthStart ?? false,
      hasKeyDate: (info?.keyDates.length ?? 0) > 0,
    });
  }

  return cells;
};

// "Ṣafar 1448" | "Ṣafar — Rabīʿ al-awwal 1448" | "Dhū al-Ḥijjah 1448 — Muḥarram 1449"
// Uses the first and last cached day rather than assuming exactly two months: a
// 31-day Gregorian month can touch three Hijri months (tail of A + all 29 of B
// + head of C), and a partially-cached month can have gaps in the middle.
export const buildHijriSpanLabel = (
  cells: GridCell[],
  index: CalendarIndex
): string | null => {
  let first: HijriDayInfo | null = null;
  let last: HijriDayInfo | null = null;

  for (const cell of cells) {
    // Load-bearing: every cell now carries an ISO, so without this the label
    // would silently take in the neighbouring months' Hijri range — August 2026
    // would start in late July's Hijri month.
    if (cell.isOutside) continue;
    const info = index.byIso.get(cell.iso);
    if (!info) continue;
    if (!first) first = info;
    last = info;
  }

  if (!first || !last) return null;

  const firstName = getHijriMonthName(first.hijriMonth);
  const lastName = getHijriMonthName(last.hijriMonth);
  if (!firstName || !lastName) return null;

  if (first.hijriMonth === last.hijriMonth && first.hijriYear === last.hijriYear) {
    return `${firstName} ${first.hijriYear}`;
  }

  if (first.hijriYear === last.hijriYear) {
    return `${firstName} — ${lastName} ${first.hijriYear}`;
  }

  return `${firstName} ${first.hijriYear} — ${lastName} ${last.hijriYear}`;
};

// ---------------------------------------------------------------- page data

export interface MonthPageData extends MonthPageMeta {
  cells: GridCell[];
  hijriSpan: string | null;
}

// Precomputes all 25 pages in one pass so paging recomputes nothing and
// React.memo on the grid can short-circuit on a stable reference.
export const buildMonthPageData = (
  pages: MonthPageMeta[],
  index: CalendarIndex
): MonthPageData[] =>
  pages.map((page) => {
    const cells = buildMonthCells(page.year, page.month, index);
    return { ...page, cells, hijriSpan: buildHijriSpanLabel(cells, index) };
  });
