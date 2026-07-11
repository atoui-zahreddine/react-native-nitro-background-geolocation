import { describe, expect, it } from 'vitest';
import { parseSpoolContent, serializeSpoolLine } from '../spool';

describe('spool codec', () => {
  it('round-trips events through JSONL lines', () => {
    const lines =
      serializeSpoolLine({ at: 100, type: 'stationary' }) +
      serializeSpoolLine({
        at: 200,
        type: 'activity',
        payload: { type: 'ON_BICYCLE', confidence: 92 },
      });
    expect(parseSpoolContent(lines)).toEqual([
      { at: 100, type: 'stationary' },
      {
        at: 200,
        type: 'activity',
        payload: { type: 'ON_BICYCLE', confidence: 92 },
      },
    ]);
  });

  it('skips corrupt lines (torn writes) instead of failing the parse', () => {
    const content =
      serializeSpoolLine({ at: 100, type: 'stationary' }) +
      '{"at":200,"type":"acti\n' +
      serializeSpoolLine({ at: 300, type: 'stationary' });
    expect(parseSpoolContent(content).map((e) => e.at)).toEqual([100, 300]);
  });

  it('returns an empty timeline for empty or blank content', () => {
    expect(parseSpoolContent('')).toEqual([]);
    expect(parseSpoolContent('\n\n')).toEqual([]);
  });
});
