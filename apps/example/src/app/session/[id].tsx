import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type LngLatBounds,
} from '@maplibre/maplibre-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  LocationAccuracy,
  LocationProvider,
  type ConfigureOptions,
} from 'react-native-nitro-background-geolocation';
import { loadStoredConfig } from '../../lib/tracking/config';
import type {
  SessionEvent,
  SessionLogEntry,
  SessionRecord,
} from '../../lib/tracking/history';
import {
  deleteSessionRecord,
  loadSessionRecord,
} from '../../lib/tracking/historyStore';
import type { Profile, TrackPoint } from '../../lib/tracking/types';

// Same OpenFreeMap Liberty style as the Tracker screen.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const EMERALD = '#10b981';
const RAW_COLOR = '#64748b';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const PROFILE_META: Record<Profile, { emoji: string; label: string }> = {
  walking: { emoji: '🚶', label: 'Walking' },
  biking: { emoji: '🚴', label: 'Biking' },
  driving: { emoji: '🚗', label: 'Driving' },
};

type DetailTab = 'overview' | 'config' | 'logs' | 'events';

const TABS: [DetailTab, string][] = [
  ['overview', 'Overview'],
  ['config', 'Config'],
  ['logs', 'Logs'],
  ['events', 'Events'],
];

// --- Formatting ----------------------------------------------------------------

