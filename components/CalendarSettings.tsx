import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import { CALENDAR_METHODS, CalendarMethodId, CalendarSettings as CalendarSettingsType } from "@/constants/calendarSettings";
import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

interface CalendarSettingsProps {
  settings: CalendarSettingsType;
  updateSettings: (newSettings: Partial<CalendarSettingsType>) => Promise<void>;
  expandedPickers: Set<string>;
  togglePicker: (picker: string) => void;
  colors: { active: string; inactive: string };
  animatedTextStyle: any;
  animatedActiveTextStyle: any;
  animatedSecondaryTextStyle: any;
  animatedSeparatorStyle: any;
}

export const CalendarSettingsComponent = ({
  settings,
  updateSettings,
  expandedPickers,
  togglePicker,
  colors,
  animatedTextStyle,
  animatedActiveTextStyle,
  animatedSecondaryTextStyle,
  animatedSeparatorStyle,
}: CalendarSettingsProps) => {
  // Local state for all settings (changes are batched until Save)
  const [localCalendarMethod, setLocalCalendarMethod] = useState<CalendarMethodId>(settings.calendarMethod);
  const [localDateFormat, setLocalDateFormat] = useState<"gregorian" | "hijri">(settings.carouselDateFormat);
  const [localAdjustment, setLocalAdjustment] = useState(settings.adjustment);

  const isMathematical = localCalendarMethod === "MATHEMATICAL";

  // Sync local state when settings change externally
  useEffect(() => {
    setLocalCalendarMethod(settings.calendarMethod);
    setLocalDateFormat(settings.carouselDateFormat);
    setLocalAdjustment(settings.adjustment);
  }, [settings]);

  // Check if any local state differs from saved settings
  const hasUnsavedChanges =
    localCalendarMethod !== settings.calendarMethod ||
    localDateFormat !== settings.carouselDateFormat ||
    (isMathematical && localAdjustment !== settings.adjustment);

  // Save all changes at once
  const saveAllChanges = useCallback(async () => {
    const changes: Partial<CalendarSettingsType> = {};
    if (localCalendarMethod !== settings.calendarMethod)
      changes.calendarMethod = localCalendarMethod;
    if (localDateFormat !== settings.carouselDateFormat)
      changes.carouselDateFormat = localDateFormat;
    if (isMathematical && localAdjustment !== settings.adjustment)
      changes.adjustment = localAdjustment;

    if (Object.keys(changes).length > 0) {
      await updateSettings(changes);
    }
  }, [localCalendarMethod, localDateFormat, localAdjustment, isMathematical, settings, updateSettings]);

  // Discard all changes
  const discardAllChanges = useCallback(() => {
    setLocalCalendarMethod(settings.calendarMethod);
    setLocalDateFormat(settings.carouselDateFormat);
    setLocalAdjustment(settings.adjustment);
  }, [settings]);

  return (
    <View className="gap-2">
      {/* Calendar Method Dropdown */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("calendarMethod")}
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
              {CALENDAR_METHODS.find((m) => m.id === localCalendarMethod)
                ?.name || "Select Method"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("calendarMethod")
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
        {expandedPickers.has("calendarMethod") && (
          <View className="mt-1">
            {CALENDAR_METHODS.map((method) => {
              const isSelected = localCalendarMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setLocalCalendarMethod(method.id)}
                  className="flex-row items-center py-2 pl-4"
                >
                  <View className="flex-1">
                    <Animated.Text
                      style={isSelected ? animatedActiveTextStyle : animatedSecondaryTextStyle}
                    >
                      {method.name}
                    </Animated.Text>
                    <Animated.Text
                      className="text-xs"
                      style={animatedSecondaryTextStyle}
                    >
                      {method.description}
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

      {/* Date Format Toggle */}
      <View>
        <TouchableOpacity
          onPress={() => togglePicker("dateFormat")}
          className="flex-row items-center py-2"
        >
          <View className="flex-1">
            <Animated.Text
              className="text-base font-medium"
              style={animatedTextStyle}
            >
              Date Format
            </Animated.Text>
            <Animated.Text
              className="text-sm"
              style={animatedActiveTextStyle}
            >
              {localDateFormat === "hijri" ? "Hijri" : "Gregorian"}
            </Animated.Text>
          </View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: expandedPickers.has("dateFormat")
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
        {expandedPickers.has("dateFormat") && (
          <View className="mt-1">
            {[
              { id: "gregorian", name: "Gregorian" },
              { id: "hijri", name: "Hijri" },
            ].map((format) => {
              const isSelected = localDateFormat === format.id;
              return (
                <TouchableOpacity
                  key={format.id}
                  onPress={() => setLocalDateFormat(format.id as "gregorian" | "hijri")}
                  className="flex-row items-center py-2 pl-4"
                >
                  <Animated.Text
                    className="flex-1"
                    style={isSelected ? animatedActiveTextStyle : animatedSecondaryTextStyle}
                  >
                    {format.name}
                  </Animated.Text>
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

      {/* Day Adjustment (only for MATHEMATICAL method) */}
      {isMathematical && (
        <>
          <Animated.View className="my-2" style={[{ height: 1 }, animatedSeparatorStyle]} />
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1">
              <Animated.Text
                className="text-base font-medium"
                style={animatedTextStyle}
              >
                Day Adjustment
              </Animated.Text>
              <Animated.Text
                className="text-sm"
                style={animatedActiveTextStyle}
              >
                {localAdjustment > 0
                  ? `+${localAdjustment} days`
                  : localAdjustment < 0
                  ? `${localAdjustment} days`
                  : "No adjustment"}
              </Animated.Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() =>
                  setLocalAdjustment((prev) => Math.max(-3, prev - 1))
                }
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.active + "20" }}
              >
                <Animated.Text
                  className="text-lg font-bold"
                  style={animatedActiveTextStyle}
                >
                  −
                </Animated.Text>
              </TouchableOpacity>
              <Animated.Text
                className="w-10 text-center font-medium"
                style={
                  localAdjustment !== 0
                    ? animatedActiveTextStyle
                    : animatedSecondaryTextStyle
                }
              >
                {localAdjustment > 0
                  ? `+${localAdjustment}`
                  : localAdjustment}
              </Animated.Text>
              <TouchableOpacity
                onPress={() =>
                  setLocalAdjustment((prev) => Math.min(3, prev + 1))
                }
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.active + "20" }}
              >
                <Animated.Text
                  className="text-lg font-bold"
                  style={animatedActiveTextStyle}
                >
                  +
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

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
