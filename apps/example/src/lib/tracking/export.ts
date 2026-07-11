import type { SessionRecord } from './history';

/**
 * Export bundle per the map decision: a versioned self-describing envelope
 * around the stored session record, verbatim. JSON only, one-way (no
 * import path).
 */

export interface ExportBundle {
  bundleVersion: 1;
  /** UTC ms. */
  exportedAt: number;
  app: { name: string; version: string };
  library: { name: string; version: string };
  platform: { os: string; osVersion: string; device: string };
  session: SessionRecord;
}

export interface ExportMeta {
  exportedAt: number;
  appVersion: string;
  libraryVersion: string;
  platform: { os: string; osVersion: string; device: string };
}

export function buildExportBundle(
  record: SessionRecord,
  meta: ExportMeta
): ExportBundle {
  return {
    bundleVersion: 1,
    exportedAt: meta.exportedAt,
    app: { name: 'example', version: meta.appVersion },
    library: {
      name: 'react-native-nitro-background-geolocation',
      version: meta.libraryVersion,
    },
    platform: meta.platform,
    session: record,
  };
}

/** `bg-geo-session-<start, UTC, filesystem-safe>-<profile>.json` */
export function exportFilename(record: SessionRecord): string {
  const iso = new Date(record.startedAt).toISOString(); // 2026-07-11T08:12:30.000Z
  const stamp = `${iso.slice(0, 13)}${iso.slice(14, 16)}`; // 2026-07-11T0812
  const profile = record.snap?.profile ?? 'unprofiled';
  return `bg-geo-session-${stamp}-${profile}.json`;
}
