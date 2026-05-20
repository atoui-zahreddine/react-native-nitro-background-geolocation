import { registerRootComponent } from 'expo';
import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

import App from './src/App';

registerHeadlessHandler(async (event) => {
  switch (event.event) {
    case 'location':
      console.log('[HeadlessTask] location', event.location);
      break;
    case 'stationary':
      console.log('[HeadlessTask] stationary', event.location);
      break;
    case 'activity':
      console.log('[HeadlessTask] activity', event.activity);
      break;
  }
});

registerRootComponent(App);
