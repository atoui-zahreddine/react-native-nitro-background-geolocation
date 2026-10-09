import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import BackgroundGeolocation, {
  CONFIG_FIELDS,
  ownsField,
  type AppliedConfig,
  type ConfigFieldPath,
  type ConfigGroupName,
  type ConfigPlatform,
  type HttpConfig,
} from 'react-native-nitro-background-geolocation';
import {
  CONFIG_SECTIONS,
  FIELD_PRESENTATION,
  soleOwner,
  type FieldOption,
} from '../lib/config/fieldPresentation';
import { readField, splitPath } from '../lib/config/shape';
import {
  BASELINE_CONFIG,
  loadStoredConfig,
  ownedOptions,
  resetStoredConfig,
  saveStoredConfig,
} from '../lib/tracking/config';

const ACCENT = '#6366f1';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';

const PLATFORM = Platform.OS as ConfigPlatform;

// --- Row scaffolding ---------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function RowShell({
  path,
  disabled,
  vertical,
  children,
}: {
  path: ConfigFieldPath;
  disabled: boolean;
  vertical?: boolean;
  children: React.ReactNode;
}) {
  const { label, subtitle } = FIELD_PRESENTATION[path];
  const owner = soleOwner(path);
  return (
    <View
      style={[
        styles.row,
        vertical && styles.rowVertical,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowLabelWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          {owner && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{owner.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.rowDescription}>{subtitle}</Text>}
      </View>
      <View style={vertical ? styles.rowControlFull : styles.rowControl}>
        {children}
      </View>
    </View>
  );
}

interface RowProps<T> {
  path: ConfigFieldPath;
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}

// --- Controls ----------------------------------------------------------------

function SegmentedRow({
  path,
  value,
  options,
  disabled,
  onChange,
}: RowProps<number> & { options: FieldOption[] }) {
  const selectedOption = options.find((option) => option.value === value);
  return (
    <RowShell path={path} disabled={disabled} vertical>
      <View style={styles.segmented}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.label}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedOption?.description && (
        <Text style={styles.segmentDescription}>
          {selectedOption.description}
        </Text>
      )}
    </RowShell>
  );
}

function SwitchRow({ path, value, disabled, onChange }: RowProps<boolean>) {
  return (
    <RowShell path={path} disabled={disabled}>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: ACCENT }}
      />
    </RowShell>
  );
}

function NumberRow({ path, value, disabled, onChange }: RowProps<number>) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const { units } = CONFIG_FIELDS[path];

  const commit = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setText(String(value));
    }
  };

  return (
    <RowShell path={path} disabled={disabled}>
      <View style={styles.numberWrap}>
        <TextInput
          style={styles.numberInput}
          value={text}
          editable={!disabled}
          keyboardType="numeric"
          onChangeText={setText}
          onEndEditing={commit}
        />
        {units && <Text style={styles.unit}>{units}</Text>}
      </View>
    </RowShell>
  );
}

function TextRow({ path, value, disabled, onChange }: RowProps<string>) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <RowShell path={path} disabled={disabled} vertical>
      <TextInput
        style={styles.textInput}
        value={text}
        editable={!disabled}
        placeholder={FIELD_PRESENTATION[path].placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setText}
        onEndEditing={() => onChange(text)}
      />
    </RowShell>
  );
}

