import {
  CONFIG_CONTRACT,
  LOCATION_OPTIONS_CONTRACT,
} from './NitroBackgroundGeolocation.nitro';
import type {
  AppliedConfig,
  ConfigureOptions,
  LocationOptions,
} from './NitroBackgroundGeolocation.nitro';

/**
 * Runtime view of the Config Contract. Plain TypeScript on purpose — it is not
 * part of the nitro spec, so reading it costs no JSI crossing and a consumer can
 * consult it in a render path or before any native call.
 */

export type ConfigPlatform = 'android' | 'ios';

export interface ConfigRange {
  min: number;
  max: number;
  step: number;
  units: string;
}

export interface ConfigFieldMeta {
  /** Which platforms actually read this field. Both means shared. */
  platforms: ConfigPlatform[];
  /** The published default. Passing it explicitly is how a reset is expressed. */
  default: unknown;
  /** Present when the field is a quantity. */
  units?: string;
  /** Present when the field carries constraint metadata. */
  range?: ConfigRange;
  /** How the field behaves differently on a platform that reads it. */
  platformNotes?: Partial<Record<ConfigPlatform, string>>;
  /** Reference prose for the docs table and IDE hover, never UI copy. */
  description: string;
}

/** Every group in the contract, in declaration order. */
export const CONFIG_GROUPS = CONFIG_CONTRACT;

export type ConfigGroupName = keyof typeof CONFIG_GROUPS;

/** A dotted `group.field` path, e.g. `'tracking.distanceFilter'`. */
export type ConfigFieldPath = {
  [G in ConfigGroupName]: `${G}.${keyof (typeof CONFIG_GROUPS)[G] & string}`;
}[ConfigGroupName];

function meta(entry: Record<string, any>): ConfigFieldMeta {
  return {
    platforms: entry.platforms,
    default: entry.default,
    ...(entry.units ? { units: entry.units } : {}),
    ...(entry.range ? { range: entry.range } : {}),
    ...(entry.platformNotes ? { platformNotes: entry.platformNotes } : {}),
    description: entry.description,
  };
}

function flatten(): Record<ConfigFieldPath, ConfigFieldMeta> {
  const fields: Record<string, ConfigFieldMeta> = {};
  for (const [group, entries] of Object.entries(CONFIG_GROUPS)) {
    for (const [field, entry] of Object.entries(entries)) {
      fields[`${group}.${field}`] = meta(entry);
    }
  }
  return fields as Record<ConfigFieldPath, ConfigFieldMeta>;
}

/**
 * Every configuration field keyed by its dotted `group.field` path, in
 * declaration order.
 *
 * Consumers derive platform ownership, defaults, units and reference prose from
 * here instead of restating them. A field the running platform does not own
 * still reads as its default from `getConfig()` — ask this map whether the
 * value is in effect.
 */
export const CONFIG_FIELDS = flatten();

/** Published defaults for every group. Reset a field by passing one of these. */
export const CONFIG_DEFAULTS = Object.fromEntries(
  Object.entries(CONFIG_GROUPS).map(([group, entries]) => [
    group,
    Object.fromEntries(
      Object.entries(entries).map(([field, entry]) => [field, entry.default])
    ),
  ])
) as unknown as AppliedConfig;

/** What `getCurrentLocation()` uses for a field the caller omits. */
export const LOCATION_OPTIONS_DEFAULTS = Object.fromEntries(
  Object.entries(LOCATION_OPTIONS_CONTRACT).map(([field, entry]) => [
    field,
    entry.default,
  ])
) as Required<LocationOptions>;

/** Whether `platform` reads `path`, e.g. `ownsField('android', 'http.url')`. */
export function ownsField(platform: ConfigPlatform, path: string): boolean {
  return (
    CONFIG_FIELDS[path as ConfigFieldPath]?.platforms.includes(platform) ??
    false
  );
}

/**
 * The fields in `options` that `platform` does not read, as dotted paths. Native
 * drops these writes; this lets the caller say so.
 */
export function foreignFields(
  platform: ConfigPlatform,
  options: ConfigureOptions
): ConfigFieldPath[] {
  const foreign: ConfigFieldPath[] = [];
  for (const [group, values] of Object.entries(options)) {
    for (const [field, value] of Object.entries(values ?? {})) {
      const path = `${group}.${field}`;
      if (value !== undefined && !ownsField(platform, path)) {
        foreign.push(path as ConfigFieldPath);
      }
    }
  }
  return foreign;
}
