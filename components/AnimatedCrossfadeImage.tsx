import { Image, ImageContentFit, ImageSource, ImageStyle } from "expo-image";
import React from "react";
import { StyleSheet } from "react-native";

interface AnimatedCrossfadeImageProps {
  source: ImageSource | null;
  duration?: number;
  style?: ImageStyle;
  resizeMode?: ImageContentFit;
}

/**
 * A component that crossfades between images when the source changes.
 * Uses expo-image's built-in transition support.
 */
export const AnimatedCrossfadeImage: React.FC<AnimatedCrossfadeImageProps> = ({
  source,
  duration = 600,
  style,
  resizeMode = "cover",
}) => {
  if (!source) return null;

  return (
    <Image
      source={source}
      style={[styles.image, style]}
      contentFit={resizeMode}
      transition={{
        duration,
        effect: "cross-dissolve",
      }}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
});
