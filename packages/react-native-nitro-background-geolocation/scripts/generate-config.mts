/**
 * Emits every derived configuration artifact from the Config Contract.
 *
 * Run with `yarn generate:config`. Output is committed, so a PR that changes a
 * default shows the native constants, the mappers and the docs rows changing
 * beside it.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as spec from '../src/NitroBackgroundGeolocation.nitro.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANNER = 'GENERATED from the Config Contract. Do not edit.';

type Platform = 'android' | 'ios';
interface Binding {
  key: string;
  setter?: string;
  cast?: 'int' | 'float' | 'long';
  converter?: string;
  enumAs?: 'value' | 'name';
}
interface Entry {
  default: unknown;
  platforms: Platform[];
  description: string;
  nullable?: boolean;
  enumName?: string;
  units?: string;
  range?: { min: number; max: number; step: number; units: string };
  platformNotes?: Partial<Record<Platform, string>>;
  nativeType?: { android: string };
  native: Partial<Record<Platform, Binding>>;
}
type Fields = [string, Entry][];

const GROUPS = Object.entries(spec.CONFIG_CONTRACT).map(
  ([group, entries]) => [group, Object.entries(entries) as Fields] as const
);
const LOCATION_OPTIONS = Object.entries(
  spec.LOCATION_OPTIONS_CONTRACT
) as Fields;

const pascal = (name: string) => name[0]!.toUpperCase() + name.slice(1);
const screaming = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
const owns = (entry: Entry, platform: Platform) =>
  entry.platforms.includes(platform);

/** The TS member name of an enum default, via the runtime reverse mapping. */
function enumMember(entry: Entry): string {
  const values = (spec as Record<string, any>)[entry.enumName!];
  return values[entry.default as number];
}

function enumMembers(name: string): [string, number][] {
  const values = (spec as Record<string, any>)[name];
  return Object.entries(values).filter(
    (pair): pair is [string, number] => typeof pair[1] === 'number'
  );
}

// --- contract invariants: fail the build rather than emit broken native code --

const RESERVED = new Set(
  (
    'as break class continue do else false for fun if in interface is null object package return ' +
    'super this throw true try typealias val var when while associatedtype deinit enum extension ' +
    'func import init inout internal let operator protocol public static struct subscript guard ' +
    'defer repeat where catch abstract assert boolean byte case char const default double extends ' +
    'final finally float goto implements instanceof int long native new private protected short ' +
    'switch synchronized throws transient void volatile auto bool delete explicit friend inline ' +
    'mutable namespace nullptr register sizeof template typedef typeid typename union unsigned ' +
    'using virtual'
  ).split(' ')
);

function check(): void {
  const all: [string, Fields][] = [
    ...GROUPS.map(([group, fields]) => [group, fields] as [string, Fields]),
    ['locationOptions', LOCATION_OPTIONS],
  ];
  for (const [group, fields] of all) {
    if (RESERVED.has(group.toLowerCase())) {
      throw new Error(`contract: group "${group}" is a reserved word`);
    }
    for (const [field, entry] of fields) {
      const where = `${group}.${field}`;
      if (RESERVED.has(field.toLowerCase())) {
        throw new Error(
          `contract: "${where}" is a reserved word in Kotlin, Swift, Java or C++ — nitrogen would emit broken native code silently`
        );
      }
      if (!entry.platforms?.length) {
        throw new Error(`contract: "${where}" declares no platforms`);
      }
      if (!entry.description) {
        throw new Error(`contract: "${where}" has no description prose`);
      }
      if (entry.enumName && enumMember(entry) === undefined) {
        throw new Error(
          `contract: "${where}" names enum ${entry.enumName}, which the spec does not export with that default`
        );
      }
      for (const platform of ['android', 'ios'] as Platform[]) {
        const binding = entry.native[platform];
        if (owns(entry, platform) && !binding?.key) {
          throw new Error(
            `contract: "${where}" is owned by ${platform} but declares no native key`
          );
        }
        if (!owns(entry, platform) && binding) {
          throw new Error(
            `contract: "${where}" binds ${platform} but does not list it in platforms`
          );
        }
        // A null default carries no inferable type: Kotlin infers Nothing?.
        if (
          platform === 'android' &&
          owns(entry, platform) &&
          entry.default === null &&
          !entry.nativeType?.android
        ) {
          throw new Error(
            `contract: "${where}" defaults to null but declares no android nativeType`
          );
        }
        if (entry.nullable && owns(entry, platform) && !binding?.converter) {
          throw new Error(
            `contract: "${where}" permits null but declares no ${platform} converter`
          );
        }
      }
    }
  }
}

