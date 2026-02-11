/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "PrayerWidgets",
  displayName: "Prayer Times",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  entitlements: {
    "com.apple.security.application-groups": ["group.com.ayimen.fardh"],
  },
  colors: {
    AccentColor: {
      light: "#568FAF",
      dark: "#7EB8D8",
    },
    WidgetBackground: {
      light: "#FFFFFF",
      dark: "#1a1a2e",
    },
  },
  // Ensure proper build settings for Expo SDK 54
  buildSettings: {
    SWIFT_VERSION: "5.0",
    IPHONEOS_DEPLOYMENT_TARGET: "17.0",
  },
};