import { getHijriMonthAbbr } from "@/constants/hijri";
import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import { resolveBySystem } from "@/utils/dateSystemHelpers";
import type { NextKeyDate } from "@/utils/hijriCalendar";

// How the next key date's row and expanded body state their date. Pure, and
// the whole of the decision — NextKeyDateStrip renders what comes back and
// makes no date choices of its own.

/** The fields of a key date its labels are derived from. */
export type KeyDateLabelSource = Pick<
  NextKeyDate,
  "iso" | "hijriDay" | "hijriMonth" | "hijriFullLabel"
>;

// One date system's two forms of the same day. Resolved as a pair rather than
// as two strings so that a single resolveBySystem call settles which system
// lands in the row and which in the body.
interface DateForms {
  /**
   * Day and abbreviated month, no year — what the row shows. Null where no
   * such form can be built, which only the Hijri side can be.
   */
  short: string | null;
  /** Day, full month name, year — what the expanded body shows. */
  full: string;
}

export interface KeyDateLabels {
  /**
   * The one date the row shows, in the primary system. ADR-0001 has the
   * calendar showing both systems, and this row is its named exception: it
   * already fits a label, a name, a date, a countdown and a chevron on one
   * line, so a second date would be paid for out of the name.
   */
  row: string;
  /**
   * The full date in whichever system the row is not using, shown when the row
   * expands. The body's job is the detail the one line had to drop, so it never
   * restates the row.
   */
  body: string;
}

const toLocalDate = (iso: string): Date => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// The Gregorian side always has both forms, which is what lets it stand in
// for a Hijri short form that cannot be built.
const gregorianForms = (iso: string): DateForms & { short: string } => {
  const date = toLocalDate(iso);
  return {
    // "Sep 18" — no year, since the countdown beside it carries the distance.
    // Composed rather than left to the locale so the month-before-day order
    // holds on en-GB as well as en-US, as it does everywhere else Gregorian
    // dates are written here.
    short: `${date.toLocaleDateString(undefined, { month: "short" })} ${date.getDate()}`,
    // "September 18, 2026" — the calendar header's format exactly, since both
    // state a full Gregorian date and nothing distinguishes them. Deliberately
    // not the day sheet's, which leads with a weekday: that earns its place on
    // a day you just tapped, and is noise on a date months away.
    full: `${date.toLocaleDateString(undefined, {
      month: "long",
    })} ${date.getDate()}, ${date.getFullYear()}`,
  };
};

const hijriForms = (keyDate: KeyDateLabelSource): DateForms => {
  const abbr = getHijriMonthAbbr(keyDate.hijriMonth);
  return {
    // "6 Rab II" — the same day-then-abbreviation shape the grid uses on the
    // day a Hijri month begins, so the two read as one system. Null when the
    // month number falls outside the 12-month table, leaving no short form to
    // show.
    short: abbr === null ? null : `${keyDate.hijriDay} ${abbr}`,
    full: keyDate.hijriFullLabel,
  };
};

export const formatKeyDateLabels = (
  keyDate: KeyDateLabelSource,
  primary: PrimaryDateSystem
): KeyDateLabels => {
  const gregorian = gregorianForms(keyDate.iso);
  const { leading, trailing } = resolveBySystem<DateForms>(primary, {
    gregorian,
    hijri: hijriForms(keyDate),
  });

  // Reached only with Hijri leading and its month out of the table: there is no
  // Hijri short form, so the row states the Gregorian date instead. A real date
  // in the wrong system beats a broken one in the right system, and the
  // countdown still answers what the reader came for. In a Hijri-primary
  // screenshot this looks like the setting being ignored; it isn't.
  if (leading.short === null) {
    return { row: gregorian.short, body: leading.full };
  }

  return { row: leading.short, body: trailing.full };
};
