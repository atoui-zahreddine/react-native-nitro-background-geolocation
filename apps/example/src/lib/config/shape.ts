import {
  ActivityType,
  CONFIG_FIELDS,
  CONFIG_GROUPS,
  type AppliedConfig,
  type ConfigFieldPath,
  type ConfigGroupName,
  type ConfigureOptions,
} from 'react-native-nitro-background-geolocation';

type FieldMap = Record<string, unknown>;

const isPlainObject = (value: unknown): value is FieldMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const CONFIG_GROUP_NAMES = Object.keys(
  CONFIG_GROUPS
) as ConfigGroupName[];

export const CONFIG_FIELD_PATHS = Object.keys(
  CONFIG_FIELDS
) as ConfigFieldPath[];

export function splitPath(path: ConfigFieldPath): [ConfigGroupName, string] {
  const [group, field] = path.split('.') as [ConfigGroupName, string];
  return [group, field];
}

export function readField(
  config: ConfigureOptions | AppliedConfig,
  path: ConfigFieldPath
): unknown {
  const [group, field] = splitPath(path);
  return (config[group] as FieldMap | undefined)?.[field];
}

// Older app builds stored activityType by its enum member name.
function upgradeValue(path: ConfigFieldPath, value: unknown): unknown {
  if (path === 'tracking.activityType' && typeof value === 'string') {
    return ActivityType[value as keyof typeof ActivityType];
  }
  return value;
}

/**
 * Reads a stored config into the nested write shape. Accepts the nested shape
 * and the flat shape older app builds persisted (`{ distanceFilter, url, … }`),
 * per group, and drops values whose type does not match the contract.
 */
export function nestConfig(raw: unknown): ConfigureOptions {
  const source = isPlainObject(raw) ? raw : {};
  const nested: Record<string, FieldMap> = {};
  for (const path of CONFIG_FIELD_PATHS) {
    const [group, field] = splitPath(path);
    const groupValue = source[group];
    const value = upgradeValue(
      path,
      isPlainObject(groupValue) ? groupValue[field] : source[field]
    );
    const fallback = CONFIG_FIELDS[path].default;
    const accepted =
      fallback === null
        ? value === null || isPlainObject(value)
        : typeof value === typeof fallback;
    if (accepted) {
      nested[group] = { ...nested[group], [field]: value };
    }
  }
  return nested as ConfigureOptions;
}

export function applyOptions(
  base: AppliedConfig,
  options: ConfigureOptions
): AppliedConfig {
  const applied = { ...base } as Record<ConfigGroupName, FieldMap>;
  for (const group of CONFIG_GROUP_NAMES) {
    applied[group] = { ...applied[group], ...options[group] };
  }
  return applied as unknown as AppliedConfig;
}
