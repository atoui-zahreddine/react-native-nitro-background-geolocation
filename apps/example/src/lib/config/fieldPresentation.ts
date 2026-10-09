import {
  ActivityType,
  CONFIG_FIELDS,
  LocationAccuracy,
  LocationProvider,
  type ConfigFieldPath,
  type ConfigGroupName,
  type ConfigPlatform,
} from 'react-native-nitro-background-geolocation';
import { CONFIG_FIELD_PATHS, CONFIG_GROUP_NAMES, splitPath } from './shape';

export interface FieldOption {
  label: string;
  value: number;
  description?: string;
}

export interface FieldPresentation {
  label: string;
  subtitle?: string;
  placeholder?: string;
  /** Enum fields: the choices, in display order. */
  options?: FieldOption[];
  /** Shown behind the section's "Advanced" toggle in Settings. */
  advanced?: boolean;
}

export const GROUP_TITLES: Record<ConfigGroupName, string> = {
  tracking: 'Tracking',
  lifecycle: 'Lifecycle',
  activity: 'Activity recognition',
  notification: 'Foreground notification',
  http: 'HTTP sync',
  storage: 'Storage',
  debug: 'Debug',
};

export const FIELD_PRESENTATION: Record<ConfigFieldPath, FieldPresentation> = {
  'tracking.locationProvider': {
    label: 'Location provider',
    subtitle:
      'How locations are collected. Each provider trades points against battery differently.',
    options: [
      {
        label: 'Distance',
        value: LocationProvider.DISTANCE_FILTER,
        description:
          'Elastic distance filtering with stationary detection. Balanced points vs battery — the best all-round choice.',
      },
      {
        label: 'Activity',
        value: LocationProvider.ACTIVITY,
        description:
          'Motion-driven updates (walking, driving, still). Suited to foreground-style tracking.',
      },
      {
        label: 'Raw',
        value: LocationProvider.RAW,
        description:
          'Unfiltered OS fixes. Most points and highest battery use; no stationary detection.',
      },
    ],
  },
  'tracking.desiredAccuracy': {
    label: 'Desired accuracy',
    subtitle:
      'Precision requested from the OS. Higher accuracy costs battery, and the device may still return coarser fixes.',
    options: [
      { label: 'High', value: LocationAccuracy.HIGH },
      { label: 'Medium', value: LocationAccuracy.MEDIUM },
      { label: 'Low', value: LocationAccuracy.LOW },
      { label: 'Passive', value: LocationAccuracy.PASSIVE },
    ],
  },
  'tracking.stationaryRadius': {
    label: 'Stationary radius',
    subtitle:
      "While stopped, how far you must move before aggressive tracking re-engages. Used by the Distance provider's stationary detection.",
  },
  'tracking.distanceFilter': {
    label: 'Distance filter',
    subtitle:
      'Base distance moved before a point is recorded. The Distance provider adds a speed penalty on top, so spacing grows as you go faster.',
  },
  'tracking.interval': {
    label: 'Update interval',
    subtitle:
      'Target time between updates. It caps the point rate even in Distance mode. Raise to save battery, lower for denser tracks.',
  },
  'tracking.fastestInterval': {
    label: 'Fastest interval',
    subtitle:
      'Fastest rate the app will accept updates when another app requests locations faster. Sets the tightest spacing between points.',
  },
  'tracking.pauseLocationUpdates': {
    label: 'Pause location updates',
    subtitle:
      "Let the system pause updates when it thinks you've stopped moving. Saves battery but can miss slow movement.",
  },
  'tracking.saveBatteryOnBackground': {
    label: 'Save battery on background',
    subtitle:
      'Reduce update frequency while the app is in the background to save power.',
  },
  'tracking.activityType': {
    label: 'Activity type',
    subtitle:
      "Tells the system how you're moving so it tunes GPS and auto-pause. Match it to the journey.",
    options: [
      { label: 'Automotive', value: ActivityType.AutomotiveNavigation },
      { label: 'Navigation', value: ActivityType.OtherNavigation },
      { label: 'Fitness', value: ActivityType.Fitness },
      { label: 'Other', value: ActivityType.Other },
    ],
  },
  'lifecycle.stopOnTerminate': {
    label: 'Stop on app terminate',
    subtitle:
      'When on, tracking stops if the app is killed. Turn off to keep recording after the app is swiped away.',
  },
  'lifecycle.startOnBoot': {
    label: 'Start on boot',
    subtitle: 'Resume tracking automatically after the device restarts.',
  },
  'activity.activitiesInterval': {
    label: 'Activities interval',
    subtitle:
      'How often motion type is sampled (walking, driving, still). Larger values save battery but slow detection.',
  },
  'activity.stopOnStillActivity': {
    label: 'Stop on still activity',
    subtitle:
      'Pause updates when the device is detected as still. Deprecated upstream — turn off only if you need fixes while stationary.',
  },
  'notification.notificationsEnabled': {
    label: 'Notifications enabled',
    subtitle:
      'Show the persistent tracking notification. Required for reliable background tracking.',
  },
  'notification.startForeground': {
    label: 'Start foreground service',
    subtitle:
      'Run tracking as a foreground service — this is what keeps location flowing without background-location permission.',
  },
  'notification.notificationTitle': {
    label: 'Notification title',
    subtitle: 'Title shown on the tracking notification.',
  },
  'notification.notificationText': {
    label: 'Notification text',
    subtitle: 'Body text shown on the tracking notification.',
  },
  'notification.notificationIconColor': {
    label: 'Icon color',
    subtitle: 'Accent color for the notification icon, as a #RRGGBB hex value.',
    placeholder: '#RRGGBB',
  },
  'notification.notificationIconLarge': {
    label: 'Large icon (resource name)',
    subtitle: "Drawable resource name for the notification's large icon.",
  },
  'notification.notificationIconSmall': {
    label: 'Small icon (resource name)',
    subtitle:
      'Drawable resource name for the status-bar icon. Leave blank to use the app icon.',
  },
  'http.url': {
    label: 'Post URL',
    subtitle:
      'Endpoint each recorded location is POSTed to. Leave blank to record on-device only.',
    placeholder: 'https://example.com/locations',
  },
  'http.syncUrl': {
    label: 'Sync URL',
    subtitle:
      'Endpoint for batched uploads, triggered by Sync threshold. Leave blank to disable syncing.',
    placeholder: 'https://example.com/sync',
  },
  'http.syncThreshold': {
    label: 'Sync threshold',
    subtitle:
      'Number of locations to buffer before a batch is synced to the Sync URL.',
  },
  'http.httpHeaders': {
    label: 'HTTP headers',
    subtitle:
      'Custom headers sent with every location request, e.g. Authorization.',
    advanced: true,
  },
  'http.postTemplate': {
    label: 'Post template',
    subtitle:
      'Reshape the request body as JSON using @latitude, @longitude, and other placeholders. Leave blank for the default payload.',
    advanced: true,
  },
  'storage.maxLocations': {
    label: 'Max stored locations',
    subtitle:
      'How many locations to keep on-device before the oldest are dropped.',
  },
  'debug.debug': {
    label: 'Debug (sounds & notifications)',
    subtitle:
      'Plays sounds and shows debug notifications on tracking events. For development only.',
  },
};

