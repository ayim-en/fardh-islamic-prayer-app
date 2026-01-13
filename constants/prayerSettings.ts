// Prayer calculation settings constants

export type CalculationMethod = {
  id: number;
  name: string;
  description?: string;
};

export type School = {
  id: 0 | 1;
  name: string;
  description: string;
};

export type LatitudeAdjustment = {
  id: number | null;
  name: string;
  description: string;
};

// All 24 calculation methods from aladhan.com API, Not Including 99 (Custom)
export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 0, name: "Jafari / Shia Ithna-Ashari" },
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 7, name: "Institute of Geophysics, University of Tehran" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura, Singapore" },
  { id: 12, name: "Union Organization Islamic de France" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
  { id: 15, name: "Moonsighting Committee Worldwide" },
  { id: 16, name: "Dubai (experimental)" },
  { id: 17, name: "Jabatan Kemajuan Islam Malaysia (JAKIM)" },
  { id: 18, name: "Tunisia" },
  { id: 19, name: "Algeria" },
  { id: 20, name: "KEMENAG - Kementerian Agama Republik Indonesia" },
  { id: 21, name: "Morocco" },
  { id: 22, name: "Comunidade Islamica de Lisboa" },
  { id: 23, name: "Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan" },
];

// Juristic schools for Asr calculation
export const SCHOOLS: School[] = [
  { id: 0, name: "Shafi", description: "Earlier Asr time" },
  { id: 1, name: "Hanafi", description: "Later Asr time" },
];

// High latitude adjustment methods
export const LATITUDE_ADJUSTMENTS: LatitudeAdjustment[] = [
  { id: null, name: "None", description: "No adjustment (default)" },
  { id: 1, name: "Middle of Night", description: "Middle of the night method" },
  { id: 2, name: "One Seventh", description: "One seventh of the night" },
  { id: 3, name: "Angle Based", description: "Angle based method" },
];

// Tune adjustments for prayer times (in minutes)
// API format order: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
// We only expose fard prayers + sunrise for adjustment
export type TunablePrayer = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export const TUNABLE_PRAYERS: { key: TunablePrayer; label: string }[] = [
  { key: "Fajr", label: "Fajr" },
  { key: "Sunrise", label: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr" },
  { key: "Asr", label: "Asr" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Isha", label: "Isha" },
];

export type TuneSettings = Record<TunablePrayer, number>;

export const DEFAULT_TUNE_SETTINGS: TuneSettings = {
  Fajr: 0,
  Sunrise: 0,
  Dhuhr: 0,
  Asr: 0,
  Maghrib: 0,
  Isha: 0,
};

// Converts tune settings to API format string: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
export const tuneSettingsToString = (tune: TuneSettings): string => {
  return `0,${tune.Fajr},${tune.Sunrise},${tune.Dhuhr},${tune.Asr},${tune.Maghrib},0,${tune.Isha},0`;
};

// Default settings
export const DEFAULT_PRAYER_SETTINGS = {
  method: 2, // ISNA
  school: 0 as 0 | 1, // Shafi
  latitudeAdjustmentMethod: null as number | null,
  tune: DEFAULT_TUNE_SETTINGS,
};

export type PrayerSettings = typeof DEFAULT_PRAYER_SETTINGS;
