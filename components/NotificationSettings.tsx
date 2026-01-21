import React from "react";
import { Switch, View } from "react-native";
import Animated from "react-native-reanimated";

// Prayers that support adhan (excludes Sunrise - no adhan for Sunrise in Islam)
const ADHAN_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

interface NotificationSettingsProps {
  masterToggle: boolean;
  toggleMasterNotifications: () => void;
  adhanMasterToggle: boolean;
  toggleAdhanMaster: () => void;
  adhanEnabled: Record<string, boolean>;
  toggleAdhan: (prayer: string) => void;
  colors: { active: string; inactive: string };
  animatedTextStyle: any;
  animatedSecondaryTextStyle: any;
  animatedSeparatorStyle: any;
}

export const NotificationSettings = ({
  masterToggle,
  toggleMasterNotifications,
  adhanMasterToggle,
  toggleAdhanMaster,
  adhanEnabled,
  toggleAdhan,
  colors,
  animatedTextStyle,
  animatedSecondaryTextStyle,
  animatedSeparatorStyle,
}: NotificationSettingsProps) => {
  return (
    <View className="gap-2">
      {/* Master Toggle */}
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-1">
          <Animated.Text
            className="text-base font-medium"
            style={animatedTextStyle}
          >
            Enable Notifications
          </Animated.Text>
          <Animated.Text className="text-sm" style={animatedSecondaryTextStyle}>
            Prayer time reminders
          </Animated.Text>
        </View>
        <Switch
          value={masterToggle}
          onValueChange={toggleMasterNotifications}
          trackColor={{
            false: colors.inactive,
            true: colors.active,
          }}
          thumbColor="#fff"
          ios_backgroundColor={colors.inactive}
        />
      </View>

      {masterToggle && (
        <>
          <Animated.View
            className="my-2"
            style={[{ height: 1 }, animatedSeparatorStyle]}
          />

          {/* Adhan Master Toggle */}
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1">
              <Animated.Text
                className="text-base font-medium"
                style={animatedTextStyle}
              >
                Play Adhan
              </Animated.Text>
              <Animated.Text
                className="text-xs"
                style={animatedSecondaryTextStyle}
              >
                Due to iOS limits, Adhan is limited to 30 seconds
              </Animated.Text>
            </View>
            <Switch
              value={adhanMasterToggle}
              onValueChange={toggleAdhanMaster}
              trackColor={{
                false: colors.inactive,
                true: colors.active,
              }}
              thumbColor="#fff"
              ios_backgroundColor={colors.inactive}
            />
          </View>

          {/* Per-Prayer Adhan Toggles */}
          {adhanMasterToggle && (
            <>
              <Animated.View
                className="my-2"
                style={[{ height: 1 }, animatedSeparatorStyle]}
              />
              {ADHAN_PRAYERS.map((prayer, index) => {
                const isAdhanEnabled = adhanEnabled[prayer] ?? false;

                return (
                  <View key={prayer}>
                    <View className="flex-row items-center justify-between py-2">
                      <Animated.Text
                        className="flex-1 text-base"
                        style={animatedTextStyle}
                      >
                        {prayer}
                      </Animated.Text>
                      <Switch
                        value={isAdhanEnabled}
                        onValueChange={() => toggleAdhan(prayer)}
                        trackColor={{
                          false: colors.inactive,
                          true: colors.active,
                        }}
                        thumbColor="#fff"
                        ios_backgroundColor={colors.inactive}
                      />
                    </View>
                    {index < ADHAN_PRAYERS.length - 1 && (
                      <Animated.View
                        className="my-1"
                        style={[{ height: 1 }, animatedSeparatorStyle]}
                      />
                    )}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
    </View>
  );
};
