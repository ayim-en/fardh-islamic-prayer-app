import { PrimaryDateSystem } from "@/constants/calendarSettings";
import {
  HOME_HEADER_HEIGHT_RATIO,
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
import { resolveDateLabels } from "@/utils/dateSystemHelpers";
import {
  formatDate,
  formatHijriDateShort,
  formatTimeWithPreference,
} from "@/utils/prayerHelpers";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  Vibration,
  View,
} from "react-native";
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
const DEFAULT_PAGE_HEIGHT = height * 0.5;
const FALLBACK_CONTAINER_HEIGHT = height;
const pageWidth = width * 0.85;
const itemSpacing = 10;
// Vertical padding on the carousel's wrapping container (pt-8 + pb-2)
const CONTAINER_VERTICAL_PADDING = 40;

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
  primaryDateSystem?: PrimaryDateSystem;
  timeFormat?: TimeFormat;
  containerHeight?: number;
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
      primaryDateSystem = "gregorian",
      timeFormat = "24h",
      containerHeight,
    },
    ref
  ) => {
    type CarouselHandle = React.ComponentRef<typeof Carousel>;
    const carouselRef = useRef<CarouselHandle | null>(null);
    const { isDarkMode } = useThemeColors();
    const [pageHeight, setPageHeight] = useState(DEFAULT_PAGE_HEIGHT);

    // Same ratio PrayerHeader uses for its rounded panel, so the two always
    // line up regardless of the actual screen height.
    const headerOffset =
      (containerHeight || FALLBACK_CONTAINER_HEIGHT) *
      HOME_HEADER_HEIGHT_RATIO;

    // Size the carousel off the actual available space instead of a guessed
    // fraction of window height, which can be much shorter than expected
    // (e.g. iPhone-compatibility mode on iPad).
    const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
      const measuredHeight =
        e.nativeEvent.layout.height - CONTAINER_VERTICAL_PADDING;
      if (measuredHeight > 0) {
        setPageHeight(measuredHeight);
      }
    }, []);

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
        className="flex-1 pt-8 pb-2 items-center rounded-t-3xl"
        style={[animatedBgStyle, { marginTop: headerOffset }]}
        onLayout={handleContainerLayout}
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
                        {
                          // The prayer screen shows exactly one date: the
                          // primary. The trailing label is the calendar's
                          // business, not this screen's.
                          resolveDateLabels(primaryDateSystem, {
                            gregorian: formatDate(isoDate),
                            hijri: formatHijriDateShort(
                              dayPrayers.hijriDate,
                              isoDate
                            ),
                          }).leading
                        }
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

                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "space-around",
                    }}
                    showsVerticalScrollIndicator={false}
                  >
                    {Prayers.map((prayer) => (
                      <View
                        key={prayer}
                        className="flex-row justify-between items-center py-2"
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
                  </ScrollView>
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
