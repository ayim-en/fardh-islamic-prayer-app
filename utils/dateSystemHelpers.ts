import { PrimaryDateSystem } from "@/constants/calendarSettings";

// The same day rendered in both date systems, already formatted by the caller.
export type DateSystemLabels = {
  gregorian: string;
  hijri: string;
};

// Which of the two labels leads and which trails, given the primary date
// system. Surfaces showing one date render `leading`; surfaces showing both
// render `leading` as the larger label and `trailing` as the smaller. Every
// rendering component consumes this rather than re-deriving the choice, so the
// prayer screen and the calendar cannot disagree about which system leads.
export const resolveDateLabels = (
  primary: PrimaryDateSystem,
  labels: DateSystemLabels
): { leading: string; trailing: string } =>
  primary === "hijri"
    ? { leading: labels.hijri, trailing: labels.gregorian }
    : { leading: labels.gregorian, trailing: labels.hijri };
