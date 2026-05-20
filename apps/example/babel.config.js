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
      presets: ['babel-preset-expo'],
    },
    { root: libRoot, pkg }
  );
};