export interface ConfigSection {
  group: ConfigGroupName;
  title: string;
  fields: ConfigFieldPath[];
}

export const CONFIG_SECTIONS: ConfigSection[] = CONFIG_GROUP_NAMES.map(
  (group) => ({
    group,
    title: GROUP_TITLES[group],
    fields: CONFIG_FIELD_PATHS.filter((path) => splitPath(path)[0] === group),
  })
);

/** The one platform that reads `path`, or undefined when both do. */
export function soleOwner(path: ConfigFieldPath): ConfigPlatform | undefined {
  const { platforms } = CONFIG_FIELDS[path];
  return platforms.length === 1 ? platforms[0] : undefined;
}

export function formatField(path: ConfigFieldPath, value: unknown): string {
  if (value === undefined || value === null) {
    return '—';
  }
  const { options } = FIELD_PRESENTATION[path];
  if (options) {
    return options.find((option) => option.value === value)?.label ?? '—';
  }
  switch (typeof value) {
    case 'boolean':
      return value ? 'On' : 'Off';
    case 'number': {
      const { units } = CONFIG_FIELDS[path];
      return units ? `${value} ${units}` : String(value);
    }
    case 'string':
      return value.length > 0 ? value : '—';
    case 'object':
      return Object.keys(value).length > 0 ? JSON.stringify(value) : '—';
    default:
      return String(value);
  }
}
