const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');

const libRoot = path.resolve(
  __dirname,
  '../../packages/react-native-nitro-background-geolocation'
);
const pkg = require(path.join(libRoot, 'package.json'));

module.exports = function (api) {
  api.cache(true);

  return getConfig(
    {
      // A no-op unless react-native-harness runs the bundle.
      presets: ['babel-preset-expo', 'react-native-harness/babel-preset'],
    },
    { root: libRoot, pkg }
  );
};
