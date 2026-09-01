import { PrimaryDateSystem } from "@/constants/calendarSettings";

// The same day rendered in both date systems, already formatted by the caller.
// Either may be null: a Hijri label is unknown for any day the cached calendar
// doesn't reach, and callers pass what they have rather than each spelling the
// same `?? ""` before handing it over.
export type DateSystemLabels = {
  gregorian: string | null;
  hijri: string | null;
};

// Which of a pair belongs to the leading slot and which to the trailing one,
// given the primary date system. Surfaces showing one date render `leading`;
// surfaces showing both render `leading` as the larger label and `trailing` as
// the smaller. Every rendering component consumes this rather than re-deriving
// the choice, so the prayer screen and the calendar cannot disagree about which
// system leads.
//
// Generic in what travels with a system, because a surface resolves more than
// text: the calendar header also has to know how long each system's longest
// label runs, to size the line it lands in.
export const resolveBySystem = <T,>(
  primary: PrimaryDateSystem,
  values: { gregorian: T; hijri: T }
): { leading: T; trailing: T } =>
  primary === "hijri"
    ? { leading: values.hijri, trailing: values.gregorian }
    : { leading: values.gregorian, trailing: values.hijri };

// The pair of rendered dates, resolved and never null. The common case, named.
//
// A surface showing ONE date renders `leading` and nothing else — which stays
// empty when that system's label is unknown, because on the prayer screen the
// primary is the only date shown (ADR-0001). Substituting the other system
// there would answer a question the setting has already settled.
export const resolveDateLabels = (
  primary: PrimaryDateSystem,
  labels: DateSystemLabels
): { leading: string; trailing: string } => {
  const resolved = resolveBySystem(primary, labels);
  return {
    leading: resolved.leading ?? "",
    trailing: resolved.trailing ?? "",
  };
};

// The same pair for a surface that shows BOTH dates, where one of them being
// unknown is a different problem: a blank heading above a small date reads as a
// bug, so the date that IS known takes the larger slot and the smaller one is
// left empty rather than repeating it.
//
// The calendar's rule, not the setting's — which is why it lives here beside
// the plain resolver rather than inside it.
export const resolveBothDateLabels = (
  primary: PrimaryDateSystem,
  labels: DateSystemLabels
): { leading: string; trailing: string } => {
  const resolved = resolveDateLabels(primary, labels);
  return resolved.leading
    ? resolved
    : { leading: resolved.trailing, trailing: "" };
};
