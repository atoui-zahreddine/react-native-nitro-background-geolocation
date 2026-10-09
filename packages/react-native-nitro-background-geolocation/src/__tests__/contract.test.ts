import { describe, expect, expectTypeOf, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONFIG_CONTRACT,
  LOCATION_OPTIONS_CONTRACT,
  ActivityType,
  LocationAccuracy,
  LocationProvider,
} from '../NitroBackgroundGeolocation.nitro';
import type {
  AppliedConfig,
  ConfigureOptions,
} from '../NitroBackgroundGeolocation.nitro';
import {
  CONFIG_DEFAULTS,
  CONFIG_FIELDS,
  LOCATION_OPTIONS_DEFAULTS,
  foreignFields,
  ownsField,
} from '../contract';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const KOTLIN =
  'android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation';
const SPEC = 'src/NitroBackgroundGeolocation.nitro.ts';

type Entry = Record<string, any>;
const FIELDS: [string, Entry][] = [
  ...Object.entries(CONFIG_CONTRACT).flatMap(([group, entries]) =>
    Object.entries(entries).map(
      ([field, entry]) => [`${group}.${field}`, entry] as [string, Entry]
    )
  ),
  ...Object.entries(LOCATION_OPTIONS_CONTRACT).map(
    ([field, entry]) => [`locationOptions.${field}`, entry] as [string, Entry]
  ),
];

describe('contract invariants', () => {
  it.each(FIELDS)(
    '%s declares platforms, native keys and prose',
    (_, entry) => {
      expect(entry.platforms.length).toBeGreaterThan(0);
      expect(entry.description).toBeTruthy();
      for (const platform of ['android', 'ios']) {
        if (entry.platforms.includes(platform)) {
          expect(entry.native[platform]?.key).toBeTruthy();
        } else {
          // A binding for a platform that does not read the field would be a
          // second, contradicting statement of ownership.
          expect(entry.native[platform]).toBeUndefined();
        }
      }
    }
  );

  // Finding from the prototype: a null default is untyped in Kotlin, so the
  // native type has to be declared.
  it.each(FIELDS)(
    '%s declares a native type when it defaults to null',
    (_, entry) => {
      if (entry.default === null) {
        expect(entry.nativeType?.android).toBeTruthy();
      }
    }
  );

  // Nitrogen silently emits broken native code for a reserved word.
  it('uses no name reserved in Kotlin, Swift, Java or C++', () => {
    const reserved = ['as', 'is', 'in', 'val', 'var', 'fun', 'object', 'class'];
    for (const [path] of FIELDS) {
      for (const part of path.split('.')) {
        expect(reserved).not.toContain(part.toLowerCase());
      }
    }
  });

  // `as const` narrows a default to a literal type, which breaks derivation and
  // makes nitrogen reject the derived optional as an inline union.
  it('is not frozen by `as const`', () => {
    const source = read(SPEC);
    const declaration = source.slice(
      source.indexOf('export const TRACKING_CONTRACT'),
      source.indexOf('type ContractValue')
    );
    expect(declaration.length).toBeGreaterThan(0);
    expect(declaration).not.toContain('as const');
  });

  it('keeps null as a value on exactly the two fields that permit it', () => {
    const nullable = FIELDS.filter(([, entry]) => entry.nullable).map(
      ([path]) => path
    );
    expect(nullable).toEqual(['http.httpHeaders', 'http.postTemplate']);
  });
});

describe('platform ownership is derived from what native reads', () => {
  it('reads activitiesInterval on both platforms, against the old prose', () => {
    expect(CONFIG_FIELDS['activity.activitiesInterval'].platforms).toEqual([
      'android',
      'ios',
    ]);
  });

  it('gives the whole notification group to Android', () => {
    const notification = Object.entries(CONFIG_FIELDS).filter(([path]) =>
      path.startsWith('notification.')
    );
    expect(notification).toHaveLength(7);
    for (const [, meta] of notification) {
      expect(meta.platforms).toEqual(['android']);
    }
  });

  it.each([
    ['tracking.interval', ['android']],
    ['tracking.fastestInterval', ['android']],
    ['tracking.pauseLocationUpdates', ['ios']],
    ['tracking.saveBatteryOnBackground', ['ios']],
    ['tracking.activityType', ['ios']],
    ['lifecycle.startOnBoot', ['android']],
    ['activity.stopOnStillActivity', ['android']],
  ])('%s is owned by %j', (path, platforms) => {
    expect(CONFIG_FIELDS[path as keyof typeof CONFIG_FIELDS].platforms).toEqual(
      platforms
    );
  });
});

