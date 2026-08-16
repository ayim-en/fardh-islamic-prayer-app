import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import {
  IMPORTANT_DATE_DESCRIPTIONS,
  KEY_DATE_SUBTITLES,
} from "@/constants/importantDates";
import {
  darkModeColors,
  lightModeColors,
  Prayers,
} from "@/constants/prayers";
import type { TimeFormat } from "@/constants/prayerSettings";
import type { Timings } from "@/prayer-api/prayerTimesAPI";
import { formatTimeWithPreference } from "@/utils/prayerHelpers";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ANIMATION_DURATION_IN = 250;
const ANIMATION_DURATION_OUT = 200;
const OVERLAY = "rgba(0,0,0,0.35)";

const infoIcon = require("../../assets/images/prayer-pro-icons/calendar-tab/calendar-info.png");
const chevronIcon = require("../../assets/images/prayer-pro-icons/settings-tab/settings-dropdown.png");

export interface DayDetailSheetProps {
  visible: boolean;
  iso: string | null;
  /** "1 Shawwāl 1448", or null when that day isn't in the cached window. */
  hijriLabel: string | null;
  keyDates: string[];
  /** Null when the day falls outside the fetched prayer-times window. */
  prayerTimes: Timings | null;
  timeFormat: TimeFormat;
  isDarkMode: boolean;
  colors: { active: string; inactive: string };
  onClose: () => void;
}

// "Tuesday, 9 March" — composed rather than using a single toLocaleDateString
// call, so the day-before-month order holds on en-US as well as en-GB.
const formatSheetDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const monthName = date.toLocaleDateString(undefined, { month: "long" });
  return `${weekday}, ${day} ${monthName}`;
};

export const DayDetailSheet = ({
  visible,
  iso,
  hijriLabel,
  keyDates,
  prayerTimes,
  timeFormat,
  isDarkMode,
  colors,
  onClose,
}: DayDetailSheetProps) => {
  const themeColors = isDarkMode ? darkModeColors : lightModeColors;
  const { height: screenHeight } = Dimensions.get("window");

  // Start off-screen. Initialising to 0 would paint one frame with the sheet
  // already in place before the effect pushes it down to slide up.
  const sheetAnim = useRef(new Animated.Value(screenHeight)).current;
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modal keeps children mounted when visible flips false, so without this the
  // next open would inherit the previous day's expansion.
  useEffect(() => {
    setExpanded(new Set());
  }, [iso, visible]);

  useEffect(() => {
    if (!visible) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    sheetAnim.setValue(screenHeight);
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: ANIMATION_DURATION_IN,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, screenHeight, sheetAnim]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeWithAnimation = () => {
    // Guard against a rapid close -> reopen -> close firing onClose twice.
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    Animated.timing(sheetAnim, {
      toValue: screenHeight,
      duration: ANIMATION_DURATION_OUT,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();

    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      onClose();
    }, ANIMATION_DURATION_OUT);
  };

  const toggleExpanded = (name: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeWithAnimation}
      accessibilityViewIsModal
    >
      <View className="flex-1" style={{ backgroundColor: OVERLAY }}>
        <Pressable className="flex-1" onPress={closeWithAnimation} accessible={false} />

        <View className="absolute left-0 right-0" style={{ bottom: 0 }}>
          <Animated.View style={{ transform: [{ translateY: sheetAnim }] }}>
            <View
              className="rounded-t-3xl px-5 pt-2 pb-8"
              style={{ backgroundColor: themeColors.background }}
            >
              <View className="mb-3 items-center">
                <View
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: colors.inactive }}
                />
              </View>

              <Text
                className="text-xl font-bold"
                style={{ color: themeColors.text }}
                accessibilityRole="header"
              >
                {iso ? formatSheetDate(iso) : ""}
              </Text>
              {/* Transliteration only — no Arabic script anywhere in this design. */}
              {hijriLabel && (
                <Text
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: themeColors.textSecondary }}
                >
                  {hijriLabel}
                </Text>
              )}

              {keyDates.length > 0 && (
                <ScrollView className="max-h-64 mt-3" showsVerticalScrollIndicator={false}>
                  {keyDates.map((name) => {
                    const isOpen = expanded.has(name);
                    const subtitle = KEY_DATE_SUBTITLES[name];
                    return (
                      // The tinted card is the boundary of the control, so the
                      // description expands INSIDE it rather than below it.
                      <View
                        key={name}
                        className="rounded-xl overflow-hidden mb-2"
                        style={{ backgroundColor: themeColors.backgroundSecondary }}
                      >
                        <Pressable
                          className="flex-row items-center gap-2.5 px-3 py-3"
                          onPress={() => toggleExpanded(name)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isOpen }}
                        >
                          <AnimatedTintIcon source={infoIcon} size={17} tintColor={colors.active} />
                          <View className="flex-1">
                            <Text
                              className="text-[15px] font-bold"
                              style={{ color: themeColors.text }}
                            >
                              {name}
                            </Text>
                            {subtitle && (
                              <Text
                                className="text-[11px] font-semibold mt-0.5"
                                style={{ color: themeColors.textSecondary }}
                              >
                                {subtitle}
                              </Text>
                            )}
                          </View>
                          {!isOpen && (
                            <Text
                              className="text-[11px] font-bold"
                              style={{ color: colors.active }}
                            >
                              More info
                            </Text>
                          )}
                          {/* Down, not right: this opens in place rather than
                              navigating somewhere. */}
                          <View
                            style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
                          >
                            <AnimatedTintIcon
                              source={chevronIcon}
                              size={13}
                              tintColor={colors.active}
                            />
                          </View>
                        </Pressable>

                        {isOpen && (
                          <Text
                            className="text-[13px] leading-5 px-3 pb-3"
                            style={{ color: themeColors.textSecondary }}
                          >
                            {IMPORTANT_DATE_DESCRIPTIONS[name] ??
                              "Description not available."}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* Omitted entirely outside the fetched window, or without
                  location — no error, no empty state. */}
              {prayerTimes && (
                <View
                  className="flex-row justify-between mt-4 pt-3"
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDarkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                  }}
                >
                  {Prayers.map((prayer) => (
                    <View key={prayer} className="items-center gap-1">
                      <Text
                        className="text-[9px] font-bold uppercase"
                        style={{ color: themeColors.textSecondary }}
                      >
                        {prayer}
                      </Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: themeColors.textSecondary }}
                      >
                        {formatTimeWithPreference(prayerTimes[prayer], timeFormat)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View className="mt-6 items-center">
                <Pressable
                  onPress={closeWithAnimation}
                  accessibilityRole="button"
                  accessibilityLabel="Close day details"
                  hitSlop={8}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{ color: colors.inactive }}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};
