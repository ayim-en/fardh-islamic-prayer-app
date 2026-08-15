// Hijri month tables, indexed by month number - 1 (Muharram = 1).
//
// These use the diacritic spellings Aladhan returns in `hijri.month.en`, which
// is why they are keyed by NUMBER rather than by that string: a transliteration
// tweak upstream, or an NFC/NFD normalisation difference, would silently break
// lookups for a whole month.
//
// Note: `utils/prayerHelpers.ts` has a separate HIJRI_MONTHS table using plain
// ASCII spellings ("Safar", "Rabi' al-Awwal"). That one feeds the home carousel
// and is deliberately left alone — changing it would change the home screen.

export const HIJRI_MONTH_NAMES = [
  "Muḥarram",
  "Ṣafar",
  "Rabīʿ al-awwal",
  "Rabīʿ al-thānī",
  "Jumādá al-ūlá",
  "Jumādá al-ākhirah",
  "Rajab",
  "Shaʿbān",
  "Ramaḍān",
  "Shawwāl",
  "Dhū al-Qaʿdah",
  "Dhū al-Ḥijjah",
] as const;

// Shown in the one grid cell where a Hijri month begins, so it has to clear a
// ~50pt column. Roman numerals separate the two Rabīʿ and two Jumādá months
// (standard scholarly convention). Dhū al-Qaʿdah / Dhū al-Ḥijjah abbreviate on
// the second word because "Dhu" is ambiguous across both.
export const HIJRI_MONTH_ABBR = [
  "Muh",
  "Saf",
  "Rab I",
  "Rab II",
  "Jum I",
  "Jum II",
  "Raj",
  "Sha",
  "Ram",
  "Shw",
  "Qad",
  "Hij",
] as const;

// Returns the full month name for a 1-12 month number, or null if out of range.
export const getHijriMonthName = (month: number): string | null =>
  HIJRI_MONTH_NAMES[month - 1] ?? null;

// Returns the abbreviated month name for a 1-12 month number, or null.
export const getHijriMonthAbbr = (month: number): string | null =>
  HIJRI_MONTH_ABBR[month - 1] ?? null;
