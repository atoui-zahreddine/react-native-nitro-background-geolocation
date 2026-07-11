import { describe, expect, it } from 'vitest';
import { parseAnchorValue, serializeAnchor } from '../sessionStore';

describe('parseAnchorValue', () => {
  it('parses the JSON anchor blob with its config snapshot', () => {
    const raw = serializeAnchor({
      startedAt: 1_720_000_000_000,
      config: { distanceFilter: 25 },
    });
    expect(parseAnchorValue(raw)).toEqual({
      startedAt: 1_720_000_000_000,
      config: { distanceFilter: 25 },
    });
  });

  it('accepts a legacy bare-timestamp anchor with a null config', () => {
    expect(parseAnchorValue('1720000000000')).toEqual({
      startedAt: 1_720_000_000_000,
      config: null,
    });
  });

  it('returns null for garbage or missing values', () => {
    expect(parseAnchorValue(null)).toBeNull();
    expect(parseAnchorValue('not json')).toBeNull();
    expect(parseAnchorValue('{"noStartedAt":true}')).toBeNull();
  });
});
