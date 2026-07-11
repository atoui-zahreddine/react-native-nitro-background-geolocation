import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { version as appVersion } from '../../../package.json';
import { version as libraryVersion } from 'react-native-nitro-background-geolocation/package.json';
import { buildExportBundle, exportFilename } from './export';
import type { SessionRecord } from './history';

/**
 * Share a session as its JSON export bundle: write it to the cache dir and
 * hand it to the native share sheet. Thin IO over the pure codec in
 * `export.ts`; exercised on-device.
 */
export async function shareSessionRecord(record: SessionRecord): Promise<void> {
  const constants = Platform.constants as { Model?: string } | undefined;
  const bundle = buildExportBundle(record, {
    exportedAt: Date.now(),
    appVersion,
    libraryVersion,
    platform: {
      os: Platform.OS,
      osVersion: String(Platform.Version),
      device: constants?.Model ?? 'unknown',
    },
  });
  const file = new File(Paths.cache, exportFilename(record));
  await file.write(JSON.stringify(bundle));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export session',
  });
}
