import { AnimatedCrossfadeImage } from "@/components/AnimatedCrossfadeImage";
import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import { CalendarSettingsComponent } from "@/components/CalendarSettings";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PermissionsSettings } from "@/components/PermissionsSettings";
import { PrayerTimesSettings } from "@/components/PrayerTimesSettings";
import { ThemesSettings } from "@/components/ThemesSettings";
import {
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
import React, { useCallback, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  SectionList,
  UIManager,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

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
  const { colors, isDarkMode, currentPrayer, themePrayer, setThemePrayer, appIcon, setAppIcon } =
    useThemeColors();
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [expandedPickers, setExpandedPickers] = useState<Set<PickerType>>(
    new Set()
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
    colors.active + "20"
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

  const sections: SettingsSection[] = [
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
                Fardh simplifies Islamic daily prayer through modern, minimalist
                design. We are committed to an ad-free experience that never
                sells or shares your personal data.
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
                  Current senior at Seattle University studying Computer Science
                  with aspirations of becoming a Software Engineer.
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
                        "https://www.linkedin.com/in/abdulnasserhussien/"
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
                  Current senior at the University of Washington studying
                  Management Information Systems with the hopes of becoming a
                  Product Manager.
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
                      "https://github.com/ayim-en/fardh-islamic-prayer-app"
                    )
                  }
                >
                  here
                </Animated.Text>
                !
              </Animated.Text>
              <Pressable
                onPress={resetWalkthrough}
                className="mt-2 py-3 px-4 rounded-xl items-center"
                style={{ backgroundColor: colors.active }}
              >
                <Animated.Text className="text-white text-base font-semibold">
                  Replay Walkthrough
                </Animated.Text>
              </Pressable>
            </View>
          ),
        },
      ],
    },
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
                Your preferences (theme, calculation method, notifications) are
                stored locally on your device. This data never leaves your
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
  ];

  const renderSectionHeader = ({ section }: { section: SettingsSection }) => {
    const isExpanded = expandedSections.has(section.id);

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
  };

  const renderItem = ({
    item,
    section,
  }: {
    item: SettingsItem;
    section: SettingsSection;
  }) => {
    const isExpanded = expandedSections.has(section.id);

    if (!isExpanded) return null;

    return <View className="mx-4 mt-1 py-3 px-4">{item.content}</View>;
  };

  const SectionSeparator = useCallback(
    ({ leadingItem }: { leadingItem: any }) =>
      leadingItem ? (
        <Animated.View
          className="mx-6 my-2"
          style={[{ height: 1 }, animatedSeparatorStyle]}
        />
      ) : null,
    [animatedSeparatorStyle]
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
    </View>
  );
}
