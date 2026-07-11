import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The session anchor, written when a tracking session starts. Its presence
 * marks an in-progress (or orphaned) session; the route is always
 * reconstructable from the plugin's SQLite store as
 * `getLocations().filter(l => l.time >= anchor.startedAt)`.
 *
 * Since session history landed the anchor also carries the config snapshot
 * the session was started with, so kill-recovery can embed it in the
 * recovered record. Legacy bare-timestamp anchors (pre-history builds) parse
 * with a null config.
 */
const ANCHOR_KEY = 'tracker.session.startedAt';

export interface SessionAnchor {
  /** UTC ms timestamp of session start. */
  startedAt: number;
  /** Config snapshot captured at start; null on legacy anchors. */
  config: Record<string, unknown> | null;
}

export function serializeAnchor(anchor: SessionAnchor): string {
  return JSON.stringify(anchor);
}

/** Pure parser for the stored anchor value; exported for tests. */
export function parseAnchorValue(raw: string | null): SessionAnchor | null {
  if (raw === null) {
    return null;
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) {
    return { startedAt: asNumber, config: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { startedAt?: unknown }).startedAt === 'number'
    ) {
      const { startedAt, config } = parsed as {
        startedAt: number;
        config?: unknown;
      };
      return {
        startedAt,
        config:
          typeof config === 'object' && config !== null
            ? (config as Record<string, unknown>)
            : null,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function getSessionAnchor(): Promise<SessionAnchor | null> {
  return parseAnchorValue(await AsyncStorage.getItem(ANCHOR_KEY));
}

export async function setSessionAnchor(anchor: SessionAnchor): Promise<void> {
  await AsyncStorage.setItem(ANCHOR_KEY, serializeAnchor(anchor));
}

export async function clearSessionAnchor(): Promise<void> {
  await AsyncStorage.removeItem(ANCHOR_KEY);
}
