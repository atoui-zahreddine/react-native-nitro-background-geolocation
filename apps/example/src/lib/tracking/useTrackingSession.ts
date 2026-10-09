import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import BackgroundGeolocation, {
  AuthorizationStatus,
  type Location,
} from 'react-native-nitro-background-geolocation';
import { loadStoredConfig, ownedOptions } from './config';
import {
  buildSessionRecord,
  mergeEventTimelines,
  type SessionEvent,
} from './history';
import {
  collectSessionLogs,
  deleteSessionRecord,
  saveSessionRecord,
} from './historyStore';
import { requestTrackingPermissions } from './permissions';
import { deriveStats, filterSessionPoints, type SessionStats } from './session';
import {
  clearSessionAnchor,
  getSessionAnchor,
  setSessionAnchor,
} from './sessionStore';
import { clearSpool, readSpoolEvents } from './spoolStore';

export type SessionPhase =
  /** Reading the anchor + service status on mount. */
  | 'initializing'
  | 'idle'
  /** Start requested: permissions, prune, configure, start() in flight. */
  | 'starting'
  | 'tracking'
  | 'stopping'
  /** A finished (or orphaned) track is on display. */
  | 'stopped';

export interface TrackingSession {
  phase: SessionPhase;
  /** Anchor of the current or displayed session; null when idle. */
  startedAt: number | null;
  /**
   * History-record id of the displayed stopped session; null while idle or
   * live. The Tracker screen uses it to attach the snap result.
   */
  sessionId: string | null;
  /** The session's route, time-ordered. */
  points: Location[];
  stats: SessionStats;
  authorization: AuthorizationStatus | null;
  locationServicesEnabled: boolean | null;
  /** False when the user denied Android runtime permissions at Start. */
  permissionsGranted: boolean | null;
  lastError: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Dismiss the stopped track, keeping its history record, return to idle. */
  finish: () => void;
  /** Dismiss the stopped track, delete its history record, return to idle. */
  discard: () => void;
  /** Re-read the route and service status from the native side. */
  resync: () => Promise<void>;
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown native failure';
}

/**
 * The session layer beneath the Tracker UI: owns the AsyncStorage anchor,
 * SQLite route reconstruction, plugin lifecycle and event wiring, and — since
 * session history — finalizing every session into a history record.
 *
 * On mount it resolves the launch state: anchor + running service resumes
 * the live view (app relaunched mid-session, including after a kill); an
 * anchor without a running service finalizes the orphaned session into a
 * `recovered` history record and presents it as the stopped route view; no
 * anchor is idle.
 */
