import { deriveStats, type SessionStats } from './session';
import type { Profile, SnapResult, TrackPoint } from './types';

/**
 * Structural twin of the plugin's `LogEntry`; keeping it local keeps this
 * module pure TS and unit-testable off-device (same pattern as TrackPoint).
 */
export interface SessionLogEntry {
  id: number;
  timestamp: number;
  level: string;
  message: string;
  stackTrace: string;
}

/** One entry in a session's events timeline. */
export interface SessionEvent {
  /** UTC ms. */
  at: number;
  /** Plugin event name: start, stop, stationary, activity, error, … */
  type: string;
  payload?: unknown;
  /** True when captured by the headless handler while the app was dead. */
  headless?: boolean;
}

/** Snap outcome attached after the Tracker screen finishes snapping. */
export interface SessionSnap {
  profile: Profile;
  confident: boolean;
  /** Null when snapping never completed (e.g. offline, discarded early). */
  result: SnapResult | null;
}

export interface SessionRecordStats extends SessionStats {
  /** Wall-clock session length (stoppedAt - startedAt), in ms. */
  durationMs: number;
}

/**
 * The full stored session: one JSON file per record. `points` is typed
 * structurally; at runtime the plugin's richer `Location` objects are stored
 * verbatim.
 */
export interface SessionRecord {
  version: 1;
  id: string;
  startedAt: number;
  stoppedAt: number;
  /** True when finalized by the kill-recovery path instead of a clean stop. */
  recovered: boolean;
  /** The config snapshot the session ran with, captured at start. */
  config: Record<string, unknown>;
  points: TrackPoint[];
  snap: SessionSnap | null;
  stats: SessionRecordStats;
  logs: SessionLogEntry[];
  events: SessionEvent[];
}

/** The list-row projection kept in the AsyncStorage index. */
export interface SessionSummary {
  id: string;
  startedAt: number;
  stoppedAt: number;
  recovered: boolean;
  /** Null until a snap result is attached. */
  profile: Profile | null;
  distanceMeters: number;
  durationMs: number;
  pointCount: number;
}

export interface LogWindow {
  startedAt: number;
  stoppedAt: number;
  /** Slack on both sides of the window; defaults to 30 s. */
  marginMs?: number;
}

export const LOG_WINDOW_MARGIN_MS = 30_000;

/**
 * Slice the native log stream down to a session's window (± margin),
 * excluding TRACE noise, ordered by timestamp.
 */
export function filterLogWindow(
  entries: readonly SessionLogEntry[],
  { startedAt, stoppedAt, marginMs = LOG_WINDOW_MARGIN_MS }: LogWindow
): SessionLogEntry[] {
  const from = startedAt - marginMs;
  const to = stoppedAt + marginMs;
  return entries
    .filter(
      (e) =>
        e.timestamp >= from &&
        e.timestamp <= to &&
        e.level.toUpperCase() !== 'TRACE'
    )
    .sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);
}

/**
 * Merge the live JS-listener timeline with events spooled by the headless
 * handler while the app was dead. Headless entries are tagged.
 */
export function mergeEventTimelines(
  live: readonly SessionEvent[],
  headless: readonly SessionEvent[]
): SessionEvent[] {
  return [...live, ...headless.map((e) => ({ ...e, headless: true }))].sort(
    (a, b) => a.at - b.at
  );
}

export interface SessionRecordInput {
  startedAt: number;
  stoppedAt: number;
  recovered: boolean;
  config: Record<string, unknown>;
  points: TrackPoint[];
  logs: SessionLogEntry[];
  events: SessionEvent[];
}

/** Assemble the stored record; `snap` starts null and is attached later. */
export function buildSessionRecord(input: SessionRecordInput): SessionRecord {
  return {
    version: 1,
    id: String(input.startedAt),
    startedAt: input.startedAt,
    stoppedAt: input.stoppedAt,
    recovered: input.recovered,
    config: input.config,
    points: input.points,
    snap: null,
    stats: {
      ...deriveStats(input.points),
      durationMs: input.stoppedAt - input.startedAt,
    },
    logs: input.logs,
    events: input.events,
  };
}

/** Reduce a record to the summary the history list renders. */
export function summarizeRecord(record: SessionRecord): SessionSummary {
  return {
    id: record.id,
    startedAt: record.startedAt,
    stoppedAt: record.stoppedAt,
    recovered: record.recovered,
    profile: record.snap?.profile ?? null,
    distanceMeters: record.stats.distanceMeters,
    durationMs: record.stats.durationMs,
    pointCount: record.stats.pointCount,
  };
}
