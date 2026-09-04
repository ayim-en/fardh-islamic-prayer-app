import { AnimatedCrossfadeImage } from "@/components/AnimatedCrossfadeImage";
import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import { CalendarSettingsComponent } from "@/components/CalendarSettings";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PermissionsSettings } from "@/components/PermissionsSettings";
import { PrayerTimesSettings } from "@/components/PrayerTimesSettings";
import { ThemesSettings } from "@/components/ThemesSettings";
import {
  Prayers,
  darkModeColors,
  lightModeColors,
  prayerBackgrounds,
} from "@/constants/prayers";
import { useCalendarSettings } from "@/context/CalendarSettingsContext";
import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { usePrayerSettings } from "@/context/PrayerSettingsContext";
import { useThemeColors } from "@/context/ThemeContext";
import { useWalkthrough } from "@/context/WalkthroughContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SectionList,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import {
  getScheduledNotifications,
  sendTestNotification,
} from "@/utils/notificationService";
import * as Notifications from "expo-notifications";
import Animated from "react-native-reanimated";

const CHECK_NOTIFICATIONS_LABEL = "Check Scheduled Notifications";
type NotificationData = { date?: string; prayer?: string; type?: string };

const getNotificationData = (
  notification: Notifications.NotificationRequest,
): NotificationData => (notification.content.data as NotificationData) ?? {};

// Sort key: prayer notifications sort by date then by prayer order within
// the day; notifications without a tracked date (e.g. the day-9 reminder)
// sort last.
const getNotificationSortKey = (
  notification: Notifications.NotificationRequest,
): string => {
  const data = getNotificationData(notification);
  if (!data.date) return "9999-99-99-99";

  const prayerIndex = Prayers.indexOf(data.prayer as (typeof Prayers)[number]);
  const prayerRank = prayerIndex === -1 ? Prayers.length : prayerIndex;
  return `${data.date}-${String(prayerRank).padStart(2, "0")}`;
};

const formatNotificationSubtitle = (
  notification: Notifications.NotificationRequest,
): string => {
  const data = getNotificationData(notification);
  if (!data.date) return "Reminder";

  const [year, month, day] = data.date.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );
  // Title format is "{Prayer} At {formattedTime}"
  const timeLabel = notification.content.title?.split(" At ")[1];
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
};

const DebugSettings = ({
  resetWalkthrough,
}: {
  resetWalkthrough: () => void;
}) => {
  const { colors, isDarkMode } = useThemeColors();
  const [scheduledNotifications, setScheduledNotifications] = useState<
    Notifications.NotificationRequest[] | null
  >(null);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);

  const textColor = isDarkMode
    ? darkModeColors.textSecondary
    : lightModeColors.textSecondary;

  const rows: { label: string; onPress: () => void }[] = [
    {
      label: "Send Test Notification",
      onPress: async () => {
        await sendTestNotification();
        Alert.alert("Debug", "Test notification fires in 5 seconds.");
      },
    },
    {
      label: CHECK_NOTIFICATIONS_LABEL,
      onPress: async () => {
        if (isNotificationsExpanded) {
          setIsNotificationsExpanded(false);
          return;
        }

        const notifications = await getScheduledNotifications();
        const sorted = [...notifications].sort((a, b) =>
          getNotificationSortKey(a).localeCompare(getNotificationSortKey(b)),
        );
        setScheduledNotifications(sorted);
        setIsNotificationsExpanded(true);
      },
    },
    {
      label: "Reset Walkthrough",
      onPress: () => {
        resetWalkthrough();
      },
    },
  ];

  return (
    <View className="gap-1">
      {rows.map((row, i) => {
        const isNotificationsRow = row.label === CHECK_NOTIFICATIONS_LABEL;

        return (
          <View
            key={row.label}
            style={
              i < rows.length - 1
                ? {
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                  }
                : undefined
            }
          >
            <TouchableOpacity
              onPress={row.onPress}
              className="py-3 px-1 flex-row justify-between items-center"
            >
              <Animated.Text
                className="text-base"
                style={{ color: colors.active }}
              >
                {row.label}
              </Animated.Text>
              {isNotificationsRow && scheduledNotifications !== null && (
                <Animated.Text className="text-sm" style={{ color: textColor }}>
                  {scheduledNotifications.length} scheduled
                </Animated.Text>
              )}
            </TouchableOpacity>
            {isNotificationsRow &&
              isNotificationsExpanded &&
              scheduledNotifications && (
                <View className="pb-3 gap-2">
                  {scheduledNotifications.length === 0 ? (
                    <Animated.Text
                      className="text-sm px-1"
                      style={{ color: textColor }}
                    >
                      No notifications scheduled.
                    </Animated.Text>
                  ) : (
                    scheduledNotifications.map((notification) => (
                      <View key={notification.identifier} className="px-1">
                        <Animated.Text
                          className="text-sm font-medium"
                          style={{ color: colors.active }}
                        >
                          {notification.content.title}
                        </Animated.Text>
                        <Animated.Text
                          className="text-xs"
                          style={{ color: textColor }}
                        >
                          {formatNotificationSubtitle(notification)}
                        </Animated.Text>
                      </View>
                    ))
                  )}
                </View>
              )}
          </View>
        );
      })}
    </View>
  );
};

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SettingsItem = {
  id: string;
  content: React.ReactNode;
};

