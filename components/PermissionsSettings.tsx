import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Switch, View } from "react-native";
import Animated from "react-native-reanimated";

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
  }, [checkPermissions]);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      // Can't change permission in app, open settings
      openSettings();
    } else {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status === "granted") {
        setLocationEnabled(true);
      } else {
        // Permission denied, open settings
        openSettings();
      }
    }
  };

  const handleMotionToggle = async () => {
    if (motionEnabled) {
      // Can't change permission in app, open settings
      openSettings();
    } else {
      const result = await DeviceMotion.requestPermissionsAsync();
      if (result.status === "granted") {
        setMotionEnabled(true);
      } else {
        // Permission denied, open settings
        openSettings();
      }
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
