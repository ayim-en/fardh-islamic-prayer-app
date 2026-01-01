import { prayerThemeColors } from "@/constants/prayers";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";

const WALKTHROUGH_STEPS = [
  {
    id: "Fajr",
    title: "Salaam",
    description:
      "We built Fardh with a simple intention: to create a prayer app that honors the sanctity of Salah. No distractions, just devotion.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-fajr.png"),
  },
  {
    id: "Sunrise",
    title: "Purely for Allah",
    description:
      "This is a Sadaqah Jariyah project. It is 100% free with no ads, forever.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-sunrise.png"),
  },
  {
    id: "Dhuhr",
    title: "Modern & Minimal",
    description:
      "Designed for iOS with custom widgets, allowing you to see prayer times on your Home and Lock screens without even opening the app.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-dhur.png"),
  },
  {
    id: "Asr",
    title: "Privacy-First",
    description:
      "We only access your location to calculate accurate prayer times for your city. This data stays on your device and is never sold or tracked.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-asr.png"),
  },
  {
    id: "Maghrib",
    title: "Never Miss a Prayer",
    description:
      "Get notified before each prayer time so you can prepare and pray on time.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-maghrib.png"),
  },
  {
    id: "Isha",
    title: "Your Madhab",
    description:
      "Choose your preferred calculation method and school of thought for accurate prayer times.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-isha.png"),
  },
];

interface WalkthroughProps {
  onComplete: () => void;
}

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastStep = activeIndex === WALKTHROUGH_STEPS.length - 1;
  const isFirstStep = activeIndex === 0;

  const goToNextStep = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setActiveIndex(activeIndex + 1);
    }
  };

  const goToPreviousStep = () => {
    if (!isFirstStep) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const currentStep = WALKTHROUGH_STEPS[activeIndex];
  const themeColors = prayerThemeColors[currentStep.id as keyof typeof prayerThemeColors];

  return (
    <View className="flex-1">
      <ImageBackground
        source={currentStep.image}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        <View className="flex-1 justify-between py-16 px-6">
          {/* Progress bar */}
          <View className="mx-16 h-3 bg-white/30 rounded-full overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${((activeIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%` }}
            />
          </View>

          {/* Content */}
          <View className="flex-1 justify-center items-center px-4">
            <View className="bg-white rounded-3xl px-6 py-8">
              <Text className="text-4xl font-bold text-neutral-900 text-center mb-3">
                {currentStep.title}
              </Text>
              <Text className="text-base text-neutral-600 text-center leading-6">
                {currentStep.description}
              </Text>
            </View>
          </View>

          {/* Navigation buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-4 rounded-xl items-center"
              style={{ backgroundColor: themeColors?.inactive }}
              onPress={isFirstStep ? onComplete : goToPreviousStep}
            >
              <Text className="text-white text-lg font-semibold">
                {isFirstStep ? "Skip" : "Back"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 rounded-xl items-center"
              style={{ backgroundColor: themeColors?.active }}
              onPress={goToNextStep}
            >
              <Text className="text-white text-lg font-semibold">
                {isLastStep ? "Bismillah" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
