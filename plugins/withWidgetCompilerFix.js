const { withXcodeProject } = require('@expo/config-plugins');

const withWidgetCompilerFix = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    // This must match the "targetName" defined in your app.json
    const WIDGET_TARGET_NAME = "PrayerWidgets"; 

    const target = xcodeProject.pbxTargetByName(WIDGET_TARGET_NAME);
    
    if (!target) {
      console.warn(`[withWidgetCompilerFix] Could not find target '${WIDGET_TARGET_NAME}' to fix.`);
      return config;
    }

    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    const buildConfigList = target.buildConfigurationList;

    if (!buildConfigList) {
       return config;
    }

    const configList = xcodeProject.pbxXCConfigurationList()[buildConfigList];
    
    // Iterate through all build configurations (Debug, Release) for the Widget target
    configList.buildConfigurations.forEach((configRef) => {
      const buildConfig = configurations[configRef.value];
      if (buildConfig) {
        console.log(`[withWidgetCompilerFix] Cleaning compiler settings for ${WIDGET_TARGET_NAME} (${buildConfig.name})`);
        
        // Remove React Native compiler overrides specifically for the widget
        // This forces Xcode to use the default Apple compiler (clang)
        delete buildConfig.buildSettings['CC'];
        delete buildConfig.buildSettings['CXX'];
        delete buildConfig.buildSettings['LD'];
        delete buildConfig.buildSettings['LDPLUSPLUS'];
      }
    });

    return config;
  });
};

module.exports = withWidgetCompilerFix;