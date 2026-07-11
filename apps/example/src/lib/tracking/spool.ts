import type { SessionEvent } from './history';

/**
 * Event spool written by the headless handler while the app is dead and
 * merged into the recovered session's timeline on the next launch. JSONL: one
 * event per line, so a torn write can only corrupt the last line.
 */

export function serializeSpoolLine(event: SessionEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Parse spool content, silently dropping corrupt (torn) lines. */
export function parseSpoolContent(content: string): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as { at?: unknown }).at === 'number' &&
        typeof (parsed as { type?: unknown }).type === 'string'
      ) {
        events.push(parsed as SessionEvent);
      }
    } catch {
      // torn write — skip the line
    }
  }
  return events;
}
