import * as Location from "expo-location";
import { useEffect } from "react";
import {
  SharedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// Spring config for smooth rotation
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.5,
};

// Normalize angle difference to handle 360/0 wrap-around
const normalizeAngleDiff = (current: number, target: number): number => {
  let diff = target - current;
  // Handle wrap-around: take the shortest path
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return current + diff;
};

export const useDeviceHeading = (): SharedValue<number> => {
  const heading = useSharedValue(0);
  const lastHeading = useSharedValue(0);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatchingHeading = async () => {
      try {
        // Check current permission status without prompting
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission not granted for compass");
          return;
        }

        subscription = await Location.watchHeadingAsync((headingData) => {
          const compassHeading = headingData.trueHeading ?? headingData.magHeading;

          // Normalize to handle 360/0 boundary smoothly
          const normalizedHeading = normalizeAngleDiff(
            lastHeading.value,
            compassHeading
          );
          lastHeading.value = normalizedHeading;

          // Animate to new heading with spring for smoothness
          heading.value = withSpring(normalizedHeading, SPRING_CONFIG);
        });
      } catch (error) {
        console.error("Error watching heading:", error);
      }
    };

    startWatchingHeading();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [heading, lastHeading]);

  return heading;
};
