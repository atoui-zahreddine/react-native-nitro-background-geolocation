import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type LngLatBounds,
} from '@maplibre/maplibre-react-native';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackgroundGeolocation, {
  AuthorizationStatus,
  type Location,
} from 'react-native-nitro-background-geolocation';
import { detectProfile } from '../../lib/tracking/profile';
import { snapToRoads } from '../../lib/tracking/snap';
import type { Profile, SnapResult } from '../../lib/tracking/types';
import { useTrackingSession } from '../../lib/tracking/useTrackingSession';

// OpenFreeMap Liberty: free, keyless. Attribution control must stay visible
// (usage policy) — it is on by default.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const LIVE_COLOR = '#10b981';
const SNAP_COLOR = '#6366f1';
const RAW_COLOR = '#64748b';

const PROFILE_META: Record<Profile, { emoji: string; label: string }> = {
  walking: { emoji: '🚶', label: 'Walking' },
  biking: { emoji: '🚴', label: 'Biking' },
  driving: { emoji: '🚗', label: 'Driving' },
};
const PROFILES: Profile[] = ['walking', 'biking', 'driving'];

type SnapPhase =
  | { status: 'idle' }
  | { status: 'snapping' }
  | { status: 'done'; result: SnapResult };

type RouteView = 'snapped' | 'raw' | 'both';

// --- Formatting ----------------------------------------------------------------

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

// --- GeoJSON helpers -------------------------------------------------------------

function lineFeature(points: readonly Location[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.longitude, p.latitude]),
    },
  };
}

function pointFeature(point: Location): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [point.longitude, point.latitude],
    },
  };
}

function boundsOf(points: readonly Location[]): LngLatBounds {
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

const SNAP_FAILURE_COPY: Record<string, string> = {
  too_few_points: 'Not enough accurate GPS points to snap this route.',
  timeout: 'Road matching timed out.',
  network: 'No connection — showing the raw GPS trace.',
  rate_limited: 'Road-matching service is busy.',
  no_match: 'This track could not be matched to roads.',
  bad_response: 'Road-matching service returned an unexpected response.',
};

// --- Small building blocks -------------------------------------------------------

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.recDot, { opacity }]} />;
}

