import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolateColor,
  useDerivedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

const DEFAULT_DURATION = 600;
const TIMING_CONFIG = {
  duration: DEFAULT_DURATION,
  easing: Easing.inOut(Easing.ease),
};

/**
 * Hook that returns an animated style for smooth background color transitions.
 * Initializes with current color to avoid flashing stale colors on mount.
 */
export function useAnimatedBackgroundColor(
  color: string,
  duration: number = DEFAULT_DURATION
) {
  const progress = useSharedValue(1);
  const fromColor = useSharedValue(color);
  const toColor = useSharedValue(color);

  useEffect(() => {
    if (toColor.value !== color) {
      fromColor.value = toColor.value;
      toColor.value = color;
      progress.value = 0;
      progress.value = withTiming(1, { ...TIMING_CONFIG, duration });
    }
  }, [color, duration, progress, fromColor, toColor]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [fromColor.value, toColor.value]
      ),
    };
  });

  return animatedStyle;
}

/**
 * Hook that returns an animated style for smooth border color transitions.
 */
export function useAnimatedBorderColor(color: string, duration: number = DEFAULT_DURATION) {
  const progress = useSharedValue(1);
  const fromColor = useSharedValue(color);
  const toColor = useSharedValue(color);

  useEffect(() => {
    if (toColor.value !== color) {
      fromColor.value = toColor.value;
      toColor.value = color;
      progress.value = 0;
      progress.value = withTiming(1, { ...TIMING_CONFIG, duration });
    }
  }, [color, duration, progress, fromColor, toColor]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [fromColor.value, toColor.value]
      ),
    };
  });

  return animatedStyle;
}

/**
 * Hook that returns an animated style for smooth text color transitions.
 */
export function useAnimatedTextColor(color: string, duration: number = DEFAULT_DURATION) {
  const progress = useSharedValue(1);
  const fromColor = useSharedValue(color);
  const toColor = useSharedValue(color);

  useEffect(() => {
    if (toColor.value !== color) {
      fromColor.value = toColor.value;
      toColor.value = color;
      progress.value = 0;
      progress.value = withTiming(1, { ...TIMING_CONFIG, duration });
    }
  }, [color, duration, progress, fromColor, toColor]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        progress.value,
        [0, 1],
        [fromColor.value, toColor.value]
      ),
    };
  });

  return animatedStyle;
}
