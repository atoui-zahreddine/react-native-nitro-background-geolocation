import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeadlessEvent } from '../headless';

const { registerHeadlessTask, platform } = vi.hoisted(() => ({
  registerHeadlessTask: vi.fn(),
  platform: { OS: 'android' as 'android' | 'ios' },
}));

vi.mock('react-native', () => ({
  AppRegistry: { registerHeadlessTask, runApplication: vi.fn() },
  Platform: platform,
}));

const { registerHeadlessHandler, HEADLESS_TASK_NAME } =
  await import('../headless');

/** Register a handler and return the task the native side would invoke. */
function registerAndTakeTask(handler: (event: HeadlessEvent) => void) {
  registerHeadlessHandler(handler);
  const [, taskProvider] = registerHeadlessTask.mock.calls.at(-1)!;
  return taskProvider() as (raw: {
    event: string;
    params: string;
  }) => Promise<void>;
}

beforeEach(() => {
  registerHeadlessTask.mockClear();
  platform.OS = 'android';
});

describe('registerHeadlessHandler', () => {
  it('registers under the name the Android side expects', () => {
    registerHeadlessHandler(() => {});

    expect(registerHeadlessTask).toHaveBeenCalledTimes(1);
    expect(registerHeadlessTask.mock.calls[0]![0]).toBe(HEADLESS_TASK_NAME);
    expect(HEADLESS_TASK_NAME).toBe('__rn-nitro-bg-geo-headless__');
  });

  it('is a no-op on iOS', () => {
    platform.OS = 'ios';

    registerHeadlessHandler(() => {});

    expect(registerHeadlessTask).not.toHaveBeenCalled();
  });
});

describe('headless payload parsing', () => {
  it('narrows a location event', async () => {
    const received: HeadlessEvent[] = [];
    const task = registerAndTakeTask((event) => received.push(event));

    await task({
      event: 'location',
      params: JSON.stringify({ id: 1, latitude: 52.37, longitude: 4.89 }),
    });

    expect(received).toHaveLength(1);
    const event = received[0]!;
    expect(event.event).toBe('location');
    if (event.event !== 'location') throw new Error('wrong discriminant');
    expect(event.location.latitude).toBe(52.37);
  });

  it('narrows a stationary event', async () => {
    const received: HeadlessEvent[] = [];
    const task = registerAndTakeTask((event) => received.push(event));

    await task({
      event: 'stationary',
      params: JSON.stringify({ id: 2, latitude: 52.37, radius: 50 }),
    });

    const event = received[0]!;
    if (event.event !== 'stationary') throw new Error('wrong discriminant');
    expect(event.location.radius).toBe(50);
  });

  it('narrows an activity event', async () => {
    const received: HeadlessEvent[] = [];
    const task = registerAndTakeTask((event) => received.push(event));

    await task({
      event: 'activity',
      params: JSON.stringify({ type: 'ON_FOOT', confidence: 80 }),
    });

    const event = received[0]!;
    if (event.event !== 'activity') throw new Error('wrong discriminant');
    expect(event.activity.confidence).toBe(80);
  });

  it('rejects an unknown event rather than delivering a wrong shape', async () => {
    const handler = vi.fn();
    const task = registerAndTakeTask(handler);

    await expect(task({ event: 'teleport', params: '{}' })).rejects.toThrow(
      /Unknown background-geolocation headless event: teleport/
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('propagates malformed JSON instead of swallowing it', async () => {
    const handler = vi.fn();
    const task = registerAndTakeTask(handler);

    await expect(
      task({ event: 'location', params: 'not json' })
    ).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