function ProgressBar() {
  const translate = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 260,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [translate]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { transform: [{ translateX: translate }] },
        ]}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InlineCard({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.inlineCard}>
      <Ionicons name={icon} size={18} color="#b45309" />
      <Text style={styles.inlineCardText}>{text}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.inlineCardAction}>
          <Text style={styles.inlineCardActionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Screen -----------------------------------------------------------------------

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const session = useTrackingSession();

  const [follow, setFollow] = useState(true);
  const [profile, setProfile] = useState<Profile>('walking');
  const [confident, setConfident] = useState(true);
  const [snap, setSnap] = useState<SnapPhase>({ status: 'idle' });
  const [routeView, setRouteView] = useState<RouteView>('both');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const isTracking =
    session.phase === 'tracking' || session.phase === 'stopping';
  const isStopped = session.phase === 'stopped';
  const isIdle = session.phase === 'idle' || session.phase === 'starting';

  // --- Snapping orchestration ---
  const snapRunId = useRef(0);
  const runSnap = useCallback((points: Location[], forProfile: Profile) => {
    const id = ++snapRunId.current;
    setSnap({ status: 'snapping' });
    snapToRoads(points, forProfile).then((result) => {
      if (snapRunId.current === id) {
        setSnap({ status: 'done', result });
      }
    });
  }, []);

  // Auto-detect + snap once per stopped session.
  const autoSnappedFor = useRef<number | null>(null);
  useEffect(() => {
    if (
      isStopped &&
      session.startedAt !== null &&
      autoSnappedFor.current !== session.startedAt &&
      session.points.length >= 2
    ) {
      autoSnappedFor.current = session.startedAt;
      const detection = detectProfile(session.points);
      setProfile(detection.profile);
      setConfident(detection.confident);
      setRouteView('both');
      runSnap(session.points, detection.profile);
    }
  }, [isStopped, session.startedAt, session.points, runSnap]);

  // Reset per-session UI state on phase changes.
  useEffect(() => {
    if (session.phase === 'tracking') {
      setFollow(true);
      setSnap({ status: 'idle' });
      setPickerOpen(false);
      setConfirmDiscard(false);
      setSheetExpanded(false);
    }
    if (session.phase === 'idle') {
      setSnap({ status: 'idle' });
      setPickerOpen(false);
      setConfirmDiscard(false);
    }
  }, [session.phase]);

  const overrideProfile = useCallback(
    (next: Profile) => {
      setProfile(next);
      setConfident(true);
      setPickerOpen(false);
      runSnap(session.points, next);
    },
    [runSnap, session.points]
  );

  // --- Elapsed ticker while tracking ---
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!isTracking) {
      return;
    }
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTracking]);

  const lastPoint = session.points[session.points.length - 1];
  const elapsedSeconds =
    session.startedAt === null
      ? 0
      : isTracking
        ? (nowTick - session.startedAt) / 1000
        : lastPoint
          ? (lastPoint.time - session.startedAt) / 1000
          : 0;

  // --- Map data ---
  const rawFeature = useMemo(
    () => (session.points.length >= 2 ? lineFeature(session.points) : null),
    [session.points]
  );
  const routeBounds = useMemo(
    () => (session.points.length >= 2 ? boundsOf(session.points) : null),
    [session.points]
  );
  const snappedFeature = useMemo(() => {
    if (snap.status === 'done' && snap.result.ok) {
      return {
        type: 'Feature',
        properties: {},
        geometry: snap.result.geometry,
      } as GeoJSON.Feature;
    }
    return null;
  }, [snap]);

  const showRaw =
    rawFeature !== null && (routeView !== 'snapped' || snappedFeature === null);
  const showSnapped = snappedFeature !== null && routeView !== 'raw';

  // --- Sheet drag ---
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, gesture) => Math.abs(gesture.dy) > 12,
        onPanResponderRelease: (_e, gesture) => {
          if (gesture.dy < -30) {
            setSheetExpanded(true);
          } else if (gesture.dy > 30) {
            setSheetExpanded(false);
          }
        },
      }),
    []
  );

  // --- Degraded-state cards ---
  const cards: React.ReactNode[] = [];
  if (session.permissionsGranted === false) {
    cards.push(
      <InlineCard
        key="perm"
        icon="warning"
        text="Location permission is required to record a route."
        actionLabel="Open Settings"
        onAction={() => Linking.openSettings()}
      />
    );
  }
  if (session.locationServicesEnabled === false) {
    cards.push(
      <InlineCard
        key="services"
        icon="location-outline"
        text="Location services are turned off."
        actionLabel={
          Platform.OS === 'android' ? 'Location Settings' : 'Open Settings'
        }
        onAction={() =>
          Platform.OS === 'android'
            ? BackgroundGeolocation.showLocationSettings()
            : Linking.openSettings()
        }
      />
    );
  }
  if (
    Platform.OS === 'ios' &&
    isTracking &&
    session.authorization === AuthorizationStatus.AUTHORIZED_FOREGROUND
  ) {
    cards.push(
      <InlineCard
        key="always"
        icon="moon-outline"
        text='Background permission is "While Using" — tracking pauses if the app is closed.'
        actionLabel="Open Settings"
        onAction={() => Linking.openSettings()}
      />
    );
  }

  const snapFailure =
    snap.status === 'done' && !snap.result.ok ? snap.result : null;

  const stopDisabled = session.phase === 'stopping';

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL}>
        {(isIdle || isTracking) && (
          <Camera
            initialViewState={{ zoom: 15 }}
            trackUserLocation={follow ? 'default' : undefined}
            onTrackUserLocationChange={(event) =>
              setFollow(event.nativeEvent.trackUserLocation !== null)
            }
          />
        )}
        {isStopped && routeBounds && (
          <Camera
            bounds={routeBounds}
            padding={{ top: 120, left: 48, right: 48, bottom: 320 }}
            duration={700}
          />
        )}

        {(isIdle || isTracking) && <UserLocation />}

        {isTracking && rawFeature && (
          <GeoJSONSource id="live-route" data={rawFeature}>
            <Layer
              id="live-route-line"
              type="line"
              paint={{
                'line-color': LIVE_COLOR,
                'line-width': 4,
                'line-opacity': 0.9,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        )}

        {isStopped && showRaw && rawFeature && (
          <GeoJSONSource id="raw-route" data={rawFeature}>
            <Layer
              id="raw-route-line"
              type="line"
              paint={{
                'line-color': RAW_COLOR,
                'line-width': showSnapped ? 3 : 4,
                'line-opacity': showSnapped ? 0.5 : 0.85,
                'line-dasharray': [1, 2],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        )}

        {isStopped && showSnapped && snappedFeature && (
          <GeoJSONSource id="snapped-route" data={snappedFeature}>
            <Layer
              id="snapped-route-line"
              type="line"
              paint={{
                'line-color': SNAP_COLOR,
                'line-width': 5,
                'line-opacity': 0.95,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        )}

        {isStopped && session.points.length >= 2 && (
          <>
            <GeoJSONSource
              id="route-start"
              data={pointFeature(session.points[0]!)}
            >
              <Layer
                id="route-start-circle"
                type="circle"
                paint={{
                  'circle-radius': 7,
                  'circle-color': LIVE_COLOR,
                  'circle-stroke-width': 2.5,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </GeoJSONSource>
            <GeoJSONSource id="route-end" data={pointFeature(lastPoint!)}>
              <Layer
                id="route-end-circle"
                type="circle"
                paint={{
                  'circle-radius': 7,
                  'circle-color': '#ef4444',
                  'circle-stroke-width': 2.5,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </GeoJSONSource>
          </>
        )}
      </Map>

      {/* Gear (dimmed while recording — settings are read-only) */}
      <Link href="/settings" asChild>
        <Pressable
          style={StyleSheet.flatten([
            styles.gearButton,
            { top: insets.top + 12 },
            isTracking && styles.gearDimmed,
          ])}
        >
          <Ionicons name="settings-sharp" size={22} color="#374151" />
        </Pressable>
      </Link>

      {/* Live stats card */}
      {isTracking && (
        <View style={[styles.statsCard, { top: insets.top + 12 }]}>
          <View style={styles.statsHeader}>
            <PulsingDot />
            <Text style={styles.recText}>REC</Text>
          </View>
          <View style={styles.statsRow}>
            <Stat label="Elapsed" value={formatDuration(elapsedSeconds)} />
            <Stat
              label="Distance"
              value={formatDistance(session.stats.distanceMeters)}
            />
            <Stat
              label="Avg speed"
              value={formatSpeed(session.stats.avgMovingSpeedKmh)}
            />
            <Stat label="Points" value={String(session.stats.pointCount)} />
          </View>
        </View>
      )}

      {/* Degraded-state cards */}
      {cards.length > 0 && (
        <View
          style={[
            styles.cardsStack,
            { top: insets.top + (isTracking ? 128 : 68) },
          ]}
        >
          {cards}
        </View>
      )}

      {/* Recenter FAB */}
      {isTracking && !follow && (
        <Pressable style={styles.recenterFab} onPress={() => setFollow(true)}>
          <Ionicons name="locate" size={22} color={SNAP_COLOR} />
        </Pressable>
      )}

      {/* Idle / tracking action pill */}
      {(isIdle || isTracking) && (
        <Pressable
          disabled={session.phase === 'starting' || stopDisabled}
          onPress={isTracking ? session.stop : session.start}
          style={[
            styles.actionPill,
            isTracking ? styles.stopPill : styles.startPill,
            (session.phase === 'starting' || stopDisabled) && styles.pillBusy,
          ]}
        >
          <Text style={styles.actionPillText}>
            {session.phase === 'starting'
              ? 'Starting…'
              : stopDisabled
                ? 'Stopping…'
                : isTracking
                  ? 'Stop'
                  : 'Start tracking'}
          </Text>
        </Pressable>
      )}

      {/* Stopped: bottom sheet */}
      {isStopped && (
        <View
          style={[styles.sheet, sheetExpanded && styles.sheetExpanded]}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPress={() => setSheetExpanded((v) => !v)}
            style={styles.sheetHandleWrap}
          >
            <View style={styles.sheetHandle} />
          </Pressable>

          {session.points.length < 2 ? (
            <>
              <Text style={styles.sheetTitle}>No route recorded</Text>
              <Text style={styles.sheetSubtitle}>
                Too few GPS points were captured in this session.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <Pressable
                  onPress={() => setPickerOpen((v) => !v)}
                  style={styles.profileBadge}
                >
                  <Text style={styles.profileEmoji}>
                    {PROFILE_META[profile].emoji}
                  </Text>
                  <Text style={styles.profileLabel}>
                    {PROFILE_META[profile].label}
                    {!confident ? ' (guess)' : ''}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#6b7280" />
                </Pressable>
                <Text style={styles.sheetMetrics}>
                  {formatDistance(session.stats.distanceMeters)} ·{' '}
                  {formatDuration(elapsedSeconds)}
                </Text>
              </View>

              {pickerOpen && (
                <View style={styles.profilePicker}>
                  {PROFILES.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => overrideProfile(p)}
                      style={[
                        styles.profileChip,
                        p === profile && styles.profileChipSelected,
                      ]}
                    >
                      <Text style={styles.profileChipText}>
                        {PROFILE_META[p].emoji} {PROFILE_META[p].label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {snap.status === 'snapping' && (
                <View style={styles.snapStatus}>
                  <Text style={styles.snapStatusText}>Snapping to roads…</Text>
                  <ProgressBar />
                </View>
              )}

              {snapFailure && (
                <View style={styles.failureCard}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={18}
                    color="#b45309"
                  />
                  <Text style={styles.failureText}>
                    {SNAP_FAILURE_COPY[snapFailure.reason] ??
                      snapFailure.message}
                  </Text>
                  <Pressable
                    onPress={() => runSnap(session.points, profile)}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {snap.status === 'done' && snap.result.ok && (
                <View style={styles.viewToggle}>
                  {(
                    [
                      ['snapped', 'Snapped'],
                      ['raw', 'Raw GPS'],
                      ['both', 'Both'],
                    ] as [RouteView, string][]
                  ).map(([view, label]) => (
                    <Pressable
                      key={view}
                      onPress={() => setRouteView(view)}
                      style={[
                        styles.viewSegment,
                        routeView === view && styles.viewSegmentSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.viewSegmentText,
                          routeView === view && styles.viewSegmentTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {sheetExpanded && (
                <View style={styles.sheetDetails}>
                  <Text style={styles.detailLine}>
                    Recorded points: {session.stats.pointCount}
                  </Text>
                  <Text style={styles.detailLine}>
                    Moving time: {formatDuration(session.stats.movingSeconds)}
                  </Text>
                  <Text style={styles.detailLine}>
                    Avg moving speed:{' '}
                    {formatSpeed(session.stats.avgMovingSpeedKmh)}
                  </Text>
                  {snap.status === 'done' && snap.result.ok && (
                    <Text style={styles.detailLine}>
                      Snapped length:{' '}
                      {formatDistance(snap.result.distanceMeters)}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          <View style={styles.sheetFooter}>
            {confirmDiscard ? (
              <>
                <Pressable
                  onPress={session.discard}
                  style={[styles.footerButton, styles.discardConfirm]}
                >
                  <Text style={styles.discardConfirmText}>Discard route?</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDiscard(false)}
                  style={[styles.footerButton, styles.footerSecondary]}
                >
                  <Text style={styles.footerSecondaryText}>Keep</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setConfirmDiscard(true)}
                  style={[styles.footerButton, styles.footerSecondary]}
                >
                  <Text style={styles.footerSecondaryText}>Discard</Text>
                </Pressable>
                <Pressable
                  onPress={session.discard}
                  style={[styles.footerButton, styles.footerPrimary]}
                >
                  <Text style={styles.footerPrimaryText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  gearButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  gearDimmed: {
    opacity: 0.55,
  },
  statsCard: {
    position: 'absolute',
    left: 16,
    right: 72,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  cardsStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
  },
  inlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
  },
  inlineCardText: {
    flex: 1,
    color: '#92400e',
    fontSize: 12.5,
    lineHeight: 17,
  },
  inlineCardAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  inlineCardActionText: {
    color: '#b45309',
    fontWeight: '600',
    fontSize: 12,
  },
  recenterFab: {
    position: 'absolute',
    right: 16,
    bottom: 108,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  actionPill: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  startPill: {
    backgroundColor: LIVE_COLOR,
  },
  stopPill: {
    backgroundColor: '#ef4444',
  },
  pillBusy: {
    opacity: 0.7,
  },
  actionPillText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  sheetExpanded: {},
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  profileEmoji: {
    fontSize: 16,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sheetMetrics: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  profilePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  profileChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  profileChipSelected: {
    backgroundColor: '#e0e7ff',
  },
  profileChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  snapStatus: {
    marginBottom: 10,
  },
  snapStatusText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    width: 80,
    height: 4,
    borderRadius: 2,
    backgroundColor: SNAP_COLOR,
  },
  failureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  failureText: {
    flex: 1,
    color: '#92400e',
    fontSize: 12.5,
    lineHeight: 17,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  retryText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 2,
    marginBottom: 10,
  },
  viewSegment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewSegmentSelected: {
    backgroundColor: SNAP_COLOR,
  },
  viewSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  viewSegmentTextSelected: {
    color: '#ffffff',
  },
  sheetDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    marginBottom: 10,
    gap: 4,
  },
  detailLine: {
    fontSize: 13,
    color: '#4b5563',
    fontVariant: ['tabular-nums'],
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerSecondary: {
    backgroundColor: '#f3f4f6',
  },
  footerSecondaryText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  footerPrimary: {
    backgroundColor: SNAP_COLOR,
  },
  footerPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  discardConfirm: {
    backgroundColor: '#dc2626',
  },
  discardConfirmText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
