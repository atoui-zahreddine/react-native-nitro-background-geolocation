import {
  androidEmulator,
  androidPlatform,
} from '@react-native-harness/platform-android';
import {
  appleSimulator,
  applePlatform,
} from '@react-native-harness/platform-apple';

const BUNDLE_ID = 'nitrobackgroundgeolocation.example';
const CI = Boolean(process.env.CI);

export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'main',
  runners: [
    androidPlatform({
      name: 'android',
      device: androidEmulator(
        process.env.HARNESS_ANDROID_AVD ?? 'bumbal-proof-api36-16kb'
      ),
      bundleId: BUNDLE_ID,
    }),
    applePlatform({
      name: 'ios',
      device: appleSimulator(
        process.env.HARNESS_IOS_DEVICE ?? 'iPhone 16 Pro',
        process.env.HARNESS_IOS_VERSION ?? '18.6'
      ),
      bundleId: BUNDLE_ID,
    }),
  ],
  defaultRunner: 'ios',
  bridgeTimeout: CI ? 180000 : 120000,
  testTimeout: CI ? 30000 : 15000,
};
