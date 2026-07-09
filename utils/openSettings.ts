import { Linking, Platform } from "react-native";

// Deep-links to the app's page in the OS Settings so the user can change permissions
export function openSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else {
    Linking.openSettings();
  }
}
