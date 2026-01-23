import { CarouselDateFormat } from "@/constants/calendarSettings";
import {
  Prayers,
  darkModeColors,
  lightModeColors,
  prayerIcons,
} from "@/constants/prayers";
import { TimeFormat } from "@/constants/prayerSettings";
import { useThemeColors } from "@/context/ThemeContext";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { NotificationState } from "@/hooks/useNotifications";
import { PrayerDict } from "@/prayer-api/prayerTimesAPI";
import {
  formatDate,
  formatHijriDateShort,
  formatTimeWithPreference,
} from "@/utils/prayerHelpers";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Dimensions, Pressable, Text, Vibration, View } from "react-native";
import Animated from "react-native-reanimated";
import { Carousel } from "react-native-ui-lib";
import { AnimatedTintIcon } from "./AnimatedTintIcon";

// Notification icons for each state
const NOTIFICATION_ICONS = {
  off: require("../assets/images/prayer-pro-icons/home-page/icon-notify-off.png"),
  on: require("../assets/images/prayer-pro-icons/home-page/icon-notify-on.png"),
  adhan: require("../assets/images/prayer-pro-icons/home-page/icon-notify-adhan.png"),
};

// Vibration patterns for each state transition
const VIBRATION_PATTERNS = {
  on: 50, // Short tap for notification on
  adhan: [0, 80, 50, 80], // Double pulse for adhan
  off: 30, // Quick tap for off
};

const { width, height } = Dimensions.get("window");
const pageHeight = height * 0.5;
const pageWidth = width * 0.85;
const itemSpacing = 10;

interface PrayerCarouselProps {
  prayerDict: PrayerDict;
  sortedDates: string[];
  todayISO: string;
  todayIndex: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  getNotificationState: (prayer: string) => NotificationState;
  onCycleNotification: (prayer: string) => Promise<NotificationState>;
  activeColor: string;
  inactiveColor: string;
  currentPrayer: string | null;
  dateFormat?: CarouselDateFormat;
  timeFormat?: TimeFormat;
}

export type PrayerCarouselRef = {
  goToPage: (page: number, animated?: boolean) => void;
};

export const PrayerCarousel = forwardRef<
  PrayerCarouselRef,
  PrayerCarouselProps
>(
  (
    {
      prayerDict,
      sortedDates,
      todayISO,
      todayIndex,
      currentPage,
      onPageChange,
      getNotificationState,
      onCycleNotification,
      activeColor,
      inactiveColor,
      currentPrayer,
      dateFormat = "gregorian",
      timeFormat = "24h",
    },
    ref
  ) => {
    type CarouselHandle = React.ComponentRef<typeof Carousel>;
    const carouselRef = useRef<CarouselHandle | null>(null);
    const { isDarkMode } = useThemeColors();

    useImperativeHandle(ref, () => ({
      goToPage: (page, animated = true) =>
        carouselRef.current?.goToPage?.(page, animated),
    }));

    // Colors based on dark mode - use same logic as PrayerHeader
    const bgColor = isDarkMode
      ? darkModeColors.background
      : lightModeColors.background;
    const textColor = isDarkMode ? darkModeColors.text : lightModeColors.text;
    const secondaryTextColor = isDarkMode
      ? darkModeColors.textSecondary
      : lightModeColors.textSecondary;
    const tertiaryTextColor = isDarkMode
      ? darkModeColors.textTertiary
      : lightModeColors.textTertiary;

    // Animated styles for smooth transitions
    const animatedBgStyle = useAnimatedBackgroundColor(bgColor);
    const animatedTextStyle = useAnimatedTextColor(textColor);
    const animatedSecondaryTextStyle = useAnimatedTextColor(secondaryTextColor);
    const animatedTertiaryTextStyle = useAnimatedTextColor(tertiaryTextColor);

    return (
      <Animated.View
        className="flex-1 pt-8 pb-2 items-center mt-[22rem] rounded-t-3xl"
        style={animatedBgStyle}
      >
        <View
          className="relative"
          style={{
            width: pageWidth + itemSpacing,
            height: pageHeight,
          }}
        >
          <Carousel
            ref={carouselRef}
            containerStyle={{
              height: pageHeight,
              width: pageWidth + itemSpacing,
            }}
            pageWidth={pageWidth}
            onChangePage={onPageChange}
            itemSpacings={itemSpacing}
            initialPage={todayIndex}
          >
            {sortedDates.map((isoDate) => {
              const dayPrayers = prayerDict[isoDate];
              const isToday = isoDate === todayISO;

              return (
                <View
                  key={isoDate}
                  className="w-full h-full rounded-xl justify-start"
                >
                  <View className="mb-2 flex-row justify-between items-start">
                    <View>
                      <Animated.Text
                        style={[
                          {
                            fontSize: 18,
                            fontWeight: "bold",
                          },
                          animatedTextStyle,
                        ]}
                      >
                        {dateFormat === "hijri"
                          ? formatHijriDateShort(dayPrayers.hijriDate, isoDate)
                          : formatDate(isoDate)}
                      </Animated.Text>
                      {isToday && (
                        <Text
                          className="text-sm font-semibold mt-1"
                          style={{ color: activeColor }}
                        >
                          TODAY
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-1 justify-around">
                    {Prayers.map((prayer) => (
                      <View
                        key={prayer}
                        className="flex-row justify-between items-center py-5"
                      >
                        <View className="flex-row items-center gap-4">
                          <AnimatedTintIcon
                            source={prayerIcons[prayer]}
                            size={24}
                            tintColor={
                              prayer === currentPrayer
                                ? activeColor
                                : inactiveColor
                            }
                          />
                          <Animated.Text
                            style={[
                              {
                                fontSize: 18,
                                fontWeight: "600",
                              },
                              animatedSecondaryTextStyle,
                            ]}
                          >
                            {prayer}
                          </Animated.Text>
                        </View>
                        <View className="flex-row items-center gap-4">
                          <Animated.Text
                            style={[
                              { fontSize: 18 },
                              animatedTertiaryTextStyle,
                            ]}
                          >
                            {formatTimeWithPreference(
                              dayPrayers.timings[prayer],
                              timeFormat
                            )}
                          </Animated.Text>
                          <Pressable
                            onPress={async () => {
                              const newState =
                                await onCycleNotification(prayer);
                              // Different vibration for each state
                              setTimeout(() => {
                                Vibration.vibrate(VIBRATION_PATTERNS[newState]);
                              }, 100);
                            }}
                          >
                            <AnimatedTintIcon
                              source={
                                NOTIFICATION_ICONS[getNotificationState(prayer)]
                              }
                              size={24}
                              tintColor={
                                prayer === currentPrayer
                                  ? activeColor
                                  : inactiveColor
                              }
                            />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </Carousel>
        </View>
      </Animated.View>
    );
  }
);

PrayerCarousel.displayName = "PrayerCarousel";
