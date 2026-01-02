import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import {
  CALCULATION_METHODS,
  LATITUDE_ADJUSTMENTS,
  PrayerSettings,
  SCHOOLS,
  TUNABLE_PRAYERS,
  TunablePrayer,
  TuneSettings,
} from "@/constants/prayerSettings";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
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
  // Local state for tune adjustments (allows spamming buttons without saving)
  const [localTune, setLocalTune] = useState<TuneSettings>(settings.tune);
  const isTuneExpanded = expandedPickers.has("tune");

  // Check if local tune differs from saved settings
  const hasUnsavedChanges = TUNABLE_PRAYERS.some(
    (p) => localTune[p.key] !== settings.tune[p.key]
  );

  // Reset local tune when picker is opened (sync with current saved values)
  useEffect(() => {
    if (isTuneExpanded) {
      setLocalTune(settings.tune);
    }
  }, [isTuneExpanded, settings.tune]);

  // Update local tune value (doesn't save to storage)
  const updateLocalTune = useCallback((prayer: TunablePrayer, value: number) => {
    setLocalTune((prev) => ({ ...prev, [prayer]: value }));
  }, []);

  // Save all tune changes at once
  const saveChanges = useCallback(async () => {
    await updateAllTune(localTune);
  }, [localTune, updateAllTune]);

  // Discard changes and close picker
  const discardChanges = useCallback(() => {
    setLocalTune(settings.tune);
    togglePicker("tune");
  }, [settings.tune, togglePicker]);

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
            <Animated.Text
              className="text-sm"
              style={animatedActiveTextStyle}
            >
              {CALCULATION_METHODS.find((m) => m.id === settings.method)
                ?.name || "Select Method"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("method")
                    ? "180deg"
                    : "0deg",
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
              const isSelected = settings.method === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => {
                    updateSettings({ method: method.id });
                    togglePicker("method");
                  }}
                  className="flex-row items-center py-2 pl-4"
                >
                  <Animated.Text
                    className="flex-1"
                    style={isSelected ? animatedActiveTextStyle : animatedSecondaryTextStyle}
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

      <Animated.View className="my-2" style={[{ height: 1 }, animatedSeparatorStyle]} />

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
              School (Asr Calculation)
            </Animated.Text>
            <Animated.Text
              className="text-sm"
              style={animatedActiveTextStyle}
            >
              {SCHOOLS.find((s) => s.id === settings.school)?.name ||
                "Select School"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("school")
                    ? "180deg"
                    : "0deg",
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
              const isSelected = settings.school === school.id;
              return (
                <TouchableOpacity
                  key={school.id}
                  onPress={() => {
                    updateSettings({ school: school.id });
                    togglePicker("school");
                  }}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={isSelected ? animatedActiveTextStyle : animatedSecondaryTextStyle}
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

      <Animated.View className="my-2" style={[{ height: 1 }, animatedSeparatorStyle]} />

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
            <Animated.Text
              className="text-sm"
              style={animatedActiveTextStyle}
            >
              {LATITUDE_ADJUSTMENTS.find(
                (l) => l.id === settings.latitudeAdjustmentMethod
              )?.name || "None"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("latitude")
                    ? "180deg"
                    : "0deg",
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
              const isSelected = settings.latitudeAdjustmentMethod === adjustment.id;
              return (
                <TouchableOpacity
                  key={adjustment.id ?? "none"}
                  onPress={() => {
                    updateSettings({
                      latitudeAdjustmentMethod: adjustment.id,
                    });
                    togglePicker("latitude");
                  }}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={isSelected ? animatedActiveTextStyle : animatedSecondaryTextStyle}
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

      <Animated.View className="my-2" style={[{ height: 1 }, animatedSeparatorStyle]} />

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
            <Animated.Text
              className="text-sm"
              style={animatedActiveTextStyle}
            >
              ({TUNABLE_PRAYERS.map((p) => {
                const v = settings.tune[p.key];
                return v > 0 ? `+${v}` : `${v}`;
              }).join(", ")})
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("tune")
                    ? "180deg"
                    : "0deg",
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
                    style={hasAdjustment ? animatedActiveTextStyle : animatedSecondaryTextStyle}
                  >
                    {prayer.label}
                  </Animated.Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() =>
                        updateLocalTune(prayer.key as TunablePrayer, tuneValue - 1)
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
                      style={hasAdjustment ? animatedActiveTextStyle : animatedSecondaryTextStyle}
                    >
                      {tuneValue > 0 ? `+${tuneValue}` : tuneValue}
                    </Animated.Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateLocalTune(prayer.key as TunablePrayer, tuneValue + 1)
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
            {/* Save/Discard buttons */}
            {hasUnsavedChanges && (
              <View className="flex-row justify-center gap-3 mt-4">
                <TouchableOpacity
                  onPress={discardChanges}
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
        )}
      </View>
    </View>
  );
};
