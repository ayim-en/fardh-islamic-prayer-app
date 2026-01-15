import {
  darkModeColors,
  lightModeColors,
  prayerBackgrounds,
} from "@/constants/prayers";
import { TimeFormat } from "@/constants/prayerSettings";
import { useThemeColors } from "@/context/ThemeContext";
import { useAnimatedBackgroundColor } from "@/hooks/useAnimatedColor";
import { formatTimeWithPreference } from "@/utils/prayerHelpers";
import React from "react";
import { Dimensions, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedCrossfadeImage } from "./AnimatedCrossfadeImage";

const { height } = Dimensions.get("window");

interface CurrentPrayerHeaderProps {
  currentPrayer: { prayer: string; time: string } | null;
  locationName: string;
  timeFormat?: TimeFormat;
}

export const PrayerHeader = ({
  currentPrayer,
  locationName,
  timeFormat = "24h",
}: CurrentPrayerHeaderProps) => {
  const { isDarkMode, themePrayer } = useThemeColors();
  // Get the background image based on theme prayer (if set) or current prayer (null if not loaded yet)
  const displayPrayer = themePrayer || currentPrayer?.prayer;
  const backgroundImage = displayPrayer
    ? prayerBackgrounds[displayPrayer] || null
    : null;

  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);

  return (
    <>
      <AnimatedCrossfadeImage source={backgroundImage} resizeMode="cover" />

      <View className="absolute left-0 right-0 justify-center items-center pt-28">
        <Text
          className="font-extrabold text-4xl text-white"
          style={{
            textShadowColor: "rgba(0,0,0,0.4)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}
        >
          {currentPrayer
            ? currentPrayer.prayer === "Sunrise"
              ? "Current: Sunrise"
              : `Current Prayer: ${currentPrayer.prayer}`
            : "Loading prayer times..."}
        </Text>
        <Text
          className="font-extrabold text-white text-[110px]"
          style={{
            textShadowColor: "rgba(0,0,0,0.4)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
            width: "100%",
            textAlign: "center",
            paddingHorizontal: 16,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {currentPrayer ? formatTimeWithPreference(currentPrayer.time, timeFormat) : "--:--"}
        </Text>
        {/* <View className="flex-row items-center gap-2">
          <Text
            className="text-3xl font-extrabold text-white"
            style={{
              textShadowColor: "rgba(0,0,0,0.4)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            {locationName}
          </Text>
          <Icon
            source={require("../assets/images/prayer-pro-icons/home-page/icon-location.png")}
            size={20}
            tintColor="white"
          />
        </View> */}
      </View>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
        style={[{ height: height * 0.5 }, animatedBgStyle]}
      />
    </>
  );
};
