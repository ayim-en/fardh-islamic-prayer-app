import { HOLIDAY_DESCRIPTIONS } from "@/constants/holidays";
import { darkModeColors, lightModeColors } from "@/constants/prayers";
import React, { useEffect, useRef } from "react";
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

// Animation constants
const ANIMATION_DURATION_IN = 250;
const ANIMATION_DURATION_OUT = 200;
const OVERLAY_OPACITY = "rgba(0,0,0,0.35)";

interface HolidayBottomSheetProps {
  visible: boolean;
  holidays: string[];
  isDarkMode: boolean;
  colors: { active: string; inactive: string };
  onClose: () => void;
}

export function HolidayBottomSheet({
  visible,
  holidays,
  isDarkMode,
  colors,
  onClose,
}: HolidayBottomSheetProps) {
  // Colors based on dark mode
  const themeColors = isDarkMode ? darkModeColors : lightModeColors;

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = Dimensions.get("window");
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animate sheet sliding up when visible
  useEffect(() => {
    if (visible) {
      sheetAnim.setValue(screenHeight);
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenHeight, sheetAnim]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Animate sheet sliding down before closing
  const closeWithAnimation = () => {
    Animated.timing(sheetAnim, {
      toValue: screenHeight,
      duration: ANIMATION_DURATION_OUT,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();

    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, ANIMATION_DURATION_OUT);
  };

  // Show holiday name as title for single holiday, or generic title for multiple
  const title =
    holidays.length > 1 ? "Holiday Details" : holidays[0] || "Holiday";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeWithAnimation}
      accessibilityViewIsModal
    >
      <View className="flex-1" style={{ backgroundColor: OVERLAY_OPACITY }}>
        <Pressable
          className="flex-1"
          onPress={closeWithAnimation}
          accessible={false}
        />
        <View className="absolute left-0 right-0" style={{ bottom: 0 }}>
          <Animated.View style={{ transform: [{ translateY: sheetAnim }] }}>
            <View
              className="rounded-t-3xl p-5"
              style={{ backgroundColor: themeColors.background }}
            >
              {/* Handle indicator */}
              <View className="mb-2 items-center">
                <View
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: colors.inactive }}
                  accessibilityLabel="Swipe indicator"
                />
              </View>

              {/* Title */}
              <Text
                className="text-2xl font-bold mt-3"
                style={{ color: colors.active }}
                accessibilityRole="header"
              >
                {title}
              </Text>

              {/* Content */}
              <ScrollView
                className="max-h-56"
                contentContainerStyle={{
                  paddingVertical: 12,
                  paddingBottom: 12,
                }}
              >
                {holidays.map((name: string, idx: number) => (
                  <View key={`${name}-${idx}`} className="mb-6">
                    {holidays.length > 1 && (
                      <Text
                        className="text-lg font-semibold mb-1"
                        style={{ color: themeColors.sectionTitle }}
                        accessibilityRole="header"
                      >
                        {name}
                      </Text>
                    )}
                    <Text
                      className="text-base"
                      style={{ color: themeColors.text }}
                    >
                      {HOLIDAY_DESCRIPTIONS[name] ||
                        "Description not available."}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Close button */}
              <View className="mt-10 items-center">
                <Pressable
                  onPress={closeWithAnimation}
                  accessibilityRole="button"
                  accessibilityLabel="Close holiday details"
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
}