function KeyValueEditor({
  path,
  value,
  disabled,
  onChange,
}: RowProps<HttpConfig['httpHeaders']>) {
  const [rows, setRows] = useState<[string, string][]>(
    Object.entries(value ?? {})
  );
  useEffect(() => setRows(Object.entries(value ?? {})), [value]);

  const commit = (next: [string, string][]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter(([k]) => k.trim().length > 0)));
  };

  return (
    <RowShell path={path} disabled={disabled} vertical>
      {rows.map(([key, val], i) => (
        <View key={i} style={styles.kvRow}>
          <TextInput
            style={[styles.textInput, styles.kvKey]}
            value={key}
            editable={!disabled}
            placeholder="Header"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            onChangeText={(nextKey) => {
              const next = rows.map<[string, string]>((row, j) =>
                j === i ? [nextKey, row[1]] : row
              );
              commit(next);
            }}
          />
          <TextInput
            style={[styles.textInput, styles.kvValue]}
            value={val}
            editable={!disabled}
            placeholder="Value"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            onChangeText={(nextVal) => {
              const next = rows.map<[string, string]>((row, j) =>
                j === i ? [row[0], nextVal] : row
              );
              commit(next);
            }}
          />
          <Pressable
            disabled={disabled}
            onPress={() => commit(rows.filter((_, j) => j !== i))}
            style={styles.kvRemove}
          >
            <Text style={styles.kvRemoveText}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        disabled={disabled}
        onPress={() => setRows([...rows, ['', '']])}
        style={styles.kvAdd}
      >
        <Text style={styles.kvAddText}>+ Add header</Text>
      </Pressable>
    </RowShell>
  );
}

function JsonRow({
  path,
  value,
  disabled,
  onChange,
}: RowProps<HttpConfig['postTemplate']>) {
  const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setInvalid(false);
      onChange(null);
      return;
    }
    try {
      onChange(JSON.parse(trimmed));
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <RowShell path={path} disabled={disabled} vertical>
      <TextInput
        style={[
          styles.textInput,
          styles.jsonInput,
          invalid && styles.inputInvalid,
        ]}
        value={text}
        editable={!disabled}
        multiline
        placeholder='{"lat": "@latitude", "lon": "@longitude"}'
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setText}
        onEndEditing={commit}
      />
      {invalid && (
        <Text style={styles.invalidText}>Invalid JSON — not saved</Text>
      )}
    </RowShell>
  );
}

// The control follows the contract's value type; only the two map-valued HTTP
// fields need a dedicated editor.
function FieldRow({ path, value, disabled, onChange }: RowProps<unknown>) {
  const row = {
    path,
    disabled: disabled || !ownsField(PLATFORM, path),
    onChange,
  };
  const { options } = FIELD_PRESENTATION[path];
  if (path === 'http.httpHeaders') {
    return (
      <KeyValueEditor {...row} value={value as HttpConfig['httpHeaders']} />
    );
  }
  if (path === 'http.postTemplate') {
    return <JsonRow {...row} value={value as HttpConfig['postTemplate']} />;
  }
  if (options) {
    return <SegmentedRow {...row} value={value as number} options={options} />;
  }
  switch (typeof CONFIG_FIELDS[path].default) {
    case 'boolean':
      return <SwitchRow {...row} value={value as boolean} />;
    case 'number':
      return <NumberRow {...row} value={value as number} />;
    default:
      return <TextRow {...row} value={value as string} />;
  }
}

// --- Screen ------------------------------------------------------------------

