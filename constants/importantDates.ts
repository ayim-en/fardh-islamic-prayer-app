export const INCLUDED_IMPORTANT_DATES = [
    "Ashura",
    "Lailat-ul-Miraj",
    "1st Day of Ramadan",
    "Lailat-ul-Qadr",
    "Eid-ul-Fitr",
    "Arafa",
    "Eid-ul-Adha",
]

// Historical events not returned by the Aladhan API, so added manually to calendarHelpers.ts.
export const MANUAL_KEY_DATES: { month: string; day: number; label: string }[] = [
    { month: "01", day: 1, label: "Islamic New Year" },
    { month: "02", day: 1, label: "Battle of Khaybar" },
    { month: "09", day: 17, label: "Battle of Badr" },
    { month: "09", day: 20, label: "Conquest of Mecca" },
    { month: "10", day: 2, label: "Six Days of Shawwal" },
    { month: "10", day: 7, label: "Battle of Uhud" },
    { month: "10", day: 10, label: "Battle of Hunayn" },
    // Historians agree it was in Shawwal 5 AH but no exact date.
    { month: "10", day: 23, label: "Battle of the Trench" },
    { month: "11", day: 15, label: "Treaty of Hudaybiyyah" },
    { month: "12", day: 1, label: "First 10 Days of Dhul Hijjah" },
];

// Shown under the name in the day sheet, for dates that resolve to more than one
// day. Lailat-ul-Qadr is deliberately marked on all five odd nights, so the row
// has to say so rather than implying the tapped night is the night.
export const KEY_DATE_SUBTITLES: Record<string, string> = {
    "Lailat-ul-Qadr": "One of five possible nights",
};

export const IMPORTANT_DATE_DESCRIPTIONS: Record<string, string> = {
    "Ashura":
        "Ashura (10th of Muharram) commemorates the day Allah saved Prophet Musa and the Children of Israel from Pharaoh. Observance typically includes fasting on this day.",
    "Lailat-ul-Miraj":
        "Lailat-ul-Miraj marks the Night Journey and Ascension of the Prophet Muhammad ﷺ from Makkah to Jerusalem and into Heaven.",
    "1st Day of Ramadan":
        "The 1st Day of Ramadan marks the beginning of the holy month of fasting, prayer, charity, and reflection. One month of Ramadan fasting = Ten months of regular fasting.",
    "Lailat-ul-Qadr":
        "Lailat-ul-Qadr marks the blessed night in Ramadan when the first verses of the Quran were revealed. The exact date is uncertain, but observance occurs during the last ten nights of the holy month.",
    "Eid-ul-Fitr":
        "Eid-ul-Fitr marks the holiday celebrating the end of Ramadan. It falls on the first day of Shawwal, a month which carries its own fasting rewards (see 'Six Days of Shawwal').",
    "Six Days of Shawwal":
        "Fasting any six days in Shawwal, whether consecutive or spread out across the month, carries the reward of fasting the entire year when combined with Ramadan. Six days of Shawwal = Two months of regular fasting. However, fasting on the first day of Shawwal (Eid-ul-Fitr) is prohibited.",
    "Arafa":
        "The Day of Arafah (9th of Dhul-Hijjah) marks the pinnacle of Hajj. For non-pilgrims, observance includes fasting on this day, which expels minor sins from the previous and upcoming year.",
    "Eid-ul-Adha":
        "Eid-ul-Adha commemorates the devotion of Prophet Ibrahim. Observance includes the Eid prayer, community celebration, and gratitude.",
    "Battle of Badr":
        "The Battle of Badr (17 Ramadan, 2 AH) marks the first major military encounter in Islamic history, where a small Muslim force defeated a much larger Meccan army.",
    "Battle of Uhud":
        "The Battle of Uhud (7 Shawwal, 3 AH) marks the military encounter following the Muslims' victory at Badr, teaching a lasting lesson about discipline and obedience after archers left their post.",
    "Battle of the Trench":
        "The Battle of the Trench (Shawwal, 5 AH) marks the siege of Madinah by a confederation of tribes. The Muslims defended the city by digging a trench, and the siege ended without direct battle.",
    "Conquest of Mecca":
        "The Conquest of Mecca (20 Ramadan, 8 AH) marks the return of the Prophet Muhammad ﷺ to Mecca with an army, taking the city with little bloodshed, declaring a general amnesty, and cleansing the Kaaba of idols.",
    "Islamic New Year":
        "The Islamic New Year (1 Muharram) marks the start of the Hijri calendar, commemorating the Prophet Muhammad's ﷺ migration (Hijra) from Makkah to Madinah in 622 CE.",
    "Battle of Khaybar":
        "The Battle of Khaybar (Muharram-Safar, 7 AH) marks a decisive Muslim victory over a fortified settlement north of Madinah, renowned for Ali ibn Abi Talib's role in the conquest.",
    "Battle of Hunayn":
        "The Battle of Hunayn (10 Shawwal, 8 AH) marks the military encounter shortly after the Conquest of Mecca, where the Muslims recovered from an early ambush to defeat the Hawazin and Thaqif tribes.",
    "Treaty of Hudaybiyyah":
        "The Treaty of Hudaybiyyah (15 Dhul Qi'dah, 6 AH) marks a ten-year truce with the Quraysh that appeared to concede much to Makkah but is described in the Quran as a clear victory, opening the way for Islam to spread.",
    "First 10 Days of Dhul Hijjah":
        "The First 10 Days of Dhul Hijjah marks a period featuring the most beloved days to Allah for righteous deeds. Observance encompasses extra prayer, fasting, dhikr, and charity leading up to the Day of Arafah and Eid-ul-Adha.",
};
