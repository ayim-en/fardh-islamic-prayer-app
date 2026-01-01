import { prayerThemeColors } from "@/constants/prayers";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Image,
} from "react-native";

const WALKTHROUGH_STEPS = [
  {
    id: "Fajr",
    title: "Salaam",
    description:
      "We built Fardh with a simple intention: to create a prayer app that honors the sanctity of Salah. No distractions, just devotion.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-fajr.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-welcome.png"),
  },
  {
    id: "Sunrise",
    title: "Purely for Allah",
    description:
      "This is a Sadaqah Jariyah project. It is 100% free with no ads, forever.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-sunrise.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-ads.png"),
  },
  {
    id: "Dhuhr",
    title: "Modern & Minimal",
    description:
      "Designed for iOS with custom widgets, allowing you to see prayer times on your Home and Lock screens without even opening the app.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-dhur.png"),
    illustrations: [
      require("@/assets/images/walkthrough/walkthrough-widget-large.png"),
      require("@/assets/images/walkthrough/walkthrough-widget-small.png"),
    ],
  },
  {
    id: "Asr",
    title: "Privacy-First",
    description:
      "We only access your location to calculate accurate prayer times for your city. This data stays on your device and is never sold or tracked.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-asr.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-location.png"),
  },
  {
    id: "Maghrib",
    title: "Never Miss a Prayer",
    description:
      "Get notified before each prayer time so you can prepare and pray on time.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-maghrib.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-notifications.png"),
  },
  {
    id: "Isha",
    title: "Your Madhab",
    description:
      "Choose your preferred calculation method and school of thought for accurate prayer times.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-isha.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-madhab.png"),
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
  const themeColors =
    prayerThemeColors[currentStep.id as keyof typeof prayerThemeColors];

  return (
    <View className="flex-1">
      <ImageBackground
        source={currentStep.image}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        <View className="flex-1 justify-between pt-16">
          {/* Progress bar */}
          <View className="mx-20 h-3 bg-white/30 rounded-full overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{
                width: `${((activeIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%`,
              }}
            />
          </View>

          {/* Content */}
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl px-6 pt-10 pb-12 h-[80%]">
              <Text className="text-4xl font-bold text-neutral-900 text-left mb-4">
                {currentStep.title}
              </Text>
              <Text className="text-base text-neutral-600 text-left leading-6">
                {currentStep.description}
              </Text>
              {currentStep.illustrations ? (
                <View className="items-center -mt-14">
                  {currentStep.illustrations.map((img, index) => (
                    <Image
                      key={index}
                      source={img}
                      className={`-mb-16 ${index === 0 ? "w-72 h-72" : "w-56 h-56"}`}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              ) : currentStep.illustration ? (
                <Image
                  source={currentStep.illustration}
                  className="w-[328px] h-[328px] self-center mb-6 mt-4"
                  resizeMode="contain"
                />
              ) : null}

              {/* Navigation buttons */}
              <View className="flex-row gap-3 mt-auto">
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
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
