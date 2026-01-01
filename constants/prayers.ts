// adjust Sunrise inclusion here
export const Prayers = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
] as const;

export type Prayer = (typeof Prayers)[number];

// Mapping of prayers to their icons
export const prayerIcons: Record<Prayer, any> = {
  Fajr: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-fajr.png"),
  Sunrise: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-sunrise.png"),
  Dhuhr: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-dhuhr.png"),
  Asr: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-asr.png"),
  Maghrib: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-maghrib.png"),
  Isha: require("../assets/images/prayer-pro-icons/home-page/prayer-times/icon-isha.png"),
};

// Mapping of prayers to their background images
export const prayerBackgrounds: Record<string, any> = {
  Fajr: require("../assets/images/prayer-pro-bg/prayer-pro-bg-fajr.png"),
  Sunrise: require("../assets/images/prayer-pro-bg/prayer-pro-bg-sunrise.png"),
  Dhuhr: require("../assets/images/prayer-pro-bg/prayer-pro-bg-dhur.png"),
  Asr: require("../assets/images/prayer-pro-bg/prayer-pro-bg-asr.png"),
  Maghrib: require("../assets/images/prayer-pro-bg/prayer-pro-bg-maghrib.png"),
  Isha: require("../assets/images/prayer-pro-bg/prayer-pro-bg-isha.png"),
};

// Theme colors for each prayer (active and inactive states)
export const prayerThemeColors = {
  Fajr: {
    active: "#568FAF",
    inactive: "#7BA8CC",
  },
  Sunrise: {
    active: "#ff9a13",
    inactive: "#ffc77a",
  },
  Dhuhr: {
    active: "#55bddf",
    inactive: "#78d0e8",
  },
  Asr: {
    active: "#ff9a13",
    inactive: "#fd8211",
  },
  Maghrib: {
    active: "#9B59B6",
    inactive: "#664183",
  },
  Isha: {
    active: "#854ab4",
    inactive: "#532e70",
    
  },
};

// Light mode colors (default)
export const lightModeColors = {
  background: "#ffffff",
  backgroundSecondary: "#f9fafb",
  text: "#000000",
  textSecondary: "#374151",
  textTertiary: "#4b5563",
  disabledText: "#d9e1e8",
  sectionTitle: "#b6c1cd",
};

// Dark mode colors (for Maghrib and Isha prayers)
export const darkModeColors = {
  background: "#1a1a2e",
  backgroundSecondary: "#2a2a3e",
  text: "#ffffff",
  textSecondary: "#e0e0e0",
  textTertiary: "#d0d0d0",
  disabledText: "#4a4a5a",
  sectionTitle: "#8898a8",
};


