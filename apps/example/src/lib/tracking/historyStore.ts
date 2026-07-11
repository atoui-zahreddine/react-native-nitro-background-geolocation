import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import BackgroundGeolocation, {
  LogLevel,
} from 'react-native-nitro-background-geolocation';
import {
  filterLogWindow,
  summarizeRecord,
  LOG_WINDOW_MARGIN_MS,
  type SessionLogEntry,
  type SessionRecord,
  type SessionSnap,
  type SessionSummary,
} from './history';

/**
 * Session history persistence: one JSON file per record under
 * `<documents>/sessions/`, plus a summary index in AsyncStorage so the
 * history list renders without touching record files.
 *
 * Thin IO over the pure logic in `history.ts`; exercised on-device.
 */

const INDEX_KEY = 'tracker.history.index';

function sessionsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'sessions');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function recordFile(id: string): File {
  return new File(sessionsDirectory(), `${id}.json`);
}

async function readIndex(): Promise<SessionSummary[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionSummary[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(summaries: SessionSummary[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(summaries));
}

/** Newest-first summaries for the history list. */
export async function listSessionSummaries(): Promise<SessionSummary[]> {
  const index = await readIndex();
  return index.sort((a, b) => b.startedAt - a.startedAt);
}

/** Persist a record and upsert its summary into the index. */
export async function saveSessionRecord(record: SessionRecord): Promise<void> {
  const file = recordFile(record.id);
  await file.write(JSON.stringify(record));
  const index = await readIndex();
  const summary = summarizeRecord(record);
  const next = index.filter((s) => s.id !== record.id);
  next.push(summary);
  await writeIndex(next);
}

export async function loadSessionRecord(
  id: string
): Promise<SessionRecord | null> {
  const file = recordFile(id);
  if (!file.exists) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1
    ) {
      return parsed as SessionRecord;
    }
  } catch {
    // corrupt file — treat as missing
  }
  return null;
}

export async function deleteSessionRecord(id: string): Promise<void> {
  const file = recordFile(id);
  if (file.exists) {
    file.delete();
  }
  const index = await readIndex();
  await writeIndex(index.filter((s) => s.id !== id));
}

/**
 * Attach the Tracker screen's snap outcome to an already-saved record and
 * refresh its index summary (profile becomes known here).
 */
export async function attachSnapToRecord(
  id: string,
  snap: SessionSnap
): Promise<void> {
  const record = await loadSessionRecord(id);
  if (record === null) {
    return;
  }
  await saveSessionRecord({ ...record, snap });
}

/**
 * Collect the native log slice for a session window: page backwards from the
 * newest entry (positive limit = newest-first, fromId pages to older ids)
 * until entries predate the window, then filter/order purely.
 */
export async function collectSessionLogs(
  startedAt: number,
  stoppedAt: number
): Promise<SessionLogEntry[]> {
  const pageSize = 1_000;
  const from = startedAt - LOG_WINDOW_MARGIN_MS;
  const collected: SessionLogEntry[] = [];
  let cursor = 0;
  for (let page = 0; page < 100; page++) {
    const entries = await BackgroundGeolocation.getLogEntries(
      pageSize,
      cursor,
      LogLevel.DebugValue
    );
    if (entries.length === 0) {
      break;
    }
    collected.push(...entries);
    const oldest = entries[entries.length - 1]!;
    if (oldest.timestamp < from || entries.length < pageSize) {
      break;
    }
    cursor = oldest.id;
  }
  return filterLogWindow(collected, { startedAt, stoppedAt });
}
