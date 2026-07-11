import { File, Paths } from 'expo-file-system';
import type { SessionEvent } from './history';
import { parseSpoolContent, serializeSpoolLine } from './spool';

/**
 * IO for the headless event spool. The append side runs in the headless JS
 * context while the app is dead; the read/clear side runs on the next launch
 * (kill-recovery). Kept separate from `spool.ts` so the pure codec stays
 * importable in node tests.
 */

const SPOOL_NAME = 'headless-events.jsonl';

function spoolFile(): File {
  return new File(Paths.document, SPOOL_NAME);
}

export async function appendSpoolEvent(event: SessionEvent): Promise<void> {
  const file = spoolFile();
  if (!file.exists) {
    file.create();
  }
  await file.write(serializeSpoolLine(event), { append: true });
}

export async function readSpoolEvents(): Promise<SessionEvent[]> {
  const file = spoolFile();
  if (!file.exists) {
    return [];
  }
  return parseSpoolContent(await file.text());
}

export function clearSpool(): void {
  const file = spoolFile();
  if (file.exists) {
    file.delete();
  }
}
