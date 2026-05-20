const path = require('path');

module.exports = {
  dependencies: {
    'react-native-nitro-background-geolocation': {
      root: path.resolve(
        __dirname,
        '../../packages/react-native-nitro-background-geolocation'
      ),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
  },
};
