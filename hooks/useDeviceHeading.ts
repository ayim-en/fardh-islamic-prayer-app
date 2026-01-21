import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
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

interface UseDeviceHeadingReturn {
  heading: SharedValue<number>;
  restartHeading: () => Promise<void>;
}

export const useDeviceHeading = (): UseDeviceHeadingReturn => {
  const heading = useSharedValue(0);
  const lastHeading = useSharedValue(0);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startWatchingHeading = useCallback(async () => {
    try {
      // Remove existing subscription if any
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      // Check current permission status without prompting
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted for compass");
        return;
      }

      subscriptionRef.current = await Location.watchHeadingAsync((headingData) => {
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
  }, [heading, lastHeading]);

  useEffect(() => {
    startWatchingHeading();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [startWatchingHeading]);

  const restartHeading = useCallback(async () => {
    // Reset heading values
    lastHeading.value = 0;
    heading.value = 0;
    await startWatchingHeading();
  }, [startWatchingHeading, heading, lastHeading]);

  return { heading, restartHeading };
};