export function useTrackingSession(): TrackingSession {
  const [phase, setPhase] = useState<SessionPhase>('initializing');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [points, setPoints] = useState<Location[]>([]);
  const [authorization, setAuthorization] =
    useState<AuthorizationStatus | null>(null);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState<
    boolean | null
  >(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(
    null
  );
  const [lastError, setLastError] = useState<string | null>(null);

  // Listeners live for the whole mount; they read the current phase/anchor
  // through refs instead of resubscribing on every state change.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startedAtRef = useRef(startedAt);
  startedAtRef.current = startedAt;
  // The live session's config snapshot and JS-captured events timeline.
  const configRef = useRef<Record<string, unknown> | null>(null);
  const eventsRef = useRef<SessionEvent[]>([]);

  const recordEvent = useCallback((type: string, payload?: unknown) => {
    const current = phaseRef.current;
    if (
      current === 'starting' ||
      current === 'tracking' ||
      current === 'stopping'
    ) {
      eventsRef.current.push(
        payload === undefined
          ? { at: Date.now(), type }
          : { at: Date.now(), type, payload }
      );
    }
  }, []);

  /**
   * Assemble and persist the history record for a finished session. Failures
   * surface as lastError but never block the stop/recovery flow.
   */
  const finalizeSession = useCallback(
    async (input: {
      anchor: number;
      stoppedAt: number;
      config: Record<string, unknown> | null;
      sessionPoints: Location[];
      recovered: boolean;
    }): Promise<string | null> => {
      try {
        const [logs, spooled] = await Promise.all([
          collectSessionLogs(input.anchor, input.stoppedAt),
          readSpoolEvents(),
        ]);
        const sessionSpool = spooled.filter((e) => e.at >= input.anchor);
        const record = buildSessionRecord({
          startedAt: input.anchor,
          stoppedAt: input.stoppedAt,
          recovered: input.recovered,
          config: input.config ?? {},
          points: input.sessionPoints,
          logs,
          events: mergeEventTimelines(eventsRef.current, sessionSpool),
        });
        await saveSessionRecord(record);
        clearSpool();
        return record.id;
      } catch (error) {
        setLastError(formatError(error));
        return null;
      }
    },
    []
  );

  const resync = useCallback(async () => {
    try {
      const status = await BackgroundGeolocation.checkStatus();
      setAuthorization(status.authorization);
      setLocationServicesEnabled(status.locationServicesEnabled);
      const anchor = startedAtRef.current;
      if (anchor !== null) {
        const all = await BackgroundGeolocation.getLocations();
        setPoints(filterSessionPoints(all, anchor));
      }
    } catch (error) {
      setLastError(formatError(error));
    }
  }, []);

  // Launch-state resolution.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [anchor, status] = await Promise.all([
          getSessionAnchor(),
          BackgroundGeolocation.checkStatus(),
        ]);
        if (!isMounted) {
          return;
        }
        setAuthorization(status.authorization);
        setLocationServicesEnabled(status.locationServicesEnabled);
        if (anchor === null) {
          setPhase('idle');
          return;
        }
        const all = await BackgroundGeolocation.getLocations();
        if (!isMounted) {
          return;
        }
        const sessionPoints = filterSessionPoints(all, anchor.startedAt);
        setStartedAt(anchor.startedAt);
        setPoints(sessionPoints);
        configRef.current = anchor.config;
        if (status.isRunning) {
          setPhase('tracking');
        } else {
          // Orphaned session (stopped or killed while we were gone):
          // finalize it into a recovered history record, then show its track.
          const lastPoint = sessionPoints[sessionPoints.length - 1];
          const id = await finalizeSession({
            anchor: anchor.startedAt,
            stoppedAt: lastPoint?.time ?? Date.now(),
            config: anchor.config,
            sessionPoints,
            recovered: true,
          });
          if (!isMounted) {
            return;
          }
          setSessionId(id);
          setPhase('stopped');
          await clearSessionAnchor();
        }
      } catch (error) {
        if (isMounted) {
          setLastError(formatError(error));
          setPhase('idle');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [finalizeSession]);

  // Plugin events: UI state plus the session's events timeline.
  useEffect(() => {
    const disposers = [
      BackgroundGeolocation.onLocation((location) => {
        const anchor = startedAtRef.current;
        if (
          phaseRef.current === 'tracking' &&
          anchor !== null &&
          location.time >= anchor
        ) {
          setPoints((prev) => [...prev, location]);
        }
      }),
      BackgroundGeolocation.onStart(() => {
        recordEvent('start');
        if (phaseRef.current === 'starting') {
          setPhase('tracking');
        }
      }),
      BackgroundGeolocation.onStop(() => {
        recordEvent('stop');
        // Service stopped from outside the Stop flow (e.g. via Debug tab).
        if (phaseRef.current === 'tracking') {
          setPhase('stopped');
          void clearSessionAnchor();
        }
      }),
      BackgroundGeolocation.onStationary((location) => {
        recordEvent('stationary', {
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }),
      BackgroundGeolocation.onActivity((activity) => {
        recordEvent('activity', activity);
      }),
      BackgroundGeolocation.onError((error) => {
        recordEvent('error', { code: error.code, message: error.message });
        setLastError(`[${error.code}] ${error.message}`);
      }),
      BackgroundGeolocation.onAuthorization((status) => {
        recordEvent('authorization', { status });
        setAuthorization(status);
      }),
      BackgroundGeolocation.onForeground(() => {
        recordEvent('foreground');
      }),
      BackgroundGeolocation.onBackground(() => {
        recordEvent('background');
      }),
      BackgroundGeolocation.onAbortRequested(() => {
        recordEvent('abortRequested');
      }),
    ];
    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, [recordEvent]);

  // Foreground return: re-sync points recorded while backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && phaseRef.current === 'tracking') {
        void resync();
      }
    });
    return () => subscription.remove();
  }, [resync]);

  const start = useCallback(async () => {
    if (phaseRef.current === 'tracking' || phaseRef.current === 'starting') {
      return;
    }
    setLastError(null);
    setPhase('starting');

    const { granted } = await requestTrackingPermissions();
    setPermissionsGranted(granted);
    if (!granted) {
      setPhase('idle');
      setLastError('Location permission is required to start tracking.');
      return;
    }

    try {
      // Prune the previous session's rows; its history record was already
      // finalized at stop/recovery, so nothing is lost here. The anchor
      // makes the new session's slice of SQLite unambiguous even if pruning
      // is skipped.
      await BackgroundGeolocation.deleteAllLocations();
      const config = await loadStoredConfig();
      await BackgroundGeolocation.configure(ownedOptions(config));
      const now = Date.now();
      const configSnapshot = config as unknown as Record<string, unknown>;
      await setSessionAnchor({ startedAt: now, config: configSnapshot });
      configRef.current = configSnapshot;
      eventsRef.current = [];
      clearSpool();
      setStartedAt(now);
      setSessionId(null);
      setPoints([]);
      // On iOS this is also what triggers the Always-authorization prompt.
      await BackgroundGeolocation.start();
      setPhase('tracking');
      void resync();
    } catch (error) {
      setLastError(formatError(error));
      setPhase('idle');
      setStartedAt(null);
      await clearSessionAnchor();
    }
  }, [resync]);

  const stop = useCallback(async () => {
    if (phaseRef.current !== 'tracking') {
      return;
    }
    setPhase('stopping');
    // Record the stop deterministically here rather than relying on the native
    // onStop callback: that fires on MSG_ON_SERVICE_STOPPED, which round-trips
    // back to JS only after finalizeSession has already snapshotted the events
    // timeline and the phase has moved to 'stopped' (past recordEvent's gate),
    // so the native stop event never lands in the record.
    recordEvent('stop');
    try {
      await BackgroundGeolocation.stop();
    } catch (error) {
      setLastError(formatError(error));
    }
    const anchor = startedAtRef.current;
    let sessionPoints: Location[] = [];
    try {
      if (anchor !== null) {
        // Final authoritative read: catches points that never reached JS.
        const all = await BackgroundGeolocation.getLocations();
        sessionPoints = filterSessionPoints(all, anchor);
        setPoints(sessionPoints);
      }
    } catch (error) {
      setLastError(formatError(error));
    }
    if (anchor !== null) {
      const id = await finalizeSession({
        anchor,
        stoppedAt: Date.now(),
        config: configRef.current,
        sessionPoints,
        recovered: false,
      });
      setSessionId(id);
    }
    setPhase('stopped');
    await clearSessionAnchor();
  }, [finalizeSession, recordEvent]);

  // Reset the stopped-track view back to idle. Shared by finish (keep the
  // history record) and discard (delete it).
  const resetToIdle = useCallback(() => {
    setPoints([]);
    setStartedAt(null);
    setSessionId(null);
    setPhase('idle');
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current !== 'stopped') {
      return;
    }
    // The record was already persisted at stop; just dismiss the view.
    resetToIdle();
  }, [resetToIdle]);

  const discard = useCallback(() => {
    if (phaseRef.current !== 'stopped') {
      return;
    }
    const id = sessionId;
    if (id !== null) {
      // Discard means "this run never happened" — including in history.
      void deleteSessionRecord(id).catch((error) =>
        setLastError(formatError(error))
      );
    }
    resetToIdle();
  }, [sessionId, resetToIdle]);

  const stats = useMemo(() => deriveStats(points), [points]);

  return {
    phase,
    startedAt,
    sessionId,
    points,
    stats,
    authorization,
    locationServicesEnabled,
    permissionsGranted,
    lastError,
    start,
    stop,
    finish,
    discard,
    resync,
  };
}
