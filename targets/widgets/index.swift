import WidgetKit
import SwiftUI

// MARK: - Shared Data Model

struct PrayerTime: Codable {
    let name: String
    let time: String
}

struct PrayerData: Codable {
    let fajr: String
    let sunrise: String
    let dhuhr: String
    let asr: String
    let maghrib: String
    let isha: String
    let tomorrowFajr: String?
    let currentPrayer: String?
    let locationName: String?
    let lastUpdated: String?
    // Theme colors from app
    let accentColor: String?
    let isDarkMode: Bool?
    // Theme override prayer (if user has set a theme)
    let themePrayer: String?
    // Time format preference
    let timeFormat: String?

    // Helper to format time based on preference
    func formatTime(_ time: String) -> String {
        let use12Hour = timeFormat == "12h"
        guard use12Hour else { return time }

        // Parse "HH:mm" and convert to "h:mm a"
        let parts = time.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]) else { return time }

        let period = hour >= 12 ? "PM" : "AM"
        let hour12 = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        return String(format: "%d:%02d %@", hour12, minute, period)
    }
}

// MARK: - Timeline Provider

struct PrayerTimelineProvider: TimelineProvider {
    let appGroupId = "group.com.ayimen.fardh"

    private static let defaultPrayerData = PrayerData(
        fajr: "--:--",
        sunrise: "--:--",
        dhuhr: "--:--",
        asr: "--:--",
        maghrib: "--:--",
        isha: "--:--",
        tomorrowFajr: nil,
        currentPrayer: nil,
        locationName: "Open app to sync",
        lastUpdated: nil,
        accentColor: nil,
        isDarkMode: nil,
        themePrayer: nil,
        timeFormat: nil
    )

    func placeholder(in context: Context) -> PrayerTimelineEntry {
        PrayerTimelineEntry(date: Date(), prayerData: Self.defaultPrayerData)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerTimelineEntry) -> Void) {
        let entry = loadPrayerData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimelineEntry>) -> Void) {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let data = userDefaults.data(forKey: "prayerTimes"),
              let prayerData = try? JSONDecoder().decode(PrayerData.self, from: data) else {
            let entry = PrayerTimelineEntry(date: Date(), prayerData: Self.defaultPrayerData)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
            return
        }

        var entries: [PrayerTimelineEntry] = []
        let now = Date()
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: now)

        // Prayer order for the day
        let prayers: [(name: String, time: String)] = [
            ("Fajr", prayerData.fajr),
            ("Sunrise", prayerData.sunrise),
            ("Dhuhr", prayerData.dhuhr),
            ("Asr", prayerData.asr),
            ("Maghrib", prayerData.maghrib),
            ("Isha", prayerData.isha)
        ]

        // Parse "17:30" to today's Date
        func parseTime(_ timeStr: String) -> Date? {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "HH:mm"
            guard let parsed = formatter.date(from: timeStr) else { return nil }
            let comps = calendar.dateComponents([.hour, .minute], from: parsed)
            return calendar.date(bySettingHour: comps.hour ?? 0, minute: comps.minute ?? 0, second: 0, of: todayStart)
        }

        // Use app's currentPrayer for NOW entry
        entries.append(PrayerTimelineEntry(date: now, prayerData: prayerData))

        // Find index of current prayer for future entries
        var currentPrayerIndex = 0
        for (index, prayer) in prayers.enumerated() {
            if prayer.name == prayerData.currentPrayer {
                currentPrayerIndex = index
                break
            }
        }

        // Create entries for each future prayer transition
        for i in (currentPrayerIndex + 1)..<prayers.count {
            guard let prayerDate = parseTime(prayers[i].time), prayerDate > now else { continue }
            let entryData = PrayerData(
                fajr: prayerData.fajr, sunrise: prayerData.sunrise, dhuhr: prayerData.dhuhr,
                asr: prayerData.asr, maghrib: prayerData.maghrib, isha: prayerData.isha,
                tomorrowFajr: prayerData.tomorrowFajr,
                currentPrayer: prayers[i].name,
                locationName: prayerData.locationName, lastUpdated: prayerData.lastUpdated,
                accentColor: prayerData.accentColor, isDarkMode: prayerData.isDarkMode,
                themePrayer: prayerData.themePrayer,
                timeFormat: prayerData.timeFormat
            )
            entries.append(PrayerTimelineEntry(date: prayerDate, prayerData: entryData))
        }

        // Refresh at midnight for next day's data
        let midnight = calendar.startOfDay(for: now).addingTimeInterval(86400)
        completion(Timeline(entries: entries, policy: .after(midnight)))
    }

    private func loadPrayerData() -> PrayerTimelineEntry {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let data = userDefaults.data(forKey: "prayerTimes"),
              let prayerData = try? JSONDecoder().decode(PrayerData.self, from: data) else {
            return PrayerTimelineEntry(date: Date(), prayerData: Self.defaultPrayerData)
        }
        return PrayerTimelineEntry(date: Date(), prayerData: prayerData)
    }
}

