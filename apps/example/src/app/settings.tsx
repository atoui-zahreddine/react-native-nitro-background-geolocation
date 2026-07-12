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
  LocationAccuracy,
  LocationProvider,
  type ConfigureOptions,
} from 'react-native-nitro-background-geolocation';
import {
  loadStoredConfig,
  resetStoredConfig,
  saveStoredConfig,
  LONG_TRACKING_BASELINE,
} from '../lib/tracking/config';

const ACCENT = '#6366f1';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';

type PlatformTag = 'android' | 'ios';

function isForeign(platform?: PlatformTag): boolean {
  return platform !== undefined && platform !== Platform.OS;
}

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
  label,
  description,
  platform,
  disabled,
  vertical,
  children,
}: {
  label: string;
  description?: string;
  platform?: PlatformTag;
  disabled: boolean;
  vertical?: boolean;
  children: React.ReactNode;
}) {
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
          {platform && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{platform.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {description && (
          <Text style={styles.rowDescription}>{description}</Text>
        )}
      </View>
      <View style={vertical ? styles.rowControlFull : styles.rowControl}>
        {children}
      </View>
    </View>
  );
}

// --- Controls ----------------------------------------------------------------

function SegmentedRow<T>({
  label,
  description,
  platform,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  platform?: PlatformTag;
  value: T;
  options: { label: string; value: T; description?: string }[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);
  return (
    <RowShell
      label={label}
      description={description}
      platform={platform}
      disabled={disabled}
      vertical
    >
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

function SwitchRow({
  label,
  description,
  platform,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  platform?: PlatformTag;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const foreign = isForeign(platform);
  return (
    <RowShell
      label={label}
      description={description}
      platform={platform}
      disabled={disabled || foreign}
    >
      <Switch
        value={value}
        disabled={disabled || foreign}
        onValueChange={onChange}
        trackColor={{ true: ACCENT }}
      />
    </RowShell>
  );
}

function NumberRow({
  label,
  description,
  platform,
  unit,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  platform?: PlatformTag;
  unit?: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const foreign = isForeign(platform);
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setText(String(value));
    }
  };

  return (
    <RowShell
      label={label}
      description={description}
      platform={platform}
      disabled={disabled || foreign}
    >
      <View style={styles.numberWrap}>
        <TextInput
          style={styles.numberInput}
          value={text}
          editable={!disabled && !foreign}
          keyboardType="numeric"
          onChangeText={setText}
          onEndEditing={commit}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </RowShell>
  );
}

function TextRow({
  label,
  description,
  platform,
  placeholder,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  platform?: PlatformTag;
  placeholder?: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const foreign = isForeign(platform);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <RowShell
      label={label}
      description={description}
      platform={platform}
      disabled={disabled || foreign}
      vertical
    >
      <TextInput
        style={styles.textInput}
        value={text}
        editable={!disabled && !foreign}
        placeholder={placeholder}
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
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  value: Record<string, string>;
  disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<[string, string][]>(Object.entries(value));
  useEffect(() => setRows(Object.entries(value)), [value]);

  const commit = (next: [string, string][]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter(([k]) => k.trim().length > 0)));
  };

  return (
    <RowShell
      label={label}
      description={description}
      disabled={disabled}
      vertical
    >
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
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  value: object | null;
  disabled: boolean;
  onChange: (value: object | null) => void;
}) {
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
    <RowShell
      label={label}
      description={description}
      disabled={disabled}
      vertical
    >
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

// --- Screen ------------------------------------------------------------------

export default function SettingsScreen() {
  const [config, setConfig] = useState<ConfigureOptions | null>(null);
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
        BackgroundGeolocation.configure(latest)
          .then(() => BackgroundGeolocation.getConfig())
          .then((applied) => {
            console.log(
              '[Settings] configure applied; native distanceFilter =',
              applied.distanceFilter
            );
          })
          .catch((error) => {
            console.warn('[Settings] configure on leave failed:', error);
          });
      }
    };
  }, []);

  const update = useCallback((patch: Partial<ConfigureOptions>) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      const next = { ...prev, ...patch };
      saveStoredConfig(next).catch((error) => {
        console.warn('[Settings] persist failed:', error);
      });
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    await resetStoredConfig();
    setConfig({ ...LONG_TRACKING_BASELINE });
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

      <Section title="Provider & accuracy">
        <SegmentedRow
          label="Location provider"
          description="How locations are collected. Each provider trades points against battery differently."
          value={config.locationProvider ?? LocationProvider.DISTANCE_FILTER}
          options={[
            {
              label: 'Distance',
              value: LocationProvider.DISTANCE_FILTER,
              description:
                'Elastic distance filtering with stationary detection. Balanced points vs battery — the best all-round default.',
            },
            {
              label: 'Activity',
              value: LocationProvider.ACTIVITY,
              description:
                'Fused, motion-driven updates (walking, driving, still). Paced by Update interval; does not use Distance filter.',
            },
            {
              label: 'Raw',
              value: LocationProvider.RAW,
              description:
                'Unfiltered OS fixes at the update interval. Most points and highest battery use; no stationary detection.',
            },
          ]}
          disabled={locked}
          onChange={(locationProvider) => update({ locationProvider })}
        />
        <SegmentedRow
          label="Desired accuracy"
          description="Precision requested from the OS. Higher accuracy costs battery, and the device may still return coarser fixes."
          value={config.desiredAccuracy ?? LocationAccuracy.MEDIUM}
          options={[
            { label: 'High', value: LocationAccuracy.HIGH },
            { label: 'Medium', value: LocationAccuracy.MEDIUM },
            { label: 'Low', value: LocationAccuracy.LOW },
            { label: 'Passive', value: LocationAccuracy.PASSIVE },
          ]}
          disabled={locked}
          onChange={(desiredAccuracy) => update({ desiredAccuracy })}
        />
        <NumberRow
          label="Distance filter"
          description="Minimum distance moved before a point is recorded. Applies to the Distance provider only — the Activity provider ignores it. Default 50 m."
          unit="m"
          value={config.distanceFilter ?? 50}
          disabled={locked}
          onChange={(distanceFilter) => update({ distanceFilter })}
        />
        <NumberRow
          label="Stationary radius"
          description="While stopped, how far you must move before aggressive tracking re-engages. Used by the Distance provider's stationary detection. Default 50 m."
          unit="m"
          value={config.stationaryRadius ?? 50}
          disabled={locked}
          onChange={(stationaryRadius) => update({ stationaryRadius })}
        />
        <SwitchRow
          label="Debug (sounds & notifications)"
          description="Plays sounds and shows debug notifications on tracking events. For development only."
          value={config.debug ?? false}
          disabled={locked}
          onChange={(debug) => update({ debug })}
        />
      </Section>

      <Section title="Lifecycle">
        <SwitchRow
          label="Stop on app terminate"
          description="When on, tracking stops if the app is killed. Turn off to keep recording after the app is swiped away."
          value={config.stopOnTerminate ?? true}
          disabled={locked}
          onChange={(stopOnTerminate) => update({ stopOnTerminate })}
        />
        <SwitchRow
          label="Start on boot"
          description="Resume tracking automatically after the device restarts."
          platform="android"
          value={config.startOnBoot ?? false}
          disabled={locked}
          onChange={(startOnBoot) => update({ startOnBoot })}
        />
        <SwitchRow
          label="Stop on still activity"
          description="Pause updates when the device is detected as still. Deprecated upstream — leave on unless you need fixes while stationary."
          platform="android"
          value={config.stopOnStillActivity ?? true}
          disabled={locked}
          onChange={(stopOnStillActivity) => update({ stopOnStillActivity })}
        />
      </Section>

      <Section title="Intervals">
        <NumberRow
          label="Update interval"
          description="Target time between updates. An OS-level floor applied to every provider — it caps the point rate even in Distance mode. Raise to save battery, lower for denser tracks. Default 5000 ms (5 s)."
          platform="android"
          unit="ms"
          value={config.interval ?? 5000}
          disabled={locked}
          onChange={(interval) => update({ interval })}
        />
        <NumberRow
          label="Fastest interval"
          description="Fastest rate the app will accept updates when another app requests locations faster. Sets the tightest spacing between points. Default 1000 ms."
          platform="android"
          unit="ms"
          value={config.fastestInterval ?? 1000}
          disabled={locked}
          onChange={(fastestInterval) => update({ fastestInterval })}
        />
        <NumberRow
          label="Activities interval"
          description="How often motion type is sampled (walking, driving, still). Larger values save battery but slow detection. Default 10000 ms."
          platform="android"
          unit="ms"
          value={config.activitiesInterval ?? 10000}
          disabled={locked}
          onChange={(activitiesInterval) => update({ activitiesInterval })}
        />
      </Section>

      <Section title="Foreground notification">
        <SwitchRow
          label="Notifications enabled"
          description="Show the persistent tracking notification. Required for reliable background tracking."
          platform="android"
          value={config.notificationsEnabled ?? true}
          disabled={locked}
          onChange={(notificationsEnabled) => update({ notificationsEnabled })}
        />
        <SwitchRow
          label="Start foreground service"
          description="Run tracking as a foreground service — this is what keeps location flowing without background-location permission."
          platform="android"
          value={config.startForeground ?? true}
          disabled={locked}
          onChange={(startForeground) => update({ startForeground })}
        />
        <TextRow
          label="Notification title"
          description="Title shown on the tracking notification."
          platform="android"
          value={config.notificationTitle ?? ''}
          disabled={locked}
          onChange={(notificationTitle) => update({ notificationTitle })}
        />
        <TextRow
          label="Notification text"
          description="Body text shown on the tracking notification."
          platform="android"
          value={config.notificationText ?? ''}
          disabled={locked}
          onChange={(notificationText) => update({ notificationText })}
        />
        <TextRow
          label="Icon color"
          description="Accent color for the notification icon, as a #RRGGBB hex value."
          platform="android"
          placeholder="#RRGGBB"
          value={config.notificationIconColor ?? ''}
          disabled={locked}
          onChange={(notificationIconColor) =>
            update({ notificationIconColor })
          }
        />
        <TextRow
          label="Large icon (resource name)"
          description="Drawable resource name for the notification's large icon."
          platform="android"
          value={config.notificationIconLarge ?? ''}
          disabled={locked}
          onChange={(notificationIconLarge) =>
            update({ notificationIconLarge })
          }
        />
        <TextRow
          label="Small icon (resource name)"
          description="Drawable resource name for the status-bar icon. Falls back to the app icon if unset."
          platform="android"
          value={config.notificationIconSmall ?? ''}
          disabled={locked}
          onChange={(notificationIconSmall) =>
            update({ notificationIconSmall })
          }
        />
      </Section>

      <Section title="iOS behavior">
        <SegmentedRow
          label="Activity type"
          description="Tells iOS your motion type so it tunes GPS and auto-pause. Match it to how you're moving (driving, navigation, fitness)."
          platform="ios"
          value={config.activityType ?? 'OtherNavigation'}
          options={[
            { label: 'Automotive', value: 'AutomotiveNavigation' },
            { label: 'Navigation', value: 'OtherNavigation' },
            { label: 'Fitness', value: 'Fitness' },
            { label: 'Other', value: 'Other' },
          ]}
          disabled={locked || Platform.OS !== 'ios'}
          onChange={(activityType) => update({ activityType })}
        />
        <SwitchRow
          label="Pause location updates"
          description="Let iOS pause updates when it thinks you've stopped moving. Saves battery but can miss slow movement."
          platform="ios"
          value={config.pauseLocationUpdates ?? false}
          disabled={locked}
          onChange={(pauseLocationUpdates) => update({ pauseLocationUpdates })}
        />
        <SwitchRow
          label="Save battery on background"
          description="Reduce update frequency while the app is in the background to save power."
          platform="ios"
          value={config.saveBatteryOnBackground ?? false}
          disabled={locked}
          onChange={(saveBatteryOnBackground) =>
            update({ saveBatteryOnBackground })
          }
        />
      </Section>

      <Section title="HTTP sync">
        <TextRow
          label="Post URL"
          description="Endpoint each recorded location is POSTed to. Leave blank to record on-device only."
          placeholder="https://example.com/locations"
          value={config.url ?? ''}
          disabled={locked}
          onChange={(url) => update({ url })}
        />
        <TextRow
          label="Sync URL"
          description="Endpoint for batched uploads, triggered by Sync threshold. Leave blank to disable syncing."
          placeholder="https://example.com/sync"
          value={config.syncUrl ?? ''}
          disabled={locked}
          onChange={(syncUrl) => update({ syncUrl })}
        />
        <NumberRow
          label="Sync threshold"
          description="Number of locations to buffer before a batch is synced to the Sync URL."
          value={config.syncThreshold ?? 100}
          disabled={locked}
          onChange={(syncThreshold) => update({ syncThreshold })}
        />
        <Pressable
          onPress={() => setAdvancedOpen((open) => !open)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedToggleText}>
            {advancedOpen ? '▾' : '▸'} Advanced
          </Text>
        </Pressable>
        {advancedOpen && (
          <>
            <KeyValueEditor
              label="HTTP headers"
              description="Custom headers sent with every location request, e.g. Authorization."
              value={
                (config.httpHeaders as Record<string, string> | null) ?? {}
              }
              disabled={locked}
              onChange={(httpHeaders) => update({ httpHeaders })}
            />
            <JsonRow
              label="Post template"
              description="Reshape the request body as JSON using @latitude, @longitude, and other placeholders. Leave blank for the default payload."
              value={(config.postTemplate as object | null) ?? null}
              disabled={locked}
              onChange={(postTemplate) =>
                update({
                  postTemplate:
                    postTemplate as ConfigureOptions['postTemplate'],
                })
              }
            />
          </>
        )}
      </Section>

      <Section title="Storage">
        <NumberRow
          label="Max stored locations"
          description="How many locations to keep on-device before the oldest are dropped."
          value={config.maxLocations ?? 10000}
          disabled={locked}
          onChange={(maxLocations) => update({ maxLocations })}
        />
      </Section>

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
