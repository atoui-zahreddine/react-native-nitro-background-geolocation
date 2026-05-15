let configPlugins;
try {
  configPlugins = require('@expo/config-plugins');
} catch {
  configPlugins = require(
    require.resolve('@expo/config-plugins', { paths: [process.cwd()] })
  );
}
const { withStringsXml } = configPlugins;
const { withInfoPlist } = configPlugins;

function withIosBackgroundGeolocation(expoConfig) {
  return withInfoPlist(expoConfig, (modConfig) => {
    const infoPlist = modConfig.modResults;
    const backgroundModes = Array.isArray(infoPlist.UIBackgroundModes)
      ? infoPlist.UIBackgroundModes
      : [];

    if (!backgroundModes.includes('location')) {
      backgroundModes.push('location');
    }

    infoPlist.UIBackgroundModes = backgroundModes;
    infoPlist.NSLocationWhenInUseUsageDescription ??=
      'This app uses your location while tracking is active.';
    infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription ??=
      'This app uses your location in the background to continue tracking.';
    infoPlist.NSLocationAlwaysUsageDescription ??=
      'This app uses your location in the background to continue tracking.';

    modConfig.modResults = infoPlist;
    return modConfig;
  });
}

function withBackgroundGeolocation(expoConfig) {
  const withAndroidStrings = withStringsXml(expoConfig, (modConfig) => {
    const strings = modConfig.modResults.resources.string || [];
    const appId = modConfig.android?.package || 'com.unknown';

    const accountType = `${appId}.bgloc.account`;
    const authority = `${appId}.bgloc.provider`;

    const addOrReplace = (name, value) => {
      const idx = strings.findIndex((s) => s.$.name === name);
      const entry = { $: { name }, _: value };
      if (idx >= 0) {
        strings[idx] = entry;
      } else {
        strings.push(entry);
      }
    };

    addOrReplace('plugin_bgloc_account_type', accountType);
    addOrReplace('plugin_bgloc_content_authority', authority);

    modConfig.modResults.resources.string = strings;
    return modConfig;
  });

  return withIosBackgroundGeolocation(withAndroidStrings);
}

module.exports = withBackgroundGeolocation;