// MARK: - Timeline Entry

struct PrayerTimelineEntry: TimelineEntry {
    let date: Date
    let prayerData: PrayerData
}

// MARK: - Morning Widget View (Fajr, Sunrise, Dhuhr)

struct MorningPrayerWidgetView: View {
    var entry: PrayerTimelineEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // Lock screen rectangular widget
            VStack(alignment: .leading, spacing: 4) {
                LockScreenPrayerRow(name: "Fajr", time: entry.prayerData.formatTime(entry.prayerData.fajr), isActive: entry.prayerData.currentPrayer == "Fajr")
                LockScreenPrayerRow(name: "Sunrise", time: entry.prayerData.formatTime(entry.prayerData.sunrise), isActive: entry.prayerData.currentPrayer == "Sunrise")
                LockScreenPrayerRow(name: "Dhuhr", time: entry.prayerData.formatTime(entry.prayerData.dhuhr), isActive: entry.prayerData.currentPrayer == "Dhuhr")
            }
        case .accessoryInline:
            // Lock screen inline widget
            HStack(spacing: 4) {
                Image(systemName: "sun.horizon.fill")
                Text("\(getCurrentMorningPrayer()): \(getCurrentMorningTime())")
            }
        default:
            EmptyView()
        }
    }

    private func getCurrentMorningPrayer() -> String {
        if entry.prayerData.currentPrayer == "Fajr" { return "Fajr" }
        if entry.prayerData.currentPrayer == "Sunrise" { return "Sunrise" }
        if entry.prayerData.currentPrayer == "Dhuhr" { return "Dhuhr" }
        return "Fajr"
    }

    private func getCurrentMorningTime() -> String {
        if entry.prayerData.currentPrayer == "Fajr" { return entry.prayerData.formatTime(entry.prayerData.fajr) }
        if entry.prayerData.currentPrayer == "Sunrise" { return entry.prayerData.formatTime(entry.prayerData.sunrise) }
        if entry.prayerData.currentPrayer == "Dhuhr" { return entry.prayerData.formatTime(entry.prayerData.dhuhr) }
        return entry.prayerData.formatTime(entry.prayerData.fajr)
    }
}

// MARK: - Evening Widget View (Asr, Maghrib, Isha)

