import { AnimatedTintIcon } from "@/components/AnimatedTintIcon";
import {
  IMPORTANT_DATE_DESCRIPTIONS,
  KEY_DATE_SUBTITLES,
} from "@/constants/importantDates";
import {
  darkModeColors,
  lightModeColors,
  Prayers,
  type Prayer,
} from "@/constants/prayers";
import type { PrimaryDateSystem } from "@/constants/calendarSettings";
import type { TimeFormat } from "@/constants/prayerSettings";
import type { Timings } from "@/prayer-api/prayerTimesAPI";
import { getTodayISO } from "@/utils/calendarHelpers";
import { resolveBothDateLabels } from "@/utils/dateSystemHelpers";
import { formatTimeWithPreference } from "@/utils/prayerHelpers";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

const ANIMATION_DURATION_IN = 250;
const ANIMATION_DURATION_OUT = 200;
const OVERLAY = "rgba(0,0,0,0.35)";

// Hairline between the sheet body and the prayer-time row. A shade tighter to
// the background than backgroundSecondary, so it reads as a rule rather than a
// band of fill.
const RULE_LIGHT = "#edf1f4";
const RULE_DARK = "#2a2a3e";

// Prayer times run as two rows of three rather than one row of six: six
// columns on a narrow phone left no air between "Sunrise" and "Maghrib", and
// capped the times at a size you had to squint at. Half the columns buys
// roughly double the width, which the type sizes below spend.
//
// Split chronologically rather than by any grouping of the prayers themselves:
// reading order is left-to-right then down, so the day runs Fajr through Isha
// in sequence. Sliced from `Prayers` rather than hard-coded, so dropping
// Sunrise there (as that file invites) reflows to 3 + 2 on its own.
const ROW_SPLIT = Math.ceil(Prayers.length / 2);
const PRAYER_ROWS: Prayer[][] = [
  Prayers.slice(0, ROW_SPLIT),
  Prayers.slice(ROW_SPLIT),
];

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
  /** The prayer in progress right now, app-wide. Only marked on today's sheet. */
  currentPrayer: Prayer | null;
  timeFormat: TimeFormat;
  /** Which system titles the sheet; the other sits beneath it. */
  primaryDateSystem: PrimaryDateSystem;
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
  currentPrayer,
  timeFormat,
  primaryDateSystem,
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

  // The accent marker on a prayer only means something on today's sheet —
  // every other day has no "now" to point at.
  //
  // Whichever prayer has most recently started, passed down rather than
  // recomputed here: it comes from the same getCurrentPrayer the rest of the
  // app runs on, which carries the pre-Fajr case a local scan of today's times
  // gets wrong — between midnight and Fajr the prayer in progress is
  // yesterday's Isha, not "none".
  //
  // Note this is the prayer in progress, NOT the next one due. After Isha
  // nothing is marked until Fajr rolls the date over onto tomorrow's sheet.
  const markedPrayer = iso === getTodayISO() ? currentPrayer : null;

  // The title and the line under it. Size and colour belong to the slot — the
  // title is ink, the line beneath it accent — so only the dates move.
  const labels = resolveBothDateLabels(primaryDateSystem, {
    gregorian: iso ? formatSheetDate(iso) : null,
    hijri: hijriLabel,
  });

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
        {/* The sheet carries no Close button, so the dim is the close control
            and has to be reachable by a screen reader rather than hidden. */}
        <Pressable
          className="flex-1"
          onPress={closeWithAnimation}
          accessibilityRole="button"
          accessibilityLabel="Close day details"
        />

        <View className="absolute left-0 right-0" style={{ bottom: 0 }}>
          <Animated.View style={{ transform: [{ translateY: sheetAnim }] }}>
            <View
              className="px-4 pt-[9px] pb-[26px]"
              style={{
                backgroundColor: themeColors.background,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                // Lifts the sheet off the dimmed grid rather than letting the
                // two flat fills meet at the rounded edge.
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.16,
                shadowRadius: 13,
                elevation: 24,
              }}
            >
              {/* Retints with the prayer theme rather than sitting at the
                  fixed gray — it's the sheet's own handle, so it belongs to the
                  accent family like the icons below, not to the disabled tone. */}
              <View className="mb-3 items-center">
                <View
                  className="h-1 w-[38px] rounded-full"
                  style={{ backgroundColor: colors.inactive }}
                />
              </View>

              <Text
                className="text-[19px] font-bold"
                style={{ color: themeColors.text, letterSpacing: -0.38 }}
                accessibilityRole="header"
              >
                {labels.leading}
              </Text>
              {/* Transliteration only — no Arabic script anywhere in this
                  design. Full accent rather than the grid's muted Hijri tone:
                  in a cell it sits under a numeral and has to recede, but here
                  it's the second half of the sheet's title. */}
              {labels.trailing ? (
                <Text
                  className="text-[11.5px] font-semibold mt-px"
                  style={{ color: colors.active }}
                >
                  {labels.trailing}
                </Text>
              ) : null}

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
                        className="overflow-hidden mb-2"
                        style={{
                          backgroundColor: themeColors.backgroundSecondary,
                          borderRadius: 13,
                        }}
                      >
                        <Pressable
                          className="flex-row items-center gap-[9px] px-3 py-[11px]"
                          onPress={() => toggleExpanded(name)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isOpen }}
                        >
                          <AnimatedTintIcon source={infoIcon} size={17} tintColor={colors.active} />
                          <View className="flex-1">
                            <Text
                              className="text-sm font-bold"
                              style={{ color: themeColors.text, letterSpacing: -0.14 }}
                            >
                              {name}
                            </Text>
                            {subtitle && (
                              <Text
                                className="text-[11px] font-semibold mt-0.5"
                                style={{ color: themeColors.sectionTitle }}
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
                              size={12}
                              tintColor={colors.active}
                            />
                          </View>
                        </Pressable>

                        {isOpen && (
                          <Text
                            className="text-[12.5px] px-3 pb-3"
                            style={{
                              color: themeColors.textSecondary,
                              lineHeight: 19.5,
                            }}
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
                  className="mt-[13px] pt-[11px]"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: isDarkMode ? RULE_DARK : RULE_LIGHT,
                  }}
                >
                  {PRAYER_ROWS.map((row, rowIndex) => (
                    <View
                      key={rowIndex}
                      className={`flex-row ${rowIndex > 0 ? "mt-3" : ""}`}
                    >
                      {row.map((prayer) => {
                        const isNow = prayer === markedPrayer;
                        return (
                          // flex-1 rather than justify-between: three items
                          // spread edge-to-edge would leave the two rows on
                          // different centres, and the columns have to line up.
                          <View key={prayer} className="flex-1 items-center gap-1.5">
                            <Text
                              className="text-[11px] font-bold uppercase"
                              style={{
                                // Themed, so the row retints with the prayer;
                                // the current prayer steps up to the full
                                // accent against its muted siblings.
                                color: isNow ? colors.active : colors.inactive,
                                letterSpacing: 0.5,
                              }}
                            >
                              {prayer}
                            </Text>
                            <Text
                              className="text-[15px]"
                              style={{
                                color: isNow
                                  ? colors.active
                                  : themeColors.textSecondary,
                                fontWeight: isNow ? "800" : "600",
                                fontVariant: ["tabular-nums"],
                              }}
                            >
                              {formatTimeWithPreference(
                                prayerTimes[prayer],
                                timeFormat
                              )}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};
