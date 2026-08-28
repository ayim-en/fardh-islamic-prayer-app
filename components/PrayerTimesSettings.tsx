import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import {
  CALCULATION_METHODS,
  LATITUDE_ADJUSTMENTS,
  PrayerSettings,
  SCHOOLS,
  TIME_FORMATS,
  TimeFormat,
  TUNABLE_PRAYERS,
  TunablePrayer,
  TuneSettings,
} from "@/constants/prayerSettings";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

interface PrayerTimesSettingsProps {
  settings: PrayerSettings;
  updateSettings: (newSettings: Partial<PrayerSettings>) => Promise<void>;
  updateAllTune: (tune: TuneSettings) => Promise<void>;
  expandedPickers: Set<string>;
  togglePicker: (picker: string) => void;
  colors: { active: string; inactive: string };
  animatedTextStyle: any;
  animatedActiveTextStyle: any;
  animatedSecondaryTextStyle: any;
  animatedSeparatorStyle: any;
}

export const PrayerTimesSettings = ({
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
}: PrayerTimesSettingsProps) => {
  // Local state for all settings (changes are batched until Save)
  const [localMethod, setLocalMethod] = useState(settings.method);
  const [localSchool, setLocalSchool] = useState(settings.school);
  const [localLatitude, setLocalLatitude] = useState(settings.latitudeAdjustmentMethod);
  const [localTune, setLocalTune] = useState<TuneSettings>(settings.tune);
  const [localTimeFormat, setLocalTimeFormat] = useState<TimeFormat>(settings.timeFormat);
  const [localShowLastThird, setLocalShowLastThird] = useState(
    settings.showLastThird
  );

  // Sync local state when settings change externally (e.g., on mount or from another source)
  useEffect(() => {
    setLocalMethod(settings.method);
    setLocalSchool(settings.school);
    setLocalLatitude(settings.latitudeAdjustmentMethod);
    setLocalTune(settings.tune);
    setLocalTimeFormat(settings.timeFormat);
    setLocalShowLastThird(settings.showLastThird);
  }, [settings]);

  // Check if any local state differs from saved settings
  const hasUnsavedChanges =
    localMethod !== settings.method ||
    localSchool !== settings.school ||
    localLatitude !== settings.latitudeAdjustmentMethod ||
    localTimeFormat !== settings.timeFormat ||
    localShowLastThird !== settings.showLastThird ||
    TUNABLE_PRAYERS.some((p) => localTune[p.key] !== settings.tune[p.key]);

  // Update local tune value (doesn't save to storage)
  const updateLocalTune = useCallback(
    (prayer: TunablePrayer, value: number) => {
      setLocalTune((prev) => ({ ...prev, [prayer]: value }));
    },
    []
  );

  // Save all changes at once
  const saveAllChanges = useCallback(async () => {
    const changes: Partial<PrayerSettings> = {};
    if (localMethod !== settings.method) changes.method = localMethod;
    if (localSchool !== settings.school) changes.school = localSchool;
    if (localLatitude !== settings.latitudeAdjustmentMethod)
      changes.latitudeAdjustmentMethod = localLatitude;
    if (localTimeFormat !== settings.timeFormat)
      changes.timeFormat = localTimeFormat;
    if (localShowLastThird !== settings.showLastThird)
      changes.showLastThird = localShowLastThird;

    const tuneChanged = TUNABLE_PRAYERS.some(
      (p) => localTune[p.key] !== settings.tune[p.key]
    );
    if (tuneChanged) {
      await updateAllTune(localTune);
    }
    if (Object.keys(changes).length > 0) {
      await updateSettings(changes);
    }
  }, [
    localMethod,
    localSchool,
    localLatitude,
    localTimeFormat,
    localShowLastThird,
    localTune,
    settings,
    updateSettings,
    updateAllTune,
  ]);

  // Discard all changes
  const discardAllChanges = useCallback(() => {
    setLocalMethod(settings.method);
    setLocalSchool(settings.school);
    setLocalLatitude(settings.latitudeAdjustmentMethod);
    setLocalTune(settings.tune);
    setLocalTimeFormat(settings.timeFormat);
    setLocalShowLastThird(settings.showLastThird);
  }, [settings]);

  return (
    <View className="gap-2">
      {/* Calculation Method Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("method")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              Calculation Method
            </Animated.Text>
            <Animated.Text className="text-sm" style={animatedActiveTextStyle}>
              {CALCULATION_METHODS.find((m) => m.id === localMethod)
                ?.name || "Select Method"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("method") ? "180deg" : "0deg",
                },
              ],
            }}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
              size={16}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
        {expandedPickers.has("method") && (
          <ScrollView
            className="mt-1"
            style={{ maxHeight: 250 }}
            nestedScrollEnabled
          >
            {CALCULATION_METHODS.map((method) => {
              const isSelected = localMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setLocalMethod(method.id)}
                  className="flex-row items-center py-2 pl-4"
                >
                  <Animated.Text
                    className="flex-1"
                    style={
                      isSelected
                        ? animatedActiveTextStyle
                        : animatedSecondaryTextStyle
                    }
                  >
                    {method.name}
                  </Animated.Text>
                  {isSelected && (
                    <Animated.Text style={animatedActiveTextStyle}>
                      ✓
                    </Animated.Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* School Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("school")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              Asr Calculation
            </Animated.Text>
            <Animated.Text className="text-sm" style={animatedActiveTextStyle}>
              {SCHOOLS.find((s) => s.id === localSchool)?.name ||
                "Select School"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("school") ? "180deg" : "0deg",
                },
              ],
            }}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
              size={16}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
        {expandedPickers.has("school") && (
          <View className="mt-1">
            {SCHOOLS.map((school) => {
              const isSelected = localSchool === school.id;
              return (
                <TouchableOpacity
                  key={school.id}
                  onPress={() => setLocalSchool(school.id)}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={
                        isSelected
                          ? animatedActiveTextStyle
                          : animatedSecondaryTextStyle
                      }
                    >
                      {school.name}
                    </Animated.Text>
                    <Animated.Text
                      className="text-xs"
                      style={animatedSecondaryTextStyle}
                    >
                      {school.description}
                    </Animated.Text>
                  </View>
                  {isSelected && (
                    <Animated.Text style={animatedActiveTextStyle}>
                      ✓
                    </Animated.Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* Latitude Adjustment Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("latitude")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              High Latitude Adjustment
            </Animated.Text>
            <Animated.Text className="text-sm" style={animatedActiveTextStyle}>
              {LATITUDE_ADJUSTMENTS.find(
                (l) => l.id === localLatitude
              )?.name || "None"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("latitude") ? "180deg" : "0deg",
                },
              ],
            }}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
              size={16}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
        {expandedPickers.has("latitude") && (
          <View className="mt-1">
            {LATITUDE_ADJUSTMENTS.map((adjustment) => {
              const isSelected = localLatitude === adjustment.id;
              return (
                <TouchableOpacity
                  key={adjustment.id ?? "none"}
                  onPress={() => setLocalLatitude(adjustment.id)}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={
                        isSelected
                          ? animatedActiveTextStyle
                          : animatedSecondaryTextStyle
                      }
                    >
                      {adjustment.name}
                    </Animated.Text>
                    <Animated.Text
                      className="text-xs"
                      style={animatedSecondaryTextStyle}
                    >
                      {adjustment.description}
                    </Animated.Text>
                  </View>
                  {isSelected && (
                    <Animated.Text style={animatedActiveTextStyle}>
                      ✓
                    </Animated.Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* Custom Adjustments (Tune) Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("tune")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              Custom Adjustments
            </Animated.Text>
            <Animated.Text className="text-sm" style={animatedActiveTextStyle}>
              (
              {TUNABLE_PRAYERS.map((p) => {
                const v = localTune[p.key];
                return v > 0 ? `+${v}` : `${v}`;
              }).join(", ")}
              )
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("tune") ? "180deg" : "0deg",
                },
              ],
            }}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
              size={16}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
        {expandedPickers.has("tune") && (
          <View className="mt-1">
            {TUNABLE_PRAYERS.map((prayer) => {
              const tuneValue = localTune[prayer.key];
              const hasAdjustment = tuneValue !== 0;
              return (
                <View
                  key={prayer.key}
                  className="flex-row items-center justify-between py-2 pl-4"
                >
                  <Animated.Text
                    style={
                      hasAdjustment
                        ? animatedActiveTextStyle
                        : animatedSecondaryTextStyle
                    }
                  >
                    {prayer.label}
                  </Animated.Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() =>
                        updateLocalTune(
                          prayer.key as TunablePrayer,
                          tuneValue - 1
                        )
                      }
                      className="w-7 h-7 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.active + "20" }}
                    >
                      <Animated.Text
                        className="text-base font-bold"
                        style={animatedActiveTextStyle}
                      >
                        −
                      </Animated.Text>
                    </TouchableOpacity>
                    <Animated.Text
                      className="w-10 text-center font-medium"
                      style={
                        hasAdjustment
                          ? animatedActiveTextStyle
                          : animatedSecondaryTextStyle
                      }
                    >
                      {tuneValue > 0 ? `+${tuneValue}` : tuneValue}
                    </Animated.Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateLocalTune(
                          prayer.key as TunablePrayer,
                          tuneValue + 1
                        )
                      }
                      className="w-7 h-7 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.active + "20" }}
                    >
                      <Animated.Text
                        className="text-base font-bold"
                        style={animatedActiveTextStyle}
                      >
                        +
                      </Animated.Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* Time Format Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("timeFormat")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              Time Format
            </Animated.Text>
            <Animated.Text className="text-sm" style={animatedActiveTextStyle}>
              {TIME_FORMATS.find((f) => f.id === localTimeFormat)?.name ||
                "24-hour"}{" "}
              ({TIME_FORMATS.find((f) => f.id === localTimeFormat)?.example})
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("timeFormat") ? "180deg" : "0deg",
                },
              ],
            }}
          >
            <AnimatedTintIcon
              source={require("../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png")}
              size={16}
              tintColor={colors.active}
            />
          </Animated.View>
        </TouchableOpacity>
        {expandedPickers.has("timeFormat") && (
          <View className="mt-1">
            {TIME_FORMATS.map((format) => {
              const isSelected = localTimeFormat === format.id;
              return (
                <TouchableOpacity
                  key={format.id}
                  onPress={() => setLocalTimeFormat(format.id)}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={
                        isSelected
                          ? animatedActiveTextStyle
                          : animatedSecondaryTextStyle
                      }
                    >
                      {format.name}
                    </Animated.Text>
                    <Animated.Text
                      className="text-xs"
                      style={animatedSecondaryTextStyle}
                    >
                      {format.example}
                    </Animated.Text>
                  </View>
                  {isSelected && (
                    <Animated.Text style={animatedActiveTextStyle}>
                      ✓
                    </Animated.Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <Animated.View
        className="my-2"
        style={[{ height: 1 }, animatedSeparatorStyle]}
      />

      {/* Last Third of the Night Toggle */}
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-1 pr-3">
          <Animated.Text
            className="text-base font-medium"
            style={animatedTextStyle}
          >
            Last Third of the Night
          </Animated.Text>
          <Animated.Text className="text-sm" style={animatedSecondaryTextStyle}>
            Show when it begins, beside the date
          </Animated.Text>
        </View>
        <Switch
          value={localShowLastThird}
          onValueChange={setLocalShowLastThird}
          trackColor={{ false: colors.inactive, true: colors.active }}
          thumbColor="#fff"
          ios_backgroundColor={colors.inactive}
        />
      </View>

      {/* Unified Save/Discard buttons */}
      {hasUnsavedChanges && (
        <View className="flex-row justify-center gap-3 mt-4">
          <TouchableOpacity
            onPress={discardAllChanges}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.active + "20" }}
          >
            <Animated.Text
              className="font-medium"
              style={animatedSecondaryTextStyle}
            >
              Discard
            </Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveAllChanges}
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
