import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './src/App';

AppRegistry.registerHeadlessTask(
  'BackgroundGeolocationHeadlessTask',
  () =>
    async ({ event, params }) => {
      console.log('[HeadlessTask]', event, params);
    }
);

registerRootComponent(App);