struct EveningPrayerWidgetView: View {
    var entry: PrayerTimelineEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // Lock screen rectangular widget
            VStack(alignment: .leading, spacing: 4) {
                LockScreenPrayerRow(name: "Asr", time: entry.prayerData.formatTime(entry.prayerData.asr), isActive: entry.prayerData.currentPrayer == "Asr")
                LockScreenPrayerRow(name: "Maghrib", time: entry.prayerData.formatTime(entry.prayerData.maghrib), isActive: entry.prayerData.currentPrayer == "Maghrib")
                LockScreenPrayerRow(name: "Isha", time: entry.prayerData.formatTime(entry.prayerData.isha), isActive: entry.prayerData.currentPrayer == "Isha")
            }
        case .accessoryInline:
            // Lock screen inline widget
            HStack(spacing: 4) {
                Image(systemName: "moon.stars.fill")
                Text("\(getCurrentEveningPrayer()): \(getCurrentEveningTime())")
            }
        default:
            EmptyView()
        }
    }

    private func getCurrentEveningPrayer() -> String {
        if entry.prayerData.currentPrayer == "Asr" { return "Asr" }
        if entry.prayerData.currentPrayer == "Maghrib" { return "Maghrib" }
        if entry.prayerData.currentPrayer == "Isha" { return "Isha" }
        return "Asr"
    }

    private func getCurrentEveningTime() -> String {
        if entry.prayerData.currentPrayer == "Asr" { return entry.prayerData.formatTime(entry.prayerData.asr) }
        if entry.prayerData.currentPrayer == "Maghrib" { return entry.prayerData.formatTime(entry.prayerData.maghrib) }
        if entry.prayerData.currentPrayer == "Isha" { return entry.prayerData.formatTime(entry.prayerData.isha) }
        return entry.prayerData.formatTime(entry.prayerData.asr)
    }
}

// MARK: - Lock Screen Prayer Row

struct LockScreenPrayerRow: View {
    let name: String
    let time: String
    let isActive: Bool

    var body: some View {
        HStack {
            Text(name)
                .font(.system(size: 14, weight: isActive ? .bold : .medium))
            Spacer()
            Text(time)
                .font(.system(size: 14, weight: isActive ? .bold : .medium))
        }
        .opacity(isActive ? 1.0 : 0.7)
    }
}

// MARK: - Widget Prayer Row (larger for home screen widgets)

struct WidgetPrayerRow: View {
    let name: String
    let time: String
    let isActive: Bool
    let accentColor: Color
    let textColor: Color
    let secondaryTextColor: Color

