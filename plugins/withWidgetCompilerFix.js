const { withXcodeProject } = require('@expo/config-plugins');

const withWidgetCompilerFix = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const WIDGET_TARGET_NAME = "PrayerWidgets"; // Must match your target name

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
    
    configList.buildConfigurations.forEach((configRef) => {
      const buildConfig = configurations[configRef.value];
      if (buildConfig) {
        console.log(`[withWidgetCompilerFix] Overwriting compiler settings for ${WIDGET_TARGET_NAME} (${buildConfig.name})`);
        
        // Set to empty string to block inheritance
        buildConfig.buildSettings['CC'] = "";
        buildConfig.buildSettings['CXX'] = "";
        buildConfig.buildSettings['LD'] = "";
        buildConfig.buildSettings['LDPLUSPLUS'] = "";
      }
    });

    return config;
  });
};

module.exports = withWidgetCompilerFix;