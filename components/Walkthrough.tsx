import { Prayers, prayerThemeColors } from "@/constants/prayers";
import { DEFAULT_PRAYER_SETTINGS, SCHOOLS } from "@/constants/prayerSettings";
import { requestNotificationPermissions } from "@/utils/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import React, { useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { AnimatedCrossfadeImage } from "./AnimatedCrossfadeImage";

const WALKTHROUGH_STEPS = [
  {
    id: "Fajr",
    title: "السلام عليكم ",
    description:
      "We built Fardh with a simple intention: to create a minimal prayer app that helps you focus on Salah. No distractions, just devotion.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-fajr.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-welcome.png"),
  },
  {
    id: "Sunrise",
    title: "Ad-Free Experience",
    description:
      "This is a Sadaqah Jariyah project. It is 100% free with no ads, forever. We only ask that keep us in your du’as! ",
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
    title: "Your Location",
    description:
      "We use your location to calculate accurate prayer times and motion sensors to power the Qibla compass. This data stays on your device and is never shared.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-asr.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-location.png"),
  },
  {
    id: "Maghrib",
    title: "Never Miss a Prayer",
    description:
      "Get notified before each prayer time so you can prepare and pray on time. Individual notifications can be toggled for each prayer.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-maghrib.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-notifications.png"),
  },
  {
    id: "Isha",
    title: "Your Madhab",
    description:
      "Select your school of thought for Asr calculation. You can change the calculation method and other settings anytime in the Prayer Time Settings.",
    image: require("@/assets/images/prayer-pro-bg/prayer-pro-bg-isha.png"),
    illustration: require("@/assets/images/walkthrough/walkthrough-madhab.png"),
  },
];

interface WalkthroughProps {
  onComplete: () => void;
}

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [motionGranted, setMotionGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<0 | 1>(
    DEFAULT_PRAYER_SETTINGS.school
  );

  const isLastStep = activeIndex === WALKTHROUGH_STEPS.length - 1;
  const isFirstStep = activeIndex === 0;

  const saveSchool = async (school: 0 | 1) => {
    const settings = {
      ...DEFAULT_PRAYER_SETTINGS,
      school,
    };
    await AsyncStorage.setItem("prayerSettings", JSON.stringify(settings));
  };

  const requestLocationAndMotionPermissions = async () => {
    const [locationResult, motionResult] = await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      DeviceMotion.requestPermissionsAsync(),
    ]);
    setLocationGranted(locationResult.status === "granted");
    setMotionGranted(motionResult.status === "granted");
  };

  const requestNotificationPermission = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      setNotificationsGranted(true);
      // Enable master toggle and all prayers in AsyncStorage
      await AsyncStorage.setItem(
        "notificationsMasterToggle",
        JSON.stringify(true)
      );
      const allEnabled: Record<string, boolean> = {};
      Prayers.forEach((prayer) => {
        allEnabled[prayer] = true;
      });
      await AsyncStorage.setItem(
        "prayerNotifications",
        JSON.stringify(allEnabled)
      );
    }
  };

  const goToNextStep = () => {
    if (isLastStep) {
      if (!locationGranted || !motionGranted) {
        Alert.alert(
          "Permissions Required",
          "Location and motion permissions are required for accurate prayer times and Qibla direction. Please go back and enable permissions to continue.",
          [{ text: "OK" }]
        );
        return;
      }
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
      <AnimatedCrossfadeImage
        source={currentStep.image}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        resizeMode="cover"
      />
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
          <View
            className="rounded-t-3xl px-6 pt-10 pb-12 h-[80%]"
            style={{
              backgroundColor:
                currentStep.id === "Maghrib" || currentStep.id === "Isha"
                  ? "#1a1a2e"
                  : "#ffffff",
            }}
          >
            <Text
              className="text-4xl font-bold text-left mb-4"
              style={{
                color:
                  currentStep.id === "Maghrib" || currentStep.id === "Isha"
                    ? "#ffffff"
                    : "#171717",
              }}
            >
              {currentStep.title}
            </Text>
            <Text
              className="text-base text-left leading-6"
              style={{
                color:
                  currentStep.id === "Maghrib" || currentStep.id === "Isha"
                    ? "#e0e0e0"
                    : "#525252",
              }}
            >
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
              <View className="items-center">
                <Image
                  source={currentStep.illustration}
                  className={`self-center mb-4 ${currentStep.id === "Isha" ? "-mt-4" : currentStep.id === "Fajr" ? "mt-8" : "mt-4"} ${currentStep.id === "Asr" || currentStep.id === "Maghrib" ? "w-[260px] h-[260px]" : currentStep.id === "Isha" ? "w-[280px] h-[280px]" : "w-[328px] h-[328px]"}`}
                  resizeMode="contain"
                />
                {currentStep.id === "Asr" && (
                  <TouchableOpacity
                    className="py-3 px-8 rounded-xl self-center"
                    style={{
                      backgroundColor:
                        locationGranted && motionGranted
                          ? themeColors?.active
                          : themeColors?.inactive,
                    }}
                    onPress={requestLocationAndMotionPermissions}
                    disabled={locationGranted && motionGranted}
                  >
                    <Text className="text-white text-base font-semibold">
                      {locationGranted && motionGranted
                        ? "Permissions Enabled ✓"
                        : "Enable Permissions"}
                    </Text>
                  </TouchableOpacity>
                )}
                {currentStep.id === "Maghrib" && (
                  <TouchableOpacity
                    className="py-3 px-8 rounded-xl self-center"
                    style={{
                      backgroundColor: notificationsGranted
                        ? themeColors?.active
                        : themeColors?.inactive,
                    }}
                    onPress={requestNotificationPermission}
                    disabled={notificationsGranted}
                  >
                    <Text className="text-white text-base font-semibold">
                      {notificationsGranted
                        ? "Notifications Enabled ✓"
                        : "Enable Notifications"}
                    </Text>
                  </TouchableOpacity>
                )}
                {currentStep.id === "Isha" && (
                  <View className="gap-2 -mt-4 items-center">
                    {SCHOOLS.map((school) => (
                      <TouchableOpacity
                        key={school.id}
                        className="py-3 px-8 rounded-lg"
                        style={{
                          backgroundColor:
                            selectedSchool === school.id
                              ? themeColors?.active
                              : "transparent",
                        }}
                        onPress={async () => {
                          setSelectedSchool(school.id);
                          await saveSchool(school.id);
                        }}
                      >
                        <Text
                          className={`text-base text-center ${selectedSchool === school.id ? "text-white" : "text-neutral-300"}`}
                        >
                          {school.name} - {school.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Navigation buttons */}
            <View className="flex-row gap-3 mt-auto">
              {!isFirstStep && (
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{ backgroundColor: themeColors?.inactive }}
                  onPress={isFirstStep ? onComplete : goToPreviousStep}
                >
                  <Text className="text-white text-lg font-semibold">Back</Text>
                </TouchableOpacity>
              )}
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
    </View>
  );
}