    var body: some View {
        HStack(spacing: 4) {
            Text(name)
                .font(.system(size: 16, weight: isActive ? .semibold : .regular))
                .foregroundColor(isActive ? accentColor : textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 4)
            Text(time)
                .font(.system(size: 16, weight: isActive ? .semibold : .regular))
                .foregroundColor(isActive ? accentColor : secondaryTextColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}

// MARK: - All Prayers Widget View (Wide - systemMedium)

struct AllPrayersWidgetView: View {
    var entry: PrayerTimelineEntry
    @Environment(\.colorScheme) var colorScheme

    // Use dark mode for evening prayers (Maghrib, Isha) or if app/system is in dark mode
    // If theme is set, use that prayer for determining dark mode
    private var effectiveIsDark: Bool {
        let prayerForTheme = entry.prayerData.themePrayer ?? entry.prayerData.currentPrayer
        let isEveningPrayer = prayerForTheme == "Maghrib" || prayerForTheme == "Isha"
        return isEveningPrayer || entry.prayerData.isDarkMode ?? (colorScheme == .dark)
    }

    var accentColor: Color {
        if let hex = entry.prayerData.accentColor {
            return Color(hex: hex)
        }
        return PrayerThemeColors.accentColor(for: entry.prayerData.currentPrayer, isDark: effectiveIsDark)
    }

    var backgroundColor: Color {
        effectiveIsDark ? Color(hex: "1a1a2e") : Color.white
    }

    var textColor: Color {
        effectiveIsDark ? Color.white : Color(hex: "1a1a2e")
    }

    var secondaryTextColor: Color {
        effectiveIsDark ? Color.white.opacity(0.7) : Color(hex: "1a1a2e").opacity(0.6)
    }

    var body: some View {
        VStack(spacing: 8) {
            // Header
            Text("Prayer Times")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(accentColor)
                .frame(maxWidth: .infinity, alignment: .center)

            // Prayer times grid
            HStack(spacing: 16) {
                // Left column: Fajr, Sunrise, Dhuhr
                VStack(alignment: .leading, spacing: 8) {
                    WidgetPrayerRow(name: "Fajr", time: entry.prayerData.formatTime(entry.prayerData.fajr), isActive: entry.prayerData.currentPrayer == "Fajr", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                    WidgetPrayerRow(name: "Sunrise", time: entry.prayerData.formatTime(entry.prayerData.sunrise), isActive: entry.prayerData.currentPrayer == "Sunrise", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                    WidgetPrayerRow(name: "Dhuhr", time: entry.prayerData.formatTime(entry.prayerData.dhuhr), isActive: entry.prayerData.currentPrayer == "Dhuhr", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                }
                .frame(maxWidth: .infinity)

                // Right column: Asr, Maghrib, Isha
                VStack(alignment: .leading, spacing: 8) {
                    WidgetPrayerRow(name: "Asr", time: entry.prayerData.formatTime(entry.prayerData.asr), isActive: entry.prayerData.currentPrayer == "Asr", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                    WidgetPrayerRow(name: "Maghrib", time: entry.prayerData.formatTime(entry.prayerData.maghrib), isActive: entry.prayerData.currentPrayer == "Maghrib", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                    WidgetPrayerRow(name: "Isha", time: entry.prayerData.formatTime(entry.prayerData.isha), isActive: entry.prayerData.currentPrayer == "Isha", accentColor: accentColor, textColor: textColor, secondaryTextColor: secondaryTextColor)
                }
                .frame(maxWidth: .infinity)
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .containerBackground(backgroundColor, for: .widget)
    }
}

// MARK: - Upcoming Prayer Widget View

struct UpcomingPrayerWidgetView: View {
    var entry: PrayerTimelineEntry
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.widgetFamily) var family

    // Use dark mode for evening prayers (Maghrib, Isha) or if app/system is in dark mode
    // If theme is set, use that prayer for determining dark mode
    private var effectiveIsDark: Bool {
        let prayerForTheme = entry.prayerData.themePrayer ?? entry.prayerData.currentPrayer
        let isEveningPrayer = prayerForTheme == "Maghrib" || prayerForTheme == "Isha"
        return isEveningPrayer || entry.prayerData.isDarkMode ?? (colorScheme == .dark)
    }

    var accentColor: Color {
        if let hex = entry.prayerData.accentColor {
            return Color(hex: hex)
        }
        return PrayerThemeColors.accentColor(for: entry.prayerData.currentPrayer, isDark: effectiveIsDark)
    }

    var backgroundColor: Color {
        effectiveIsDark ? Color(hex: "1a1a2e") : Color.white
    }

    var textColor: Color {
        effectiveIsDark ? Color.white : Color(hex: "1a1a2e")
    }

    var secondaryTextColor: Color {
        effectiveIsDark ? Color.white.opacity(0.7) : Color(hex: "1a1a2e").opacity(0.6)
    }

    private var currentPrayerName: String {
        entry.prayerData.currentPrayer ?? "--"
    }

    private var currentPrayerTime: String {
        switch entry.prayerData.currentPrayer {
        case "Fajr": return entry.prayerData.formatTime(entry.prayerData.fajr)
        case "Sunrise": return entry.prayerData.formatTime(entry.prayerData.sunrise)
        case "Dhuhr": return entry.prayerData.formatTime(entry.prayerData.dhuhr)
        case "Asr": return entry.prayerData.formatTime(entry.prayerData.asr)
        case "Maghrib": return entry.prayerData.formatTime(entry.prayerData.maghrib)
        case "Isha": return entry.prayerData.formatTime(entry.prayerData.isha)
        default: return "--:--"
        }
    }

    private var prayerIcon: String {
        switch entry.prayerData.currentPrayer {
        case "Fajr": return "sunrise.fill"
        case "Sunrise": return "sun.horizon.fill"
        case "Dhuhr": return "sun.max.fill"
        case "Asr": return "sun.min.fill"
        case "Maghrib": return "sunset.fill"
        case "Isha": return "moon.stars.fill"
        default: return "clock.fill"
        }
    }

    private var nextPrayerName: String {
        switch entry.prayerData.currentPrayer {
        case "Fajr": return "Sunrise"
        case "Sunrise": return "Dhuhr"
        case "Dhuhr": return "Asr"
        case "Asr": return "Maghrib"
        case "Maghrib": return "Isha"
        case "Isha": return "Fajr"
        default: return "--"
        }
    }

    private var nextPrayerTime: String {
        switch entry.prayerData.currentPrayer {
        case "Fajr": return entry.prayerData.formatTime(entry.prayerData.sunrise)
        case "Sunrise": return entry.prayerData.formatTime(entry.prayerData.dhuhr)
        case "Dhuhr": return entry.prayerData.formatTime(entry.prayerData.asr)
        case "Asr": return entry.prayerData.formatTime(entry.prayerData.maghrib)
        case "Maghrib": return entry.prayerData.formatTime(entry.prayerData.isha)
        case "Isha": return entry.prayerData.formatTime(entry.prayerData.tomorrowFajr ?? entry.prayerData.fajr)
        default: return "--:--"
        }
    }

    private var nextPrayerIcon: String {
        switch nextPrayerName {
        case "Fajr": return "sunrise.fill"
        case "Sunrise": return "sun.horizon.fill"
        case "Dhuhr": return "sun.max.fill"
        case "Asr": return "sun.min.fill"
        case "Maghrib": return "sunset.fill"
        case "Isha": return "moon.stars.fill"
        default: return "clock.fill"
        }
    }

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // Lock screen rectangular
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: prayerIcon)
                        .font(.system(size: 14))
                    Text("\(currentPrayerName) \(currentPrayerTime)")
                        .font(.system(size: 16, weight: .bold))
                }
                HStack(spacing: 4) {
                    Image(systemName: nextPrayerIcon)
                        .font(.system(size: 12))
                    Text("\(nextPrayerName) \(nextPrayerTime)")
                        .font(.system(size: 14, weight: .medium))
                }
                .opacity(0.7)
            }
        case .accessoryInline:
            // Lock screen inline
            HStack(spacing: 4) {
                Image(systemName: prayerIcon)
                Text("\(currentPrayerName): \(currentPrayerTime)")
            }
        default:
            // Home screen small widget
            VStack(spacing: 12) {
                Image(systemName: prayerIcon)
                    .font(.system(size: 28))
                    .foregroundColor(accentColor)

                // Current prayer name on one line, time below
                Text(currentPrayerName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(textColor)
                Text(currentPrayerTime)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(accentColor)

                // Next prayer underneath and smaller
                HStack(spacing: 4) {
                    Text(nextPrayerName)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                    Text(nextPrayerTime)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(backgroundColor, for: .widget)
        }
    }
}

// MARK: - Prayer Row Component

struct PrayerRowView: View {
    let name: String
    let time: String
    let isActive: Bool
    let accentColor: Color
    let textColor: Color
    let secondaryTextColor: Color

    var body: some View {
        HStack {
            Text(name)
                .font(.system(size: 15, weight: isActive ? .semibold : .regular))
                .foregroundColor(isActive ? accentColor : textColor)
            Spacer()
            Text(time)
                .font(.system(size: 15, weight: isActive ? .semibold : .regular))
                .foregroundColor(isActive ? accentColor : secondaryTextColor)
        }
    }
}

// MARK: - Prayer Theme Colors

struct PrayerThemeColors {
    static func accentColor(for prayer: String?, isDark: Bool) -> Color {
        switch prayer {
        case "Fajr":
            return Color(hex: "568FAF")
        case "Sunrise":
            return Color(hex: "ff9a13")
        case "Dhuhr":
            return Color(hex: "55bddf")
        case "Asr":
            return Color(hex: "ff9a13")
        case "Maghrib":
            return Color(hex: "9B59B6")
        case "Isha":
            return Color(hex: "854ab4")
        default:
            return isDark ? Color(hex: "7EB8D8") : Color(hex: "568FAF")
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Widget Configurations

struct MorningPrayerWidget: Widget {
    let kind: String = "MorningPrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimelineProvider()) { entry in
            MorningPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Morning Prayers")
        .description("Fajr, Sunrise, and Dhuhr times")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

struct EveningPrayerWidget: Widget {
    let kind: String = "EveningPrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimelineProvider()) { entry in
            EveningPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Evening Prayers")
        .description("Asr, Maghrib, and Isha times")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

struct AllPrayersWidget: Widget {
    let kind: String = "AllPrayersWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimelineProvider()) { entry in
            AllPrayersWidgetView(entry: entry)
        }
        .configurationDisplayName("All Prayers")
        .description("All prayer times in one widget")
        .supportedFamilies([.systemMedium])
    }
}

struct UpcomingPrayerWidget: Widget {
    let kind: String = "UpcomingPrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimelineProvider()) { entry in
            UpcomingPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Current Prayer")
        .description("Shows the current prayer time")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryInline,
            .systemSmall
        ])
    }
}

// MARK: - Widget Bundle

@main
struct PrayerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MorningPrayerWidget()
        EveningPrayerWidget()
        AllPrayersWidget()
        UpcomingPrayerWidget()
    }
}

// MARK: - Previews

#Preview("Morning Widget", as: .accessoryRectangular) {
    MorningPrayerWidget()
} timeline: {
    PrayerTimelineEntry(
        date: Date(),
        prayerData: PrayerData(
            fajr: "5:30 AM",
            sunrise: "6:45 AM",
            dhuhr: "12:30 PM",
            asr: "3:45 PM",
            maghrib: "6:15 PM",
            isha: "7:45 PM",
            tomorrowFajr: "5:32 AM",
            currentPrayer: "Fajr",
            locationName: "Seattle, WA",
            lastUpdated: nil,
            accentColor: "#568FAF",
            isDarkMode: false,
            themePrayer: nil,
            timeFormat: "24h"
        )
    )
}

#Preview("Evening Widget", as: .accessoryRectangular) {
    EveningPrayerWidget()
} timeline: {
    PrayerTimelineEntry(
        date: Date(),
        prayerData: PrayerData(
            fajr: "5:30 AM",
            sunrise: "6:45 AM",
            dhuhr: "12:30 PM",
            asr: "3:45 PM",
            maghrib: "6:15 PM",
            isha: "7:45 PM",
            tomorrowFajr: "5:32 AM",
            currentPrayer: "Maghrib",
            locationName: "Seattle, WA",
            lastUpdated: nil,
            accentColor: "#C39BD3",
            isDarkMode: true,
            themePrayer: nil,
            timeFormat: "24h"
        )
    )
}

#Preview("All Prayers Widget", as: .systemMedium) {
    AllPrayersWidget()
} timeline: {
    PrayerTimelineEntry(
        date: Date(),
        prayerData: PrayerData(
            fajr: "5:30 AM",
            sunrise: "6:45 AM",
            dhuhr: "12:30 PM",
            asr: "3:45 PM",
            maghrib: "6:15 PM",
            isha: "7:45 PM",
            tomorrowFajr: "5:32 AM",
            currentPrayer: "Dhuhr",
            locationName: "Seattle, WA",
            lastUpdated: nil,
            accentColor: "#55bddf",
            isDarkMode: false,
            themePrayer: nil,
            timeFormat: "24h"
        )
    )
}

#Preview("Current Prayer Widget", as: .systemSmall) {
    UpcomingPrayerWidget()
} timeline: {
    PrayerTimelineEntry(
        date: Date(),
        prayerData: PrayerData(
            fajr: "5:30 AM",
            sunrise: "6:45 AM",
            dhuhr: "12:30 PM",
            asr: "3:45 PM",
            maghrib: "6:15 PM",
            isha: "7:45 PM",
            tomorrowFajr: "5:32 AM",
            currentPrayer: "Asr",
            locationName: "Seattle, WA",
            lastUpdated: nil,
            accentColor: "#ff9a13",
            isDarkMode: false,
            themePrayer: nil,
            timeFormat: "24h"
        )
    )
}
