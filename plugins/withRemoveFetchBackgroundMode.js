const { withInfoPlist } = require("expo/config-plugins");

// expo-task-manager's autolinked plugin unconditionally adds the legacy "fetch"
// background mode, but this app only uses BGTaskScheduler "processing" tasks
// (expo-background-task). Declaring an unused background mode risks App Store
// rejection under Guideline 2.5.4, so strip it after all other plugins run.
const withRemoveFetchBackgroundMode = (config) => {
  return withInfoPlist(config, (config) => {
    if (Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes =
        config.modResults.UIBackgroundModes.filter((mode) => mode !== "fetch");
    }
    return config;
  });
};

module.exports = withRemoveFetchBackgroundMode;