// --- Kotlin -----------------------------------------------------------------

/** A default in the type the Java core stores, for `Config.getDefault()`. */
function kotlinNative(entry: Entry): string {
  const binding = entry.native.android!;
  const value = entry.default;
  if (value === null) return `null as ${entry.nativeType!.android}`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  if (binding.cast === 'float') return `${value}f`;
  if (binding.cast === 'long') return `${value}L`;
  if (binding.cast === 'int' || entry.enumName) return `${value}`;
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** A default in the public type, for a field Android does not own. */
function kotlinPublic(entry: Entry): string {
  const value = entry.default;
  if (entry.enumName) {
    return `${entry.enumName}.${enumMember(entry).toUpperCase()}`;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    return Number.isInteger(value) ? `${value}.0` : `${value}`;
  }
  return String(value);
}

function kotlinDefaults(): string {
  const objects = [
    ...GROUPS.map(([group, fields]) => [`${pascal(group)}Defaults`, fields]),
    ['LocationOptionsDefaults', LOCATION_OPTIONS],
  ] as [string, Fields][];

  const body = objects
    .map(([name, fields]) => {
      const lines = fields
        .filter(([, entry]) => owns(entry, 'android'))
        .map(
          ([field, entry]) =>
            `    @JvmField val ${field} = ${kotlinNative(entry)}`
        );
      return `object ${name} {\n${lines.join('\n')}\n}`;
    })
    .join('\n\n');

  return `// ${BANNER}
package com.margelo.nitro.nitrobackgroundgeolocation.generated

import com.marianhello.bgloc.data.LocationTemplate
import java.util.HashMap

// Values are in the type the Java core stores, so Config.getDefault() can read
// them directly. Only fields Android owns appear.

${body}
`;
}

function kotlinApply(group: string, fields: Fields): string {
  const lines = fields
    .filter(([, entry]) => owns(entry, 'android'))
    .map(([field, entry]) => {
      const binding = entry.native.android!;
      if (entry.nullable) {
        // `?.let` would skip an explicit null, making "set this to nothing"
        // unreachable; the converter owns the branching and the variant type.
        return `        ConfigConverters.apply${pascal(binding.converter!)}(config, options.${field})`;
      }
      const setter = binding.setter ?? `set${pascal(binding.key)}`;
      const value = entry.enumName
        ? 'it.value'
        : binding.cast === 'int'
          ? 'it.toInt()'
          : binding.cast === 'float'
            ? 'it.toFloat()'
            : 'it';
      return `        options.${field}?.let { config.${setter}(${value}) }`;
    });
  return `    private fun apply${pascal(group)}(config: Config, options: ${pascal(group)}Options) {
${lines.join('\n')}
    }`;
}

function kotlinRead(group: string, fields: Fields): string {
  const defaults = `${pascal(group)}Defaults`;
  const lines = fields.map(([field, entry]) => {
    if (!owns(entry, 'android')) {
      return `        ${field} = ${kotlinPublic(entry)},`;
    }
    const binding = entry.native.android!;
    const stored = `(config.${binding.key} ?: ${defaults}.${field})`;
    if (entry.nullable) {
      return `        ${field} = ConfigConverters.read${pascal(binding.converter!)}(config),`;
    }
    if (entry.enumName) {
      return `        ${field} = ${entry.enumName}.values().firstOrNull { it.value == ${stored} } ?: ${kotlinPublic(entry)},`;
    }
    if (binding.cast) {
      return `        ${field} = ${stored}.toDouble(),`;
    }
    return `        ${field} = ${stored},`;
  });
  return `    private fun read${pascal(group)}(config: Config) = ${pascal(group)}Config(
${lines.join('\n')}
    )`;
}

function kotlinMapper(): string {
  const types = GROUPS.flatMap(([group]) => [
    `${pascal(group)}Config`,
    `${pascal(group)}Options`,
  ]);
  const enums = [
    ...new Set(
      GROUPS.flatMap(([, fields]) =>
        fields.filter(([, e]) => e.enumName).map(([, e]) => e.enumName!)
      )
    ),
  ];
  const imports = [
    'AppliedConfig',
    'ConfigConverters',
    'ConfigureOptions',
    ...types,
    ...enums,
  ]
    .sort()
    .map(
      (name) => `import com.margelo.nitro.nitrobackgroundgeolocation.${name}`
    )
    .join('\n');

  const applyGroups = GROUPS.map(
    ([group]) =>
      `        options.${group}?.let { apply${pascal(group)}(config, it) }`
  ).join('\n');
  const readGroups = GROUPS.map(
    ([group]) => `        ${group} = read${pascal(group)}(config),`
  ).join('\n');

  return `// ${BANNER}
package com.margelo.nitro.nitrobackgroundgeolocation.generated

import com.marianhello.bgloc.Config
${imports}

/**
 * Maps every config group between the public shape and the Java config. A field
 * Android does not own is never written and reads as its contract default.
 */
object ConfigContractMapper {
    fun apply(config: Config, options: ConfigureOptions) {
${applyGroups}
    }

    fun read(config: Config) = AppliedConfig(
${readGroups}
    )

${GROUPS.map(([group, fields]) => kotlinApply(group, fields)).join('\n\n')}

${GROUPS.map(([group, fields]) => kotlinRead(group, fields)).join('\n\n')}
}
`;
}

// --- Swift ------------------------------------------------------------------

function swiftPublic(entry: Entry): string {
  const value = entry.default;
  if (entry.enumName) {
    return `${entry.enumName}(fromString: "${enumMember(entry)}")!`;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function swiftType(entry: Entry): string {
  if (entry.enumName) return entry.enumName;
  switch (typeof entry.default) {
    case 'string':
      return 'String';
    case 'boolean':
      return 'Bool';
    default:
      return 'Double';
  }
}

function swiftDefaults(): string {
  const objects = [
    ...GROUPS.map(([group, fields]) => [`${pascal(group)}Defaults`, fields]),
    ['LocationOptionsDefaults', LOCATION_OPTIONS],
  ] as [string, Fields][];

  const body = objects
    .map(([name, fields]) => {
      const lines = fields
        // A null default is read through its converter, never from here.
        .filter(([, entry]) => owns(entry, 'ios') && entry.default !== null)
        .map(
          ([field, entry]) =>
            `    static let ${field}: ${swiftType(entry)} = ${swiftPublic(entry)}`
        );
      return `enum ${name} {\n${lines.join('\n')}\n}`;
    })
    .join('\n\n');

  return `// ${BANNER}

import Foundation
import NitroModules

// Only fields iOS owns appear.

${body}
`;
}

function swiftApply(group: string, fields: Fields): string {
  const lines = fields
    .filter(([, entry]) => owns(entry, 'ios'))
    .map(([field, entry]) => {
      const binding = entry.native.ios!;
      const target = `key: "${binding.key}", into: dictionary`;
      if (binding.converter) {
        const call = `ConfigConverters.apply${pascal(binding.converter)}(options.${field}, ${target})`;
        return `        ${binding.converter === 'anyMap' ? 'try ' : ''}${call}`;
      }
      if (entry.enumName) {
        const encode =
          binding.enumAs === 'name' ? '{ $0.stringValue }' : 'nativeValue';
        return `        ConfigConverters.apply(options.${field}.map(${encode}), ${target})`;
      }
      return `        ConfigConverters.apply(options.${field}, ${target})`;
    });
  return `    private static func apply${pascal(group)}(_ options: ${pascal(group)}Options, into dictionary: NSMutableDictionary) throws {
${lines.join('\n')}
    }`;
}

function swiftRead(group: string, fields: Fields): string {
  const defaults = `${pascal(group)}Defaults`;
  const lines = fields.map(([field, entry]) => {
    if (!owns(entry, 'ios')) {
      return `            ${field}: ${swiftPublic(entry)}`;
    }
    const binding = entry.native.ios!;
    const key = `"${binding.key}"`;
    if (binding.converter) {
      const call = `ConfigConverters.read${pascal(binding.converter)}(dictionary, key: ${key})`;
      return `            ${field}: ${binding.converter === 'anyMap' ? 'try ' : ''}${call}`;
    }
    if (entry.enumName) {
      const decode =
        binding.enumAs === 'name'
          ? `(dictionary[${key}] as? String).flatMap { ${entry.enumName}(fromString: $0) }`
          : `${entry.enumName}(native: dictionary[${key}])`;
      return `            ${field}: ${decode} ?? ${defaults}.${field}`;
    }
    const reader = `read${swiftType(entry)}`;
    return `            ${field}: ConfigConverters.${reader}(dictionary, key: ${key}, fallback: ${defaults}.${field})`;
  });
  return `    private static func read${pascal(group)}(_ dictionary: NSDictionary) throws -> ${pascal(group)}Config {
        return ${pascal(group)}Config(
${lines.join(',\n')}
        )
    }`;
}

/** Enums the Objective-C core stores as their numeric value. */
function swiftEnumCodecs(): string {
  const names = [
    ...new Set(
      GROUPS.flatMap(([, fields]) =>
        fields
          .filter(
            ([, e]) =>
              e.enumName && owns(e, 'ios') && e.native.ios!.enumAs !== 'name'
          )
          .map(([, e]) => e.enumName!)
      )
    ),
  ];
  return names
    .map((name) => {
      const members = enumMembers(name);
      const decode = members
        .map(
          ([member, value]) =>
            `        case ${value}: self.init(fromString: "${member}")`
        )
        .join('\n');
      const encode = members
        .map(([member, value]) => `    case "${member}": return ${value}`)
        .join('\n');
      return `private extension ${name} {
    init?(native value: Any?) {
        switch (value as? NSNumber)?.intValue {
${decode}
        default: return nil
        }
    }
}

private func nativeValue(_ value: ${name}) -> NSNumber {
    switch value.stringValue {
${encode}
    default: return ${members[0]![1]}
    }
}`;
    })
    .join('\n\n');
}

function swiftMapper(): string {
  // A group iOS reads nothing from gets no apply step at all.
  const written = GROUPS.filter(([, fields]) =>
    fields.some(([, entry]) => owns(entry, 'ios'))
  );
  const applyGroups = written
    .map(
      ([group]) =>
        `        if let ${group} = options.${group} { try apply${pascal(group)}(${group}, into: dictionary) }`
    )
    .join('\n');
  const readGroups = GROUPS.map(
    ([group]) => `            ${group}: try read${pascal(group)}(dictionary)`
  ).join(',\n');

  return `// ${BANNER}

import Foundation
import NitroModules

/// Maps every config group between the public shape and the native dictionary.
/// A field iOS does not own is never written and reads as its contract default.
enum ConfigContractMapper {
    static func apply(_ options: ConfigureOptions, into dictionary: NSMutableDictionary) throws {
${applyGroups}
    }

    static func read(_ dictionary: NSDictionary) throws -> AppliedConfig {
        return AppliedConfig(
${readGroups}
        )
    }

${written.map(([group, fields]) => swiftApply(group, fields)).join('\n\n')}

${GROUPS.map(([group, fields]) => swiftRead(group, fields)).join('\n\n')}
}

${swiftEnumCodecs()}
`;
}

/**
 * The Objective-C core cannot see Swift constants, so primitive defaults also go
 * out as a header it can include. A null default has nothing to express here.
 */
function objcDefaults(): string {
  const lines = GROUPS.flatMap(([group, fields]) =>
    fields
      .filter(([, entry]) => owns(entry, 'ios') && entry.default !== null)
      .map(([field, entry]) => {
        const name = `BG_${screaming(group)}_DEFAULT_${screaming(field)}`;
        const value = entry.default;
        const literal =
          entry.enumName && entry.native.ios!.enumAs === 'name'
            ? `@"${enumMember(entry)}"`
            : typeof value === 'string'
              ? `@${JSON.stringify(value)}`
              : typeof value === 'boolean'
                ? value
                  ? 'YES'
                  : 'NO'
                : value;
        return `#define ${name} ${literal}`;
      })
  );
  return `// ${BANNER}

#ifndef BG_CONFIG_DEFAULTS_H
#define BG_CONFIG_DEFAULTS_H

${lines.join('\n')}

#endif
`;
}

// --- docs -------------------------------------------------------------------

const cell = (text: string) => text.replaceAll('|', '\\|');
const PLATFORM_NAMES: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
};

function tsType(entry: Entry): string {
  if (entry.enumName) return entry.enumName;
  if (entry.nullable) {
    return entry.native.android?.converter === 'headers'
      ? 'Record<string, string> | null'
      : 'AnyMap | null';
  }
  return typeof entry.default;
}

function docsDefault(entry: Entry): string {
  if (entry.default === null) return '`null`';
  if (entry.enumName) return `\`${entry.enumName}.${enumMember(entry)}\``;
  return `\`${JSON.stringify(entry.default)}\``;
}

function docsUnits(entry: Entry): string {
  if (entry.range) {
    return `${entry.range.min}–${entry.range.max} ${entry.range.units}`;
  }
  return entry.units ?? '—';
}

function docsDescription(entry: Entry): string {
  const notes = Object.entries(entry.platformNotes ?? {}).map(
    ([platform, note]) =>
      `<br/>**${PLATFORM_NAMES[platform as Platform]}:** ${note}`
  );
  return cell(entry.description + notes.join(''));
}

function docsTable(prefix: string, fields: Fields): string {
  const rows = fields.map(([field, entry]) => {
    const platforms = entry.platforms
      .map((platform) => PLATFORM_NAMES[platform])
      .join(', ');
    return `| \`${prefix}${field}\` | ${cell(`\`${tsType(entry)}\``)} | ${docsDefault(entry)} | ${platforms} | ${docsUnits(entry)} | ${docsDescription(entry)} |`;
  });
  return `| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
${rows.join('\n')}`;
}

// MDX rejects HTML comments, so the partials carry a JSX one.
function docsPartial(prefix: string, fields: Fields): string {
  return `{/* ${BANNER} */}

${docsTable(prefix, fields)}
`;
}

const README_START = '<!-- CONFIG-CONTRACT:START -->';
const README_END = '<!-- CONFIG-CONTRACT:END -->';

/** Rewrites only the marked section, so the rest of the README stays authored. */
function readmeSection(current: string): string {
  const start = current.indexOf(README_START);
  const end = current.indexOf(README_END);
  if (start < 0 || end < start) {
    throw new Error(
      `README.md: markers ${README_START} / ${README_END} not found`
    );
  }
  const tables = GROUPS.map(
    ([group, fields]) =>
      `#### \`${group}\`\n\n${docsTable(`${group}.`, fields)}`
  ).join('\n\n');
  return `${current.slice(0, start)}${README_START}
<!-- ${BANNER} -->

${tables}

${current.slice(end)}`;
}

// --- write ------------------------------------------------------------------

check();

const KOTLIN =
  'android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/generated';
const DOCS = '../../apps/docs/docs/generated';
const README = '../../README.md';

const OUTPUTS: [string, string][] = [
  [`${KOTLIN}/ConfigDefaults.kt`, kotlinDefaults()],
  [`${KOTLIN}/ConfigContractMapper.kt`, kotlinMapper()],
  ['ios/generated/ConfigDefaults.swift', swiftDefaults()],
  ['ios/generated/ConfigDefaults.h', objcDefaults()],
  ['ios/generated/ConfigContractMapper.swift', swiftMapper()],
  ...GROUPS.map(
    ([group, fields]) =>
      [`${DOCS}/_config-${group}.md`, docsPartial(`${group}.`, fields)] as [
        string,
        string,
      ]
  ),
  [`${DOCS}/_location-options.md`, docsPartial('', LOCATION_OPTIONS)],
  [README, readmeSection(readFileSync(join(ROOT, README), 'utf8'))],
];

for (const [relative, contents] of OUTPUTS) {
  const target = join(ROOT, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  console.log(`wrote ${relative}`);
}
