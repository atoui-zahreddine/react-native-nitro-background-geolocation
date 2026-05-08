let configPlugins;
try {
  configPlugins = require('@expo/config-plugins');
} catch {
  configPlugins = require(
    require.resolve('@expo/config-plugins', { paths: [process.cwd()] })
  );
}
const { withStringsXml } = configPlugins;

function withBackgroundGeolocation(expoConfig) {
  return withStringsXml(expoConfig, (modConfig) => {
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
}

module.exports = withBackgroundGeolocation;