describe('the public shape', () => {
  // The check that stops a field being added to the spec without a contract
  // entry: the roots carry exactly the contract's groups, and every group type
  // is mapped over its contract.
  it('carries exactly the contract groups at the root, in both families', () => {
    const source = read(SPEC);
    for (const name of ['ConfigureOptions', 'AppliedConfig']) {
      const body = source.slice(
        source.indexOf(`export interface ${name} {`),
        source.indexOf('}', source.indexOf(`export interface ${name} {`))
      );
      const keys = [...body.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);
      expect(keys).toEqual(Object.keys(CONFIG_CONTRACT));
    }
    expectTypeOf<keyof ConfigureOptions>().toEqualTypeOf<
      keyof typeof CONFIG_CONTRACT
    >();
    expectTypeOf<keyof AppliedConfig>().toEqualTypeOf<
      keyof typeof CONFIG_CONTRACT
    >();
  });

  it('declares no group or field type outside the contract', () => {
    const source = read(SPEC);
    const groupTypes = [
      ...source.matchAll(
        /^export type (\w+)(Options|Config) = \{\n\s+\[K in keyof typeof (\w+)\]/gm
      ),
    ];
    // 7 groups x 2 families, plus LocationOptions.
    expect(groupTypes).toHaveLength(15);
    expect(source).not.toMatch(/export type Nullable(String|Number|Boolean)/);
    expect(source).not.toContain('enum ServiceMode');
  });

  it('types a read as plain values', () => {
    expectTypeOf<
      AppliedConfig['tracking']['distanceFilter']
    >().toEqualTypeOf<number>();
    expectTypeOf<
      AppliedConfig['tracking']['activityType']
    >().toEqualTypeOf<ActivityType>();
    expectTypeOf<AppliedConfig['http']['httpHeaders']>().toEqualTypeOf<Record<
      string,
      string
    > | null>();
  });
});

describe('published defaults', () => {
  it('exposes one default per field, matching the contract', () => {
    for (const [group, entries] of Object.entries(CONFIG_CONTRACT)) {
      const defaults = CONFIG_DEFAULTS[group as keyof AppliedConfig];
      expect(Object.keys(defaults)).toEqual(Object.keys(entries));
      for (const [field, entry] of Object.entries(entries)) {
        expect(defaults[field as keyof typeof defaults]).toEqual(entry.default);
      }
    }
  });

  it('holds the values native held before the contract', () => {
    expect(CONFIG_DEFAULTS.tracking).toEqual({
      locationProvider: LocationProvider.DISTANCE_FILTER,
      desiredAccuracy: LocationAccuracy.MEDIUM,
      stationaryRadius: 50,
      distanceFilter: 50,
      interval: 5000,
      fastestInterval: 1000,
      pauseLocationUpdates: false,
      saveBatteryOnBackground: false,
      activityType: ActivityType.OtherNavigation,
    });
    expect(CONFIG_DEFAULTS.http.url).toBe('');
    expect(CONFIG_DEFAULTS.http.httpHeaders).toBeNull();
    expect(CONFIG_DEFAULTS.storage.maxLocations).toBe(10000);
  });

  it('gives getCurrentLocation one default per field on both platforms', () => {
    expect(LOCATION_OPTIONS_DEFAULTS).toEqual({
      timeout: 30000,
      maximumAge: 0,
      enableHighAccuracy: false,
    });
  });
});

describe('CONFIG_FIELDS', () => {
  it('keys every field by its dotted path, in declaration order', () => {
    const expected = Object.entries(CONFIG_CONTRACT).flatMap(
      ([group, entries]) =>
        Object.keys(entries).map((field) => `${group}.${field}`)
    );
    expect(Object.keys(CONFIG_FIELDS)).toEqual(expected);
    expect(expected).toHaveLength(27);
  });

  it('carries the units and range metadata', () => {
    expect(CONFIG_FIELDS['http.syncThreshold'].range).toEqual({
      min: 1,
      max: 1000,
      step: 1,
      units: 'locations',
    });
    expect(CONFIG_FIELDS['tracking.interval'].units).toBe('ms');
  });

  it('answers ownership without a native call', () => {
    expect(ownsField('android', 'http.url')).toBe(true);
    expect(ownsField('ios', 'tracking.interval')).toBe(false);
    expect(ownsField('android', 'http.nonsense')).toBe(false);
  });

  it('names the foreign writes a platform drops', () => {
    expect(
      foreignFields('android', {
        tracking: { distanceFilter: 10, pauseLocationUpdates: true },
        notification: { notificationTitle: 'x' },
      })
    ).toEqual(['tracking.pauseLocationUpdates']);
    expect(
      foreignFields('ios', { notification: { notificationTitle: 'x' } })
    ).toEqual(['notification.notificationTitle']);
  });
});

describe('generated artifacts are in sync with the contract', () => {
  const GENERATED = [
    `${KOTLIN}/generated/ConfigDefaults.kt`,
    `${KOTLIN}/generated/ConfigContractMapper.kt`,
    'ios/generated/ConfigDefaults.swift',
    'ios/generated/ConfigDefaults.h',
    'ios/generated/ConfigContractMapper.swift',
  ];

  it.each(GENERATED)('%s carries the do-not-edit banner', (relative) => {
    expect(read(relative)).toContain('GENERATED from the Config Contract');
  });

  it('maps every field on both platforms, owned or not', () => {
    const kotlin = read(`${KOTLIN}/generated/ConfigContractMapper.kt`);
    const swift = read('ios/generated/ConfigContractMapper.swift');
    for (const [path] of FIELDS.filter(
      ([p]) => !p.startsWith('locationOptions')
    )) {
      const field = path.split('.')[1];
      expect(kotlin).toContain(`${field} = `);
      expect(swift).toContain(`${field}: `);
    }
  });

  it('never writes a field the platform does not own', () => {
    const kotlin = read(`${KOTLIN}/generated/ConfigContractMapper.kt`);
    const swift = read('ios/generated/ConfigContractMapper.swift');
    expect(kotlin).not.toContain('options.pauseLocationUpdates');
    expect(kotlin).not.toContain('options.activityType');
    expect(swift).not.toContain('options.interval');
    expect(swift).not.toContain('options.notificationTitle');
  });

  it('reads a foreign field as its contract default', () => {
    const kotlin = read(`${KOTLIN}/generated/ConfigContractMapper.kt`);
    const swift = read('ios/generated/ConfigContractMapper.swift');
    expect(kotlin).toContain('activityType = ActivityType.OTHERNAVIGATION');
    expect(swift).toContain('interval: 5000');
    expect(swift).toContain('notificationTitle: "Background tracking"');
  });

  it('emits the native key, not the public name, where they diverge', () => {
    const kotlin = read(`${KOTLIN}/generated/ConfigContractMapper.kt`);
    expect(kotlin).toContain('config.setLargeNotificationIcon(it)');
    expect(kotlin).toContain('config.setDebugging(it)');
    expect(kotlin).toContain('applyLocationTemplate');
    expect(read('ios/generated/ConfigContractMapper.swift')).toContain(
      'key: "postTemplate"'
    );
  });

  // Generated code must never name a nitro variant type: the same field derives
  // `Variant_NullType_*` when optional and keeps the `Nullable*` alias when not.
  it('names no variant type and routes null-permitting fields through an escape', () => {
    const kotlin = read(`${KOTLIN}/generated/ConfigContractMapper.kt`);
    const swift = read('ios/generated/ConfigContractMapper.swift');
    expect(kotlin).not.toContain('Variant_');
    expect(swift).not.toContain('Variant_');
    expect(kotlin).toContain('ConfigConverters.applyHeaders');
    expect(kotlin).not.toContain('options.httpHeaders?.let');
  });

  it('leaves no hand-written variant helper in either mapper', () => {
    expect(read(`${KOTLIN}/ConfigMapper.kt`)).not.toContain('Variant_');
    expect(read('ios/NitroBackgroundGeolocation.swift')).not.toContain(
      'Variant_'
    );
  });

  it('stops the native cores holding an authored default', () => {
    const java = read(
      'android/src/main/java/com/marianhello/bgloc/Config.java'
    );
    const getDefault = java.slice(
      java.indexOf('public static Config getDefault()'),
      java.indexOf(
        'return config;',
        java.indexOf('public static Config getDefault()')
      )
    );
    expect(getDefault).not.toMatch(/\s=\s(\d|true|false|")/);

    const objc = read('ios/common/BackgroundGeolocation/MAURConfig.m');
    const init = objc.slice(
      objc.indexOf('-(instancetype) initWithDefaults'),
      objc.indexOf(
        'return self;',
        objc.indexOf('-(instancetype) initWithDefaults')
      )
    );
    expect(init).not.toContain('numberWithInt');
    expect(init).not.toContain('numberWithBool');
    expect(init).not.toContain('@"OtherNavigation"');
    expect(read('ios/generated/ConfigDefaults.h')).toContain(
      '#define BG_TRACKING_DEFAULT_ACTIVITY_TYPE @"OtherNavigation"'
    );
  });

  it('no longer pins activitiesInterval with an inverted null guard', () => {
    const objc = read('ios/common/BackgroundGeolocation/MAURConfig.m');
    expect(objc).toContain('if (isNotNull(config[@"activitiesInterval"]))');
    expect(objc).not.toContain('if (isNull(config[@"activitiesInterval"]))');
  });

  it('guards the postTemplate read that crashed on a fresh install', () => {
    const objc = read('ios/common/BackgroundGeolocation/MAURConfig.m');
    expect(objc).toContain(
      'if ([self hasTemplate]) [dict setObject:self._template forKey:@"postTemplate"]'
    );
  });

  it('kills the re-hardcoded stationaryRadius default', () => {
    expect(read(`${KOTLIN}/ConfigMapper.kt`)).not.toContain('50f');
  });

  it('derives every docs row, including escaped unions and platforms', () => {
    const docs = (group: string) =>
      read(`../../apps/docs/docs/generated/_config-${group}.md`);
    expect(docs('http')).toContain('| `http.url` |');
    expect(docs('http')).toContain('1–1000 locations');
    // An unescaped pipe would break the markdown cell.
    expect(docs('http')).toContain('Record<string, string> \\| null');
    expect(docs('tracking')).toContain(
      '| `tracking.distanceFilter` | `number` | `50` | Android, iOS |'
    );
    expect(docs('tracking')).toContain(
      '`ActivityType.OtherNavigation` | iOS |'
    );
    // MDX refuses an HTML comment, which broke the docs build silently.
    expect(docs('http')).not.toContain('<!--');
    expect(docs('notification')).toContain(
      '| `notification.notificationTitle` | `string` | `"Background tracking"` | Android |'
    );
  });

  it('keeps the README configuration section derived', () => {
    const readme = read('../../README.md');
    const section = readme.slice(
      readme.indexOf('<!-- CONFIG-CONTRACT:START -->'),
      readme.indexOf('<!-- CONFIG-CONTRACT:END -->')
    );
    for (const [path] of FIELDS.filter(
      ([p]) => !p.startsWith('locationOptions')
    )) {
      expect(section).toContain(`\`${path}\``);
    }
    expect(readme).not.toMatch(
      /`(distanceFilter|interval)` \| `number \\\| null`/
    );
  });
});
