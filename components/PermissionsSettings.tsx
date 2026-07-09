import { openSettings } from "@/utils/openSettings";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Switch, View } from "react-native";
import Animated from "react-native-reanimated";

// iOS only shows the permission prompt once; after a denial it can only be
// changed in the system settings
const showOpenSettingsAlert = (message: string) => {
  Alert.alert("Permissions", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: openSettings },
  ]);
};

interface PermissionsSettingsProps {
  colors: { active: string; inactive: string };
  animatedTextStyle: any;
  animatedSecondaryTextStyle: any;
  animatedSeparatorStyle: any;
}

export const PermissionsSettings = ({
  colors,
  animatedTextStyle,
  animatedSecondaryTextStyle,
  animatedSeparatorStyle,
}: PermissionsSettingsProps) => {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  // Check permission status on mount and when app comes to foreground
  const checkPermissions = useCallback(async () => {
    const [locationStatus, motionStatus] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      DeviceMotion.getPermissionsAsync(),
    ]);
    setLocationEnabled(locationStatus.status === "granted");
    setMotionEnabled(motionStatus.status === "granted");
  }, []);

  useEffect(() => {
    checkPermissions();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermissions();
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      showOpenSettingsAlert(
        "Location access can only be turned off in your device settings."
      );
      return;
    }
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) {
      setLocationEnabled(true);
    } else if (current.canAskAgain) {
      const result = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(result.status === "granted");
    } else {
      showOpenSettingsAlert(
        "Location access for Fardh is turned off in your device settings. Allow it there to see accurate prayer times."
      );
    }
  };

  const handleMotionToggle = async () => {
    if (motionEnabled) {
      showOpenSettingsAlert(
        "Motion access can only be turned off in your device settings."
      );
      return;
    }
    const current = await DeviceMotion.getPermissionsAsync();
    if (current.granted) {
      setMotionEnabled(true);
    } else if (current.canAskAgain) {
      const result = await DeviceMotion.requestPermissionsAsync();
      setMotionEnabled(result.status === "granted");
    } else {
      showOpenSettingsAlert(
        "Motion access for Fardh is turned off in your device settings. Allow it there to use the Qibla compass."
      );
    }
  };

  return (
    <View className="gap-2">
      {/* Location Permission */}
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-1">
          <Animated.Text
            className="text-base font-medium"
            style={animatedTextStyle}
          >
            Location
          </Animated.Text>
          <Animated.Text className="text-sm" style={animatedSecondaryTextStyle}>
            Required for prayer times
          </Animated.Text>
        </View>
        <Switch
          value={locationEnabled}
          onValueChange={handleLocationToggle}
          trackColor={{
            false: colors.inactive,
            true: colors.active,
          }}
          thumbColor="#fff"
          ios_backgroundColor={colors.inactive}
        />
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* Motion Permission */}
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-1">
          <Animated.Text
            className="text-base font-medium"
            style={animatedTextStyle}
          >
            Motion
          </Animated.Text>
          <Animated.Text className="text-sm" style={animatedSecondaryTextStyle}>
            Required for Qibla compass
          </Animated.Text>
        </View>
        <Switch
          value={motionEnabled}
          onValueChange={handleMotionToggle}
          trackColor={{
            false: colors.inactive,
            true: colors.active,
          }}
          thumbColor="#fff"
          ios_backgroundColor={colors.inactive}
        />
      </View>
    </View>
  );
};
