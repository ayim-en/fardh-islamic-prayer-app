import { darkModeColors, lightModeColors } from "@/constants/prayers";
import { useThemeColors } from "@/context/ThemeContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import React from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedCrossfadeImage } from "./AnimatedCrossfadeImage";
import { AnimatedTintIcon } from "./AnimatedTintIcon";

const { height } = Dimensions.get("window");

interface QiblaHeaderProps {
  qiblaDirection: number | null;
  locationName: string;
  backgroundImage: any | null;
  currentPrayer?: { prayer: string } | null;
  onRefreshLocation?: () => void;
}

export const QiblaHeader = ({
  qiblaDirection,
  locationName,
  backgroundImage,
  currentPrayer,
  onRefreshLocation,
}: QiblaHeaderProps) => {
  const { isDarkMode, colors } = useThemeColors();

  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
  const animatedPillBgStyle = useAnimatedBackgroundColor(bgColor);
  const animatedTextStyle = useAnimatedTextColor(colors.active);

  return (
    <>
      <AnimatedCrossfadeImage source={backgroundImage} resizeMode="cover" />

      {/* White/Dark rounded section */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
        style={[{ height: height * 0.455 }, animatedBgStyle]}
      />
      {/* Location display */}
      <View className="absolute top-16 left-6">
        <Animated.View
          className="flex-row items-center gap-2 rounded-full px-4 py-2"
          style={animatedPillBgStyle}
        >
          <AnimatedTintIcon
            source={require("../assets/images/prayer-pro-icons/home-page/icon-location.png")}
            size={18}
            tintColor={colors.active}
          />
          <Animated.Text
            className="font-bold text-2xl"
            style={[animatedTextStyle, { flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {locationName}
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Refresh location button */}
      <View className="absolute top-16 right-6">
        <TouchableOpacity onPress={onRefreshLocation} activeOpacity={0.7}>
          <Animated.View
            className="rounded-full p-3"
            style={animatedPillBgStyle}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/qibla-tab/qibla-refresh.png")}
              size={22}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
};