function formatTitle(ms: number): string {
  const date = new Date(ms);
  const day = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} · ${time}`;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(durationMs: number): string {
  const s = Math.max(0, Math.floor(durationMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatClock(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatClockMs(ms: number): string {
  return `${formatClock(ms)}.${String(new Date(ms).getMilliseconds()).padStart(3, '0')}`;
}

// --- Map helpers -----------------------------------------------------------------

function lineFeature(points: readonly TrackPoint[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.longitude, p.latitude]),
    },
  };
}

function boundsOf(points: readonly TrackPoint[]): LngLatBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const p of points) {
    west = Math.min(west, p.longitude);
    south = Math.min(south, p.latitude);
    east = Math.max(east, p.longitude);
    north = Math.max(north, p.latitude);
  }
  return [west, south, east, north];
}

// --- Overview tab ------------------------------------------------------------------

function OverviewTab({
  record,
  onDeleted,
}: {
  record: SessionRecord;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rawFeature = useMemo(
    () => (record.points.length >= 2 ? lineFeature(record.points) : null),
    [record.points]
  );
  const bounds = useMemo(
    () => (record.points.length >= 2 ? boundsOf(record.points) : null),
    [record.points]
  );
  const snapped = record.snap?.result?.ok === true ? record.snap.result : null;
  const snappedFeature = useMemo(
    () =>
      snapped
        ? ({
            type: 'Feature',
            properties: {},
            geometry: snapped.geometry,
          } as GeoJSON.Feature)
        : null,
    [snapped]
  );

  const remove = useCallback(() => {
    deleteSessionRecord(record.id)
      .catch((error) => {
        console.warn('[SessionDetail] delete failed:', error);
      })
      .finally(onDeleted);
  }, [record.id, onDeleted]);

  const profileMeta = record.snap ? PROFILE_META[record.snap.profile] : null;

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
    >
      {rawFeature && bounds ? (
        <View style={styles.mapCard}>
          <Map style={styles.map} mapStyle={MAP_STYLE_URL}>
            <Camera
              bounds={bounds}
              padding={{ top: 32, left: 32, right: 32, bottom: 32 }}
            />
            <GeoJSONSource id="history-raw" data={rawFeature}>
              <Layer
                id="history-raw-line"
                type="line"
                paint={{
                  'line-color': RAW_COLOR,
                  'line-width': snappedFeature ? 3 : 4,
                  'line-opacity': snappedFeature ? 0.5 : 0.85,
                  'line-dasharray': [1, 2],
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </GeoJSONSource>
            {snappedFeature && (
              <GeoJSONSource id="history-snapped" data={snappedFeature}>
                <Layer
                  id="history-snapped-line"
                  type="line"
                  paint={{
                    'line-color': EMERALD,
                    'line-width': 5,
                    'line-opacity': 0.95,
                  }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </GeoJSONSource>
            )}
          </Map>
        </View>
      ) : (
        <View style={styles.mapEmpty}>
          <Ionicons name="map-outline" size={28} color="#9ca3af" />
          <Text style={styles.mapEmptyText}>
            Too few GPS points to draw a route.
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDistance(record.stats.distanceMeters)}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDuration(record.stats.durationMs)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{record.stats.pointCount}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </View>

      {/* Profile */}
      <View style={[styles.card, styles.profileCard]}>
        <Text style={styles.profileEmoji}>
          {profileMeta ? profileMeta.emoji : '📍'}
        </Text>
        <View style={styles.profileBody}>
          <Text style={styles.profileLabel}>
            {profileMeta ? profileMeta.label : 'Unknown profile'}
          </Text>
          <Text style={styles.profileNote}>
            {record.snap
              ? record.snap.confident
                ? 'Detected from the track'
                : 'Low-confidence detection'
              : 'This session was never snapped'}
          </Text>
        </View>
        <View style={[styles.snapChip, !snapped && styles.snapChipRaw]}>
          <Text
            style={[styles.snapChipText, !snapped && styles.snapChipTextRaw]}
          >
            {snapped ? 'Snapped ✓' : 'Raw only'}
          </Text>
        </View>
      </View>

      {record.recovered && (
        <View style={styles.recoveredCard}>
          <Ionicons name="warning-outline" size={16} color={AMBER} />
          <Text style={styles.recoveredCardText}>
            Recovered after the app was killed — the end of the route is the
            last recorded point.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        {confirmDelete ? (
          <>
            <Pressable
              onPress={remove}
              style={[styles.actionPill, styles.deleteConfirmPill]}
            >
              <Text style={styles.deletePillText}>Delete session? ✓</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              style={[styles.actionPill, styles.keepPill]}
            >
              <Text style={styles.keepPillText}>✕</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* TODO(ticket 004/export): wire to the export bundle share
                sheet once the export format lands. Disabled until then. */}
            <Pressable
              disabled
              style={[
                styles.actionPill,
                styles.exportPill,
                styles.pillDisabled,
              ]}
            >
              <Text style={styles.exportPillText}>Export session</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(true)}
              style={[styles.actionPill, styles.deletePill]}
            >
              <Text style={styles.deletePillText}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// --- Config tab ---------------------------------------------------------------------

const PROVIDER_LABELS: Partial<Record<number, string>> = {
  [LocationProvider.DISTANCE_FILTER]: 'Distance',
  [LocationProvider.ACTIVITY]: 'Activity',
  [LocationProvider.RAW]: 'Raw',
};

const ACCURACY_LABELS: Partial<Record<number, string>> = {
  [LocationAccuracy.HIGH]: 'High',
  [LocationAccuracy.MEDIUM]: 'Medium',
  [LocationAccuracy.LOW]: 'Low',
  [LocationAccuracy.PASSIVE]: 'Passive',
};

type Formatter = (value: unknown) => string;

const bool: Formatter = (v) => (v === true ? 'On' : v === false ? 'Off' : '—');
const text: Formatter = (v) =>
  typeof v === 'string' && v.length > 0 ? v : '—';
const num =
  (unit?: string): Formatter =>
  (v) =>
    typeof v === 'number' ? `${v}${unit ? ` ${unit}` : ''}` : '—';
const json: Formatter = (v) =>
  v === null ||
  v === undefined ||
  (typeof v === 'object' && Object.keys(v).length === 0)
    ? '—'
    : JSON.stringify(v);
const enumLabel =
  (labels: Partial<Record<number, string>>): Formatter =>
  (v) =>
    (typeof v === 'number' && labels[v]) || '—';

interface ConfigRowSpec {
  key: keyof ConfigureOptions;
  label: string;
  format: Formatter;
  platform?: 'android' | 'ios';
}

interface ConfigSectionSpec {
  title: string;
  rows: ConfigRowSpec[];
}

// Mirrors the 7 sections/grouping of the Settings screen.
const CONFIG_SECTIONS: ConfigSectionSpec[] = [
  {
    title: 'Provider & accuracy',
    rows: [
      {
        key: 'locationProvider',
        label: 'Location provider',
        format: enumLabel(PROVIDER_LABELS),
      },
      {
        key: 'desiredAccuracy',
        label: 'Desired accuracy',
        format: enumLabel(ACCURACY_LABELS),
      },
      { key: 'distanceFilter', label: 'Distance filter', format: num('m') },
      { key: 'stationaryRadius', label: 'Stationary radius', format: num('m') },
      { key: 'debug', label: 'Debug (sounds & notifications)', format: bool },
    ],
  },
  {
    title: 'Lifecycle',
    rows: [
      { key: 'stopOnTerminate', label: 'Stop on app terminate', format: bool },
      {
        key: 'startOnBoot',
        label: 'Start on boot',
        format: bool,
        platform: 'android',
      },
      {
        key: 'stopOnStillActivity',
        label: 'Stop on still activity',
        format: bool,
        platform: 'android',
      },
    ],
  },
  {
    title: 'Intervals',
    rows: [
      {
        key: 'interval',
        label: 'Update interval',
        format: num('ms'),
        platform: 'android',
      },
      {
        key: 'fastestInterval',
        label: 'Fastest interval',
        format: num('ms'),
        platform: 'android',
      },
      {
        key: 'activitiesInterval',
        label: 'Activities interval',
        format: num('ms'),
        platform: 'android',
      },
    ],
  },
  {
    title: 'Foreground notification',
    rows: [
      {
        key: 'notificationsEnabled',
        label: 'Notifications enabled',
        format: bool,
        platform: 'android',
      },
      {
        key: 'startForeground',
        label: 'Start foreground service',
        format: bool,
        platform: 'android',
      },
      {
        key: 'notificationTitle',
        label: 'Notification title',
        format: text,
        platform: 'android',
      },
      {
        key: 'notificationText',
        label: 'Notification text',
        format: text,
        platform: 'android',
      },
      {
        key: 'notificationIconColor',
        label: 'Icon color',
        format: text,
        platform: 'android',
      },
      {
        key: 'notificationIconLarge',
        label: 'Large icon (resource name)',
        format: text,
        platform: 'android',
      },
      {
        key: 'notificationIconSmall',
        label: 'Small icon (resource name)',
        format: text,
        platform: 'android',
      },
    ],
  },
  {
    title: 'iOS behavior',
    rows: [
      {
        key: 'activityType',
        label: 'Activity type',
        format: text,
        platform: 'ios',
      },
      {
        key: 'pauseLocationUpdates',
        label: 'Pause location updates',
        format: bool,
        platform: 'ios',
      },
      {
        key: 'saveBatteryOnBackground',
        label: 'Save battery on background',
        format: bool,
        platform: 'ios',
      },
    ],
  },
  {
    title: 'HTTP sync',
    rows: [
      { key: 'url', label: 'Post URL', format: text },
      { key: 'syncUrl', label: 'Sync URL', format: text },
      { key: 'syncThreshold', label: 'Sync threshold', format: num() },
      { key: 'httpHeaders', label: 'HTTP headers', format: json },
      { key: 'postTemplate', label: 'Post template', format: json },
    ],
  },
  {
    title: 'Storage',
    rows: [
      { key: 'maxLocations', label: 'Max stored locations', format: num() },
    ],
  },
];

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function ConfigTab({
  snapshot,
  current,
}: {
  snapshot: Record<string, unknown>;
  current: ConfigureOptions | null;
}) {
  const currentMap = current as Record<string, unknown> | null;
  const anyDiffers =
    currentMap !== null &&
    CONFIG_SECTIONS.some((section) =>
      section.rows.some(
        (row) => !sameValue(snapshot[row.key], currentMap[row.key])
      )
    );

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
    >
      {anyDiffers && (
        <View style={styles.diffLegend}>
          <Text style={styles.diffLegendText}>
            ● Differs from current settings
          </Text>
        </View>
      )}
      {CONFIG_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.rows.map((row) => {
              const value = snapshot[row.key];
              const differs =
                currentMap !== null && !sameValue(value, currentMap[row.key]);
              return (
                <View key={row.key} style={styles.configRow}>
                  <View style={styles.configLabelWrap}>
                    {differs && <Text style={styles.diffDot}>●</Text>}
                    <Text style={styles.configLabel}>{row.label}</Text>
                    {row.platform && (
                      <View style={styles.platformPill}>
                        <Text style={styles.platformPillText}>
                          {row.platform.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.configValue} numberOfLines={2}>
                    {row.format(value)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// --- Logs tab -------------------------------------------------------------------------

type LogFilter = 'all' | 'debug' | 'info' | 'warn';

const LOG_FILTERS: [LogFilter, string][] = [
  ['all', 'All'],
  ['debug', 'Debug'],
  ['info', 'Info'],
  ['warn', 'Warn+'],
];

function logColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return '#ef4444';
    case 'WARN':
      return '#b45309';
    case 'INFO':
      return '#059669';
    default:
      return '#9ca3af';
  }
}

function matchesFilter(level: string, filter: LogFilter): boolean {
  const upper = level.toUpperCase();
  switch (filter) {
    case 'all':
      return true;
    case 'debug':
      return upper === 'DEBUG';
    case 'info':
      return upper === 'INFO';
    case 'warn':
      return upper === 'WARN' || upper === 'ERROR';
  }
}

function LogRow({ entry }: { entry: SessionLogEntry }) {
  return (
    <View style={styles.logRow}>
      <Text style={styles.logTimestamp}>{formatClockMs(entry.timestamp)}</Text>
      <Text style={[styles.logMessage, { color: logColor(entry.level) }]}>
        {entry.message}
      </Text>
    </View>
  );
}

function LogsTab({ logs }: { logs: SessionLogEntry[] }) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter(
      (entry) =>
        matchesFilter(entry.level, filter) &&
        (needle.length === 0 || entry.message.toLowerCase().includes(needle))
    );
  }, [logs, filter, query]);

  return (
    <View style={styles.logsContainer}>
      <View style={styles.logToolbar}>
        <View style={styles.filterChips}>
          {LOG_FILTERS.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[
                styles.filterChip,
                filter === value && styles.filterChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === value && styles.filterChipTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.logSearch}
          value={query}
          onChangeText={setQuery}
          placeholder="Search logs…"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(entry) => String(entry.id)}
        renderItem={({ item }) => <LogRow entry={item} />}
        contentContainerStyle={styles.logList}
        ListEmptyComponent={
          <Text style={styles.logEmpty}>No matching log entries.</Text>
        }
        ListFooterComponent={
          <Text style={styles.logFooter}>
            — {logs.length} {logs.length === 1 ? 'entry' : 'entries'} · DEBUG
            and above —
          </Text>
        }
      />
    </View>
  );
}

// --- Events tab -----------------------------------------------------------------------

type EventTone = 'emerald' | 'amber' | 'muted';

const EVENT_META: Record<string, { label: string; tone: EventTone }> = {
  start: { label: 'Tracking started', tone: 'emerald' },
  stop: { label: 'Tracking stopped', tone: 'emerald' },
  recovered: { label: 'Session recovered', tone: 'emerald' },
  background: { label: 'App backgrounded', tone: 'amber' },
  abortRequested: { label: 'Abort requested', tone: 'amber' },
  error: { label: 'Error', tone: 'amber' },
  foreground: { label: 'App foregrounded', tone: 'muted' },
  stationary: { label: 'Stationary', tone: 'muted' },
  activity: { label: 'Activity update', tone: 'muted' },
  authorization: { label: 'Authorization changed', tone: 'muted' },
};

const TONE_COLORS: Record<EventTone, string> = {
  emerald: EMERALD,
  amber: '#f59e0b',
  muted: '#9ca3af',
};

function payloadSummary(payload: unknown): string | null {
  if (payload === undefined || payload === null) {
    return null;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}

function EventRow({ event, isLast }: { event: SessionEvent; isLast: boolean }) {
  const meta = EVENT_META[event.type] ?? { label: event.type, tone: 'muted' };
  const detail = payloadSummary(event.payload);
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventRail}>
        <View
          style={[styles.eventDot, { backgroundColor: TONE_COLORS[meta.tone] }]}
        />
        {!isLast && <View style={styles.eventLine} />}
      </View>
      <View style={styles.eventBody}>
        <View style={styles.eventTitleLine}>
          <Text style={styles.eventLabel}>{meta.label}</Text>
          <Text style={styles.eventTime}>{formatClock(event.at)}</Text>
        </View>
        {event.headless === true && (
          <Text style={styles.eventHeadless}>captured headless</Text>
        )}
        {detail !== null && (
          <Text style={styles.eventPayload} numberOfLines={2}>
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}

function EventsTab({ events }: { events: SessionEvent[] }) {
  return (
    <FlatList
      style={styles.tabScroll}
      data={events}
      keyExtractor={(event, index) => `${event.at}-${event.type}-${index}`}
      renderItem={({ item, index }) => (
        <EventRow event={item} isLast={index === events.length - 1} />
      )}
      contentContainerStyle={styles.eventList}
      ListEmptyComponent={
        <Text style={styles.logEmpty}>No events were captured.</Text>
      }
    />
  );
}

// --- Screen ------------------------------------------------------------------------------

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ConfigureOptions | null>(
    null
  );
  const [tab, setTab] = useState<DetailTab>('overview');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [loadedRecord, config] = await Promise.all([
          id ? loadSessionRecord(id) : Promise.resolve(null),
          loadStoredConfig(),
        ]);
        if (isMounted) {
          setRecord(loadedRecord);
          setCurrentConfig(config);
        }
      } catch (error) {
        console.warn('[SessionDetail] load failed:', error);
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const onDeleted = useCallback(() => {
    router.back();
  }, [router]);

  const title = record ? formatTitle(record.startedAt) : 'Session';

  if (!loaded || record === null) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title, headerShown: true }} />
        <Text style={styles.loadingText}>
          {loaded ? 'Session not found.' : 'Loading session…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title, headerShown: true }} />

      <View style={styles.tabBar}>
        {TABS.map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[
              styles.tabSegment,
              tab === value && styles.tabSegmentSelected,
            ]}
          >
            <Text
              style={[
                styles.tabSegmentText,
                tab === value && styles.tabSegmentTextSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'overview' && (
        <OverviewTab record={record} onDeleted={onDeleted} />
      )}
      {tab === 'config' && (
        <ConfigTab snapshot={record.config} current={currentConfig} />
      )}
      {tab === 'logs' && <LogsTab logs={record.logs} />}
      {tab === 'events' && <EventsTab events={record.events} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 2,
    margin: 16,
    marginBottom: 8,
  },
  tabSegment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabSegmentSelected: {
    backgroundColor: '#ffffff',
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabSegmentTextSelected: {
    color: '#111827',
  },
  tabScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  // Overview
  mapCard: {
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  mapEmpty: {
    height: 140,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapEmptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileEmoji: {
    fontSize: 26,
  },
  profileBody: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  profileNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  snapChip: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  snapChipRaw: {
    backgroundColor: '#f3f4f6',
  },
  snapChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  snapChipTextRaw: {
    color: '#6b7280',
  },
  recoveredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AMBER_BG,
    borderRadius: 10,
    padding: 12,
  },
  recoveredCardText: {
    flex: 1,
    color: '#92400e',
    fontSize: 12.5,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  exportPill: {
    backgroundColor: EMERALD,
    flex: 2,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  exportPillText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  deletePill: {
    backgroundColor: '#dc2626',
  },
  deleteConfirmPill: {
    backgroundColor: '#dc2626',
    flex: 2,
  },
  deletePillText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  keepPill: {
    backgroundColor: '#f3f4f6',
  },
  keepPillText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
  },
  // Config
  diffLegend: {
    backgroundColor: AMBER_BG,
    borderRadius: 8,
    padding: 10,
  },
  diffLegendText: {
    color: AMBER,
    fontWeight: '600',
    fontSize: 12.5,
  },
  section: {
    marginBottom: 8,
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
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  configLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  diffDot: {
    color: '#f59e0b',
    fontSize: 11,
  },
  configLabel: {
    fontSize: 14,
    color: '#111827',
    flexShrink: 1,
  },
  platformPill: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  platformPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  configValue: {
    fontSize: 14,
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  // Logs
  logsContainer: {
    flex: 1,
  },
  logToolbar: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 2,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterChipSelected: {
    backgroundColor: '#ffffff',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextSelected: {
    color: '#111827',
  },
  logSearch: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  logList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  logRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  logTimestamp: {
    fontFamily: MONO,
    fontSize: 11,
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },
  logMessage: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 11,
    lineHeight: 15,
  },
  logEmpty: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingVertical: 24,
  },
  logFooter: {
    textAlign: 'center',
    color: '#9ca3af',
    fontFamily: MONO,
    fontSize: 11,
    paddingVertical: 16,
  },
  // Events
  eventList: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
  },
  eventRail: {
    alignItems: 'center',
    width: 12,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  eventLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e5e7eb',
    marginVertical: 2,
  },
  eventBody: {
    flex: 1,
    paddingBottom: 16,
  },
  eventTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  eventTime: {
    fontSize: 12,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  eventHeadless: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 2,
  },
  eventPayload: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: MONO,
    marginTop: 2,
  },
});