export default function SettingsScreen() {
  const [config, setConfig] = useState<AppliedConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const configRef = useRef(config);
  configRef.current = config;
  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [stored, status] = await Promise.all([
        loadStoredConfig(),
        BackgroundGeolocation.checkStatus(),
      ]);
      if (isMounted) {
        setConfig(stored);
        setIsRunning(status.isRunning);
      }
    })();
    const disposers = [
      BackgroundGeolocation.onStart(() => setIsRunning(true)),
      BackgroundGeolocation.onStop(() => setIsRunning(false)),
    ];
    return () => {
      isMounted = false;
      for (const dispose of disposers) {
        dispose();
      }
      // Apply on leave (design: configure() on leaving the screen), but
      // never reconfigure a live session.
      const latest = configRef.current;
      if (latest && !runningRef.current) {
        BackgroundGeolocation.configure(ownedOptions(latest))
          .then(() => BackgroundGeolocation.getConfig())
          .then((applied) => {
            console.log(
              '[Settings] configure applied; native distanceFilter =',
              applied.tracking.distanceFilter
            );
          })
          .catch((error) => {
            console.warn('[Settings] configure on leave failed:', error);
          });
      }
    };
  }, []);

  const update = useCallback(
    <G extends ConfigGroupName>(group: G, patch: Partial<AppliedConfig[G]>) => {
      setConfig((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, [group]: { ...prev[group], ...patch } };
        saveStoredConfig(next).catch((error) => {
          console.warn('[Settings] persist failed:', error);
        });
        return next;
      });
    },
    []
  );

  const reset = useCallback(async () => {
    await resetStoredConfig();
    setConfig(BASELINE_CONFIG);
    setResetArmed(false);
  }, []);

  if (!config) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
        <Text style={styles.loadingText}>Loading settings…</Text>
      </View>
    );
  }

  const locked = isRunning;

  const renderField = (path: ConfigFieldPath) => {
    const [group, field] = splitPath(path);
    return (
      <FieldRow
        key={path}
        path={path}
        value={readField(config, path)}
        disabled={locked}
        onChange={(value) => update(group, { [field]: value })}
      />
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />

      {locked && (
        <View style={styles.lockBanner}>
          <Text style={styles.lockBannerText}>
            Recording in progress — stop tracking to change settings.
          </Text>
        </View>
      )}

      {CONFIG_SECTIONS.map(({ group, title, fields }) => {
        const advanced = fields.filter(
          (path) => FIELD_PRESENTATION[path].advanced
        );
        return (
          <Section key={group} title={title}>
            {fields
              .filter((path) => !FIELD_PRESENTATION[path].advanced)
              .map(renderField)}
            {advanced.length > 0 && (
              <>
                <Pressable
                  onPress={() => setAdvancedOpen((open) => !open)}
                  style={styles.advancedToggle}
                >
                  <Text style={styles.advancedToggleText}>
                    {advancedOpen ? '▾' : '▸'} Advanced
                  </Text>
                </Pressable>
                {advancedOpen && advanced.map(renderField)}
              </>
            )}
          </Section>
        );
      })}

      <Pressable
        disabled={locked}
        onPress={() => (resetArmed ? reset() : setResetArmed(true))}
        style={[styles.resetButton, resetArmed && styles.resetButtonArmed]}
      >
        <Text style={[styles.resetText, resetArmed && styles.resetTextArmed]}>
          {resetArmed
            ? 'Tap again to reset all settings'
            : 'Reset to long-tracking defaults'}
        </Text>
      </Pressable>
      {resetArmed && (
        <Pressable onPress={() => setResetArmed(false)}>
          <Text style={styles.resetCancel}>Cancel</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    color: '#6b7280',
  },
  lockBanner: {
    backgroundColor: AMBER_BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  lockBannerText: {
    color: AMBER,
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  rowVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowMain: {
    flexShrink: 1,
    gap: 3,
  },
  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6b7280',
  },
  segmentDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6b7280',
    marginTop: 8,
  },
  rowLabel: {
    fontSize: 15,
    color: '#111827',
    flexShrink: 1,
  },
  pill: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  rowControl: {
    flexShrink: 0,
  },
  rowControlFull: {
    alignSelf: 'stretch',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: ACCENT,
  },
  segmentText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  numberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numberInput: {
    minWidth: 80,
    textAlign: 'right',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 13,
    color: '#6b7280',
    minWidth: 22,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  jsonInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  inputInvalid: {
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  invalidText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  kvRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  kvKey: {
    flex: 2,
  },
  kvValue: {
    flex: 3,
  },
  kvRemove: {
    padding: 6,
  },
  kvRemoveText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  kvAdd: {
    paddingVertical: 6,
  },
  kvAddText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 13,
  },
  advancedToggle: {
    paddingVertical: 12,
  },
  advancedToggleText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  resetButtonArmed: {
    backgroundColor: '#dc2626',
  },
  resetText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
  resetTextArmed: {
    color: '#fff',
  },
  resetCancel: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 12,
    fontSize: 14,
  },
});
