import {
  darkModeColors,
  lightModeColors,
  Prayer,
  Prayers,
  prayerThemeColors,
} from "@/constants/prayers";
import { AppIconType } from "@/context/ThemeContext";
import { setAppIcon } from "expo-dynamic-app-icon";
import React, { useCallback, useState } from "react";
import { Image, Platform, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

interface ThemesSettingsProps {
  themePrayer: Prayer | null;
  setThemePrayer: (prayer: Prayer | null) => void;
  appIcon: AppIconType;
  setAppIconPref: (icon: AppIconType) => void;
  colors: { active: string; inactive: string };
  isDarkMode: boolean;
}

const iconOptions: { id: AppIconType; label: string; image: any }[] = [
  {
    id: "default",
    label: "Default",
    image: require("../assets/images/fardh-icon.png"),
  },
  {
    id: "light",
    label: "Light",
    image: require("../assets/images/fardh-light.png"),
  },
  {
    id: "dark",
    label: "Dark",
    image: require("../assets/images/fardh-dark.png"),
  },
];

export const ThemesSettings = ({
  themePrayer,
  setThemePrayer,
  appIcon,
  setAppIconPref,
  colors,
  isDarkMode,
}: ThemesSettingsProps) => {
  // Local state for unsaved changes
  const [localTheme, setLocalTheme] = useState<Prayer | null>(themePrayer);
  const [localIcon, setLocalIcon] = useState<AppIconType>(appIcon);

  // Check if there are unsaved changes
  const hasUnsavedChanges = localTheme !== themePrayer || localIcon !== appIcon;

  // Save changes
  const saveChanges = useCallback(async () => {
    setThemePrayer(localTheme);
    setAppIconPref(localIcon);

    // Apply icon change on iOS
    if (Platform.OS === "ios" && localIcon !== appIcon) {
      try {
        // For default, pass null to reset; for alternate icons, pass the icon name
        if (localIcon === "default") {
          setAppIcon(null as unknown as string);
        } else {
          setAppIcon(localIcon);
        }
      } catch {
        // Icon change not available
      }
    }
  }, [localTheme, localIcon, setThemePrayer, setAppIconPref, appIcon]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setLocalTheme(themePrayer);
    setLocalIcon(appIcon);
  }, [themePrayer, appIcon]);

  return (
    <View className="gap-4">
      {/* Theme selection */}
      <View className="gap-2">
        <Animated.Text
          className="text-sm font-semibold"
          style={{
            color: isDarkMode
              ? darkModeColors.textSecondary
              : lightModeColors.textSecondary,
          }}
        >
          App Theme
        </Animated.Text>
        <View className="flex-row flex-wrap gap-2">
          {/* Auto option */}
          <TouchableOpacity
            onPress={() => setLocalTheme(null)}
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: !localTheme
                ? colors.active
                : isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <Animated.Text
              className="font-semibold"
              style={{
                color: !localTheme
                  ? "#fff"
                  : isDarkMode
                  ? darkModeColors.textSecondary
                  : lightModeColors.textSecondary,
              }}
            >
              Auto
            </Animated.Text>
          </TouchableOpacity>
          {/* Prayer theme options */}
          {Prayers.map((prayer) => {
            const isSelected = localTheme === prayer;
            const themeColor = prayerThemeColors[prayer].active;
            return (
              <TouchableOpacity
                key={prayer}
                onPress={() => setLocalTheme(prayer)}
                className="rounded-xl px-4 py-3"
                style={{
                  backgroundColor: isSelected
                    ? themeColor
                    : isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                }}
              >
                <Animated.Text
                  className="font-semibold"
                  style={{
                    color: isSelected ? "#fff" : themeColor,
                  }}
                >
                  {prayer}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Separator */}
      <View
        style={{
          height: 1,
          backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.08)",
        }}
      />

      {/* App Icon subsection */}
      <View className="gap-2">
        <Animated.Text
          className="text-sm font-semibold"
          style={{
            color: isDarkMode
              ? darkModeColors.textSecondary
              : lightModeColors.textSecondary,
          }}
        >
          App Icon
        </Animated.Text>
        <View className="flex-row flex-wrap gap-3">
          {iconOptions.map((option) => {
            const isSelected = localIcon === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setLocalIcon(option.id)}
                className="items-center"
              >
                <View className="mb-2">
                  <Image
                    source={option.image}
                    className="w-16 h-16 rounded-xl"
                    resizeMode="cover"
                    style={{
                      borderWidth: 3,
                      borderColor: isSelected ? colors.active : "transparent",
                      borderRadius: 16,
                    }}
                  />
                </View>
                <Animated.Text
                  className="text-sm font-medium"
                  style={{
                    color: isSelected
                      ? colors.active
                      : isDarkMode
                      ? darkModeColors.textSecondary
                      : lightModeColors.textSecondary,
                  }}
                >
                  {option.label}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save/Discard buttons */}
      {hasUnsavedChanges && (
        <View className="flex-row justify-center gap-3 mt-2">
          <TouchableOpacity
            onPress={discardChanges}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.active + "20" }}
          >
            <Animated.Text
              className="font-medium"
              style={{
                color: isDarkMode
                  ? darkModeColors.textSecondary
                  : lightModeColors.textSecondary,
              }}
            >
              Discard
            </Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveChanges}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.active }}
          >
            <Animated.Text className="font-medium text-white">
              Save Changes
            </Animated.Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
