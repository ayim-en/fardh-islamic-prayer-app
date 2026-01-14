import { QiblaCompass } from "@/components/QiblaCompass";
import { QiblaHeader } from "@/components/QiblaHeader";
import {
  darkModeColors,
  lightModeColors,
  prayerBackgrounds,
  prayerThemeColors,
} from "@/constants/prayers";
import { useThemeColors } from "@/context/ThemeContext";
import { useAnimatedTextColor } from "@/hooks/useAnimatedColor";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";
import { useLocation } from "@/hooks/useLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useQiblaDirection } from "@/hooks/useQiblaDirection";
import { useIsFocused } from "@react-navigation/native";
import { DeviceMotion } from "expo-sensors";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Text, Vibration, View } from "react-native";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";

type GuidanceKey = "kaaba" | "left" | "right";

// Guidance text component that reacts to heading changes
const GuidanceText = ({
  qiblaDirection,
  deviceHeading,
  animatedInactiveTextStyle,
  animatedActiveTextStyle,
}: {
  qiblaDirection: number;
  deviceHeading: SharedValue<number>;
  animatedInactiveTextStyle: any;
  animatedActiveTextStyle: any;
}) => {
  const [guidanceKey, setGuidanceKey] = React.useState<GuidanceKey>("right");
  const lastKeyRef = React.useRef<GuidanceKey>("right");

  const updateGuidanceKey = React.useCallback((newKey: GuidanceKey) => {
    if (lastKeyRef.current !== newKey) {
      lastKeyRef.current = newKey;
      setGuidanceKey(newKey);
    }
  }, []);

  useAnimatedReaction(
    () => {
      let angle = qiblaDirection - deviceHeading.value;
      // Normalize to -180 to 180 (handle JS negative modulo correctly)
      angle = ((((angle + 180) % 360) + 360) % 360) - 180;

      // Determine guidance key
      if (Math.abs(angle) < 2.5) {
        return "kaaba" as GuidanceKey;
      }
      // Positive angle means Qibla is clockwise (right), negative means counter-clockwise (left)
      return (angle > 0 ? "right" : "left") as GuidanceKey;
    },
    (key) => {
      runOnJS(updateGuidanceKey)(key);
    },
    [qiblaDirection]
  );

  const guidance = guidanceKey === "kaaba" ? "Facing the " : "Turn to your ";
  const directionWord = guidanceKey === "kaaba" ? "Kaaba" : guidanceKey;

  return (
    <View className="flex-row justify-center">
      <Animated.Text
        className="font-bold text-center text-[40px]"
        style={animatedInactiveTextStyle}
      >
        {guidance}
      </Animated.Text>
      <Animated.Text
        className="font-bold text-center text-[40px]"
        style={animatedActiveTextStyle}
      >
        {directionWord}
      </Animated.Text>
    </View>
  );
};

export default function Qibla() {
  const {
    location,
    cityName,
    error: locationError,
    refreshLocation,
  } = useLocation();
  const { qiblaData, loading, error: qiblaError } = useQiblaDirection(location);
  const { currentPrayer } = usePrayerTimes(location);
  const deviceHeading = useDeviceHeading();
  const { colors, themePrayer, isDarkMode } = useThemeColors();
  const bgColor = isDarkMode
    ? darkModeColors.background
    : lightModeColors.background;
  const isFocused = useIsFocused();
  const [motionPermission, setMotionPermission] = useState<boolean | null>(
    null
  );

  // Check motion permission on mount
  useEffect(() => {
    const checkMotionPermission = async () => {
      const { status } = await DeviceMotion.getPermissionsAsync();
      setMotionPermission(status === "granted");
    };
    checkMotionPermission();
  }, []);

  // Animated text styles for guidance
  const animatedInactiveTextStyle = useAnimatedTextColor(colors.inactive);
  const animatedActiveTextStyle = useAnimatedTextColor(colors.active);

  const error = locationError || qiblaError;

  // Use theme prayer if set, otherwise use actual current prayer for background
  const displayPrayer = themePrayer || currentPrayer?.prayer;

  // Track if facing Kaaba for vibration
  const isFacingKaaba = useDerivedValue(() => {
    if (!qiblaData) return false;
    let relativeAngle = qiblaData.direction - deviceHeading.value;
    // Normalize to -180 to 180 (handle JS negative modulo correctly)
    relativeAngle = ((((relativeAngle + 180) % 360) + 360) % 360) - 180;
    return Math.abs(relativeAngle) < 2.5;
  });

  // Vibration effect when facing Kaaba
  const triggerVibration = React.useCallback(() => {
    Vibration.vibrate([0, 100, 50, 100]);
  }, []);

  useAnimatedReaction(
    () => isFacingKaaba.value,
    (facing, previousFacing) => {
      if (isFocused && facing && !previousFacing) {
        runOnJS(triggerVibration)();
      }
    },
    [isFocused]
  );

  // Get the background image based on the current prayer (null if not loaded yet)
  const backgroundImage = displayPrayer
    ? prayerBackgrounds[displayPrayer] || null
    : null;

  const isLocationError = error?.toLowerCase().includes("location");
  const isMotionError = motionPermission === false;

  if (error || isMotionError) {
    const errorTitle = isLocationError
      ? "Location Required"
      : isMotionError
        ? "Motion Required"
        : "Something Went Wrong";
    const errorMessage = isLocationError
      ? "Fardh needs access to your location to calculate the Qibla direction for your area. Enable location in the Permissions Settings."
      : isMotionError
        ? "Fardh needs access to motion sensors to power the Qibla compass. Enable motion in the Permissions Settings."
        : error;
    return (
      <View
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: bgColor }}
      >
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View
          className="w-full rounded-2xl p-6 items-center"
          style={{
            borderWidth: 2,
            borderColor: prayerThemeColors.Fajr.active,
          }}
        >
          <Text
            className="text-xl font-bold text-center mb-2"
            style={{
              color: isDarkMode ? darkModeColors.text : lightModeColors.text,
            }}
          >
            {errorTitle}
          </Text>
          <Text
            className="text-base text-center"
            style={{
              color: isDarkMode
                ? darkModeColors.textSecondary
                : lightModeColors.textSecondary,
            }}
          >
            {errorMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar style="light" />
      <QiblaHeader
        qiblaDirection={qiblaData?.direction ?? null}
        locationName={cityName}
        backgroundImage={backgroundImage}
        currentPrayer={currentPrayer}
        onRefreshLocation={refreshLocation}
      />

      {qiblaData && (
        <View
          className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center"
          pointerEvents="none"
        >
          <QiblaCompass
            magnetometer={deviceHeading}
            qiblaDirection={qiblaData.direction}
          />
        </View>
      )}
      {qiblaData && (
        <View className="absolute bottom-24 left-0 right-0 px-6">
          <GuidanceText
            qiblaDirection={qiblaData.direction}
            deviceHeading={deviceHeading}
            animatedInactiveTextStyle={animatedInactiveTextStyle}
            animatedActiveTextStyle={animatedActiveTextStyle}
          />
        </View>
      )}
    </View>
  );
}