type SettingsSection = {
  id: string;
  title: string;
  icon: any;
  data: SettingsItem[];
};

type PickerType = "method" | "school" | "latitude" | "tune" | "calendarMethod";

export default function SettingsHome() {
  const {
    colors,
    isDarkMode,
    currentPrayer,
    themePrayer,
    setThemePrayer,
    appIcon,
    setAppIcon,
  } = useThemeColors();
  const { settings, updateSettings, updateAllTune } = usePrayerSettings();
  const { settings: calendarSettings, updateSettings: updateCalendarSettings } =
    useCalendarSettings();
  const {
    masterToggle,
    toggleMasterNotifications,
    adhanMasterToggle,
    toggleAdhanMaster,
    adhanEnabled,
    toggleAdhan,
  } = useNotificationSettings();
  const { resetWalkthrough } = useWalkthrough();
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const debugTapCount = useRef(0);
  const debugTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAboutIconTap = useCallback(() => {
    debugTapCount.current += 1;
    if (debugTapTimer.current) clearTimeout(debugTapTimer.current);
    if (debugTapCount.current >= 5) {
      debugTapCount.current = 0;
      setDebugUnlocked((prev) => !prev);
    } else {
      debugTapTimer.current = setTimeout(() => {
        debugTapCount.current = 0;
      }, 2000);
    }
  }, []);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [expandedPickers, setExpandedPickers] = useState<Set<PickerType>>(
    new Set(),
  );

  const togglePicker = useCallback((picker: PickerType) => {
    setExpandedPickers((prev) => {
      const next = new Set(prev);
      if (next.has(picker)) {
        next.delete(picker);
      } else {
        next.add(picker);
      }
      return next;
    });
  }, []);

  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;

  // Get the background image based on theme prayer or current prayer (null if not loaded yet)
  const displayPrayer = themePrayer || currentPrayer;
  const backgroundImage = displayPrayer
    ? prayerBackgrounds[displayPrayer] || null
    : null;
  const textColor = isDarkMode ? darkModeColors.text : lightModeColors.text;
  const secondaryTextColor = isDarkMode
    ? darkModeColors.textSecondary
    : lightModeColors.textSecondary;
  const separatorColor = isDarkMode
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.08)";

  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
  const animatedTextStyle = useAnimatedTextColor(textColor);
  const animatedSecondaryTextStyle = useAnimatedTextColor(secondaryTextColor);
  const animatedActiveTextStyle = useAnimatedTextColor(colors.active);
  const animatedSelectedBgStyle = useAnimatedBackgroundColor(
    colors.active + "20",
  );
  const animatedSeparatorStyle = useAnimatedBackgroundColor(separatorColor);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const sections: SettingsSection[] = useMemo(
    () => [
      {
        id: "prayer-times",
        title: "Prayer Times",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-prayer-times.png"),
        data: [
          {
            id: "prayer-times-content",
            content: (
              <PrayerTimesSettings
                settings={settings}
                updateSettings={updateSettings}
                updateAllTune={updateAllTune}
                expandedPickers={expandedPickers as Set<string>}
                togglePicker={togglePicker as (picker: string) => void}
                colors={colors}
                animatedTextStyle={animatedTextStyle}
                animatedActiveTextStyle={animatedActiveTextStyle}
                animatedSecondaryTextStyle={animatedSecondaryTextStyle}
                animatedSeparatorStyle={animatedSeparatorStyle}
              />
            ),
          },
        ],
      },
      {
        id: "themes",
        title: "Themes",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-theme.png"),
        data: [
          {
            id: "themes-content",
            content: (
              <ThemesSettings
                themePrayer={themePrayer}
                setThemePrayer={setThemePrayer}
                appIcon={appIcon}
                setAppIconPref={setAppIcon}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            ),
          },
        ],
      },
      {
        id: "notifications",
        title: "Notifications",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-notifications.png"),
        data: [
          {
            id: "notifications-content",
            content: (
              <NotificationSettings
                masterToggle={masterToggle}
                toggleMasterNotifications={toggleMasterNotifications}
                adhanMasterToggle={adhanMasterToggle}
                toggleAdhanMaster={toggleAdhanMaster}
                adhanEnabled={adhanEnabled}
                toggleAdhan={toggleAdhan}
                colors={colors}
                animatedTextStyle={animatedTextStyle}
                animatedSecondaryTextStyle={animatedSecondaryTextStyle}
                animatedSeparatorStyle={animatedSeparatorStyle}
              />
            ),
          },
        ],
      },
      {
        id: "permissions",
        title: "Permissions",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-permissions.png"),
        data: [
          {
            id: "permissions-content",
            content: (
              <PermissionsSettings
                colors={colors}
                animatedTextStyle={animatedTextStyle}
                animatedSecondaryTextStyle={animatedSecondaryTextStyle}
                animatedSeparatorStyle={animatedSeparatorStyle}
              />
            ),
          },
        ],
      },
      {
        id: "calendar",
        title: "Calendar",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-calendar.png"),
        data: [
          {
            id: "calendar-content",
            content: (
              <CalendarSettingsComponent
                settings={calendarSettings}
                updateSettings={updateCalendarSettings}
                expandedPickers={expandedPickers as Set<string>}
                togglePicker={togglePicker as (picker: string) => void}
                colors={colors}
                animatedTextStyle={animatedTextStyle}
                animatedActiveTextStyle={animatedActiveTextStyle}
                animatedSecondaryTextStyle={animatedSecondaryTextStyle}
                animatedSeparatorStyle={animatedSeparatorStyle}
              />
            ),
          },
        ],
      },
      {
        id: "about",
        title: "About",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-about.png"),
        data: [
          {
            id: "about-content",
            content: (
              <View className="gap-4">
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Our Mission{"\n"}
                  </Animated.Text>
                  Fardh simplifies Islamic daily prayer through modern,
                  minimalist design. We are committed to an ad-free experience
                  that never sells or shares your personal data.
                </Animated.Text>
                <View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Animated.Text
                      className="font-semibold text-base"
                      style={animatedTextStyle}
                    >
                      Ayimen Hussien
                    </Animated.Text>
                    <Pressable
                      onPress={() =>
                        Linking.openURL("https://www.linkedin.com/in/ayim-en/")
                      }
                    >
                      <AnimatedTintIcon
                        source={require("../../../assets/images/prayer-pro-icons/settings-tab/about-linkedin.png")}
                        size={18}
                        tintColor={colors.active}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Linking.openURL("https://github.com/ayim-en")
                      }
                    >
                      <AnimatedTintIcon
                        source={require("../../../assets/images/prayer-pro-icons/settings-tab/about-github.png")}
                        size={18}
                        tintColor={colors.active}
                      />
                    </Pressable>
                  </View>
                  <Animated.Text
                    className="text-base leading-6"
                    style={animatedSecondaryTextStyle}
                  >
                    Recent graduate of Seattle University with a degree in
                    Computer Science, now seeking opportunities as a Software
                    Engineer.
                  </Animated.Text>
                </View>
                <View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Animated.Text
                      className="font-semibold text-base"
                      style={animatedTextStyle}
                    >
                      Abdulnasser Hussien
                    </Animated.Text>
                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          "https://www.linkedin.com/in/abdulnasserhussien/",
                        )
                      }
                    >
                      <AnimatedTintIcon
                        source={require("../../../assets/images/prayer-pro-icons/settings-tab/about-linkedin.png")}
                        size={18}
                        tintColor={colors.active}
                      />
                    </Pressable>
                  </View>
                  <Animated.Text
                    className="text-base leading-6"
                    style={animatedSecondaryTextStyle}
                  >
                    Recent graduate of the University of Washington with a
                    degree in Management Information Systems, now seeking
                    opportunities as a Product Manager.
                  </Animated.Text>
                </View>
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Source Code{"\n"}
                  </Animated.Text>
                  This is an open source project hosted on GitHub. Feel free to
                  take a look{" "}
                  <Animated.Text
                    className="font-semibold"
                    style={animatedActiveTextStyle}
                    onPress={() =>
                      Linking.openURL(
                        "https://github.com/ayim-en/fardh-islamic-prayer-app",
                      )
                    }
                  >
                    here
                  </Animated.Text>
                  !
                </Animated.Text>
              </View>
            ),
          },
        ],
      },
      ...(debugUnlocked
        ? [
            {
              id: "debug",
              title: "Debug",
              icon: require("../../../assets/images/prayer-pro-icons/bottom-tab/icon-settings.png"),
              data: [
                {
                  id: "debug-content",
                  content: (
                    <DebugSettings resetWalkthrough={resetWalkthrough} />
                  ),
                },
              ],
            },
          ]
        : []),
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        icon: require("../../../assets/images/prayer-pro-icons/settings-tab/settings-privacy.png"),
        data: [
          {
            id: "privacy-policy-content",
            content: (
              <View className="gap-4">
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Location Data{"\n"}
                  </Animated.Text>
                  Fardh uses your device&apos;s location solely to calculate
                  accurate prayer times and Qibla direction for your area. Your
                  location is sent to{" "}
                  <Animated.Text
                    className="font-semibold"
                    style={animatedActiveTextStyle}
                    onPress={() => Linking.openURL("https://aladhan.com/")}
                  >
                    aladhan.com
                  </Animated.Text>{" "}
                  to fetch prayer times. We do not store your location data.
                </Animated.Text>
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Local Storage{"\n"}
                  </Animated.Text>
                  Your preferences (theme, calculation method, notifications)
                  are stored locally on your device. This data never leaves your
                  phone.
                </Animated.Text>
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Sharing & Tracking{"\n"}
                  </Animated.Text>
                  Fardh contains no advertising SDKs or third-party trackers. We
                  do not sell or share any personal information.
                </Animated.Text>
                <Animated.Text
                  className="text-base leading-6"
                  style={animatedSecondaryTextStyle}
                >
                  <Animated.Text
                    className="font-semibold"
                    style={animatedTextStyle}
                  >
                    Third-Party Services{"\n"}
                  </Animated.Text>
                  Prayer times and Islamic calendar data are provided by{" "}
                  <Animated.Text
                    className="font-semibold"
                    style={animatedActiveTextStyle}
                    onPress={() => Linking.openURL("https://aladhan.com/")}
                  >
                    aladhan.com
                  </Animated.Text>
                  . Please refer to their privacy policy for information on how
                  they handle requests.
                </Animated.Text>
              </View>
            ),
          },
        ],
      },
    ],
    [
      settings,
      updateSettings,
      updateAllTune,
      expandedPickers,
      togglePicker,
      colors,
      animatedTextStyle,
      animatedActiveTextStyle,
      animatedSecondaryTextStyle,
      animatedSeparatorStyle,
      themePrayer,
      setThemePrayer,
      appIcon,
      setAppIcon,
      isDarkMode,
      masterToggle,
      toggleMasterNotifications,
      adhanMasterToggle,
      toggleAdhanMaster,
      adhanEnabled,
      toggleAdhan,
      calendarSettings,
      updateCalendarSettings,
      debugUnlocked,
      resetWalkthrough,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SettingsSection }) => {
      const isExpanded = expandedSections.has(section.id);
      const isAbout = section.id === "about";

      const iconBadge = (
        <Animated.View
          className="w-10 h-10 rounded-lg items-center justify-center mr-3"
          style={animatedSelectedBgStyle}
        >
          <AnimatedTintIcon
            source={section.icon}
            size={22}
            tintColor={colors.active}
          />
        </Animated.View>
      );

      return (
        <Pressable
          onPress={() => toggleSection(section.id)}
          className="mx-4 mt-2"
        >
          {({ pressed }) => (
            <View
              className="flex-row items-center p-4"
              style={{ opacity: pressed ? 0.7 : 1 }}
            >
              {isAbout ? (
                <Pressable onPress={handleAboutIconTap} hitSlop={8}>
                  {iconBadge}
                </Pressable>
              ) : (
                iconBadge
              )}
              <Animated.Text
                className="flex-1 text-2xl font-medium"
                style={animatedTextStyle}
              >
                {section.title}
              </Animated.Text>
              <Animated.View
                style={{
                  transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                }}
              >
                <AnimatedTintIcon
                  source={require("../../../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
                  size={18}
                  tintColor={colors.active}
                />
              </Animated.View>
            </View>
          )}
        </Pressable>
      );
    },
    [
      expandedSections,
      animatedSelectedBgStyle,
      colors.active,
      animatedTextStyle,
      toggleSection,
      handleAboutIconTap,
    ],
  );

  const renderItem = useCallback(
    ({ item, section }: { item: SettingsItem; section: SettingsSection }) => {
      const isExpanded = expandedSections.has(section.id);

      if (!isExpanded) return null;

      return <View className="mx-4 mt-1 py-3 px-4">{item.content}</View>;
    },
    [expandedSections],
  );

  const SectionSeparator = useCallback(
    ({ leadingItem }: { leadingItem: any }) =>
      leadingItem ? (
        <Animated.View
          className="mx-6 my-2"
          style={[{ height: 1 }, animatedSeparatorStyle]}
        />
      ) : null,
    [animatedSeparatorStyle],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <AnimatedCrossfadeImage source={backgroundImage} resizeMode="cover" />
      <View className="pt-32 pb-4 items-center px-4">
        <Animated.Text
          className="text-8xl font-bold text-white"
          style={{
            textShadowColor: "rgba(0,0,0,0.4)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          Settings
        </Animated.Text>
      </View>

      <Animated.View
        className="flex-1 rounded-t-3xl overflow-hidden mt-8"
        style={animatedBgStyle}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          SectionSeparatorComponent={SectionSeparator}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
        />
      </Animated.View>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
        style={[{ height: 10 }, animatedBgStyle]}
      />
    </View>
  );
}
