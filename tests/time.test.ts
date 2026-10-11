import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseTimeRange,
  parseDuration,
  parseTimePoint,
  resolveTimeWindow,
  requestedWindow,
} from '../src/utils/time.ts';

describe('parseTimeRange', () => {
  const TOLERANCE = 1000; // 1s tolerance for Date.now() drift

  it('"5m" → stime ~ etime - 300000', () => {
    const { stime, etime } = parseTimeRange('5m');
    expect(etime - stime).toBeCloseTo(300_000, -Math.log10(TOLERANCE));
    expect(Math.abs(etime - stime - 300_000)).toBeLessThan(TOLERANCE);
  });

  it('"1h" → stime ~ etime - 3600000', () => {
    const { stime, etime } = parseTimeRange('1h');
    expect(Math.abs(etime - stime - 3_600_000)).toBeLessThan(TOLERANCE);
  });

  it('"7d" → stime ~ etime - 604800000', () => {
    const { stime, etime } = parseTimeRange('7d');
    expect(Math.abs(etime - stime - 604_800_000)).toBeLessThan(TOLERANCE);
  });

  it('"30s" → stime ~ etime - 30000', () => {
    const { stime, etime } = parseTimeRange('30s');
    expect(Math.abs(etime - stime - 30_000)).toBeLessThan(TOLERANCE);
  });

  it('"2w" → stime ~ etime - 1209600000', () => {
    const { stime, etime } = parseTimeRange('2w');
    expect(Math.abs(etime - stime - 1_209_600_000)).toBeLessThan(TOLERANCE);
  });

  it('"last 30 minutes" → stime ~ etime - 1800000', () => {
    const { stime, etime } = parseTimeRange('last 30 minutes');
    expect(Math.abs(etime - stime - 1_800_000)).toBeLessThan(TOLERANCE);
  });

  it('"last 1 hour" → stime ~ etime - 3600000', () => {
    const { stime, etime } = parseTimeRange('last 1 hour');
    expect(Math.abs(etime - stime - 3_600_000)).toBeLessThan(TOLERANCE);
  });

  it('"last 7 days" → stime ~ etime - 604800000', () => {
    const { stime, etime } = parseTimeRange('last 7 days');
    expect(Math.abs(etime - stime - 604_800_000)).toBeLessThan(TOLERANCE);
  });

  it('invalid input "xyz" throws Error', () => {
    expect(() => parseTimeRange('xyz')).toThrow(Error);
  });
});

const NOW = Date.parse('2026-10-11T10:00:00Z');
// 2026-05-14 09:00 KST
const KST_0900 = Date.parse('2026-05-14T00:00:00Z');

afterEach(() => vi.useRealTimers());


describe('parseDuration', () => {
  it('short and long forms', () => {
    expect(parseDuration('5m')).toBe(300_000);
    expect(parseDuration('last 2 hours')).toBe(7_200_000);
    expect(parseDuration('1w')).toBe(604_800_000);
  });

  it('rejects unknown formats', () => {
    expect(() => parseDuration('1 month')).toThrow('Invalid time range format');
  });
});

describe('parseTimePoint', () => {
  it('epoch ms and epoch seconds', () => {
    expect(parseTimePoint(String(KST_0900))).toBe(KST_0900);
    expect(parseTimePoint(String(KST_0900 / 1000))).toBe(KST_0900);
  });

  it('ISO 8601 with offset, in the forms people type', () => {
    expect(parseTimePoint('2026-05-14T09:00:00+09:00')).toBe(KST_0900);
    expect(parseTimePoint('2026-05-14 09:00+09:00')).toBe(KST_0900);
    expect(parseTimePoint('2026-05-14T09:00:00+0900')).toBe(KST_0900);
    expect(parseTimePoint('2026-05-14T00:00:00Z')).toBe(KST_0900);
    expect(parseTimePoint('2026-05-14T00:00:00.000z')).toBe(KST_0900);
  });

  it('rejects ISO without offset instead of guessing the zone', () => {
    expect(() => parseTimePoint('2026-05-14T09:00:00', 'stime')).toThrow(
      /stime .* no timezone offset.*2026-05-14T09:00:00\+09:00/
    );
    expect(() => parseTimePoint('2026-05-14')).toThrow(/2026-05-14T00:00:00\+09:00/);
  });

  it('rejects garbage', () => {
    expect(() => parseTimePoint('yesterday', 'etime')).toThrow('Invalid etime');
    expect(() => parseTimePoint('12345')).toThrow('Invalid time');
  });
});

describe('resolveTimeWindow', () => {
  it('no bounds → ends now, label is the timeRange', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(resolveTimeWindow({ timeRange: '1h' })).toEqual({
      stime: NOW - 3_600_000,
      etime: NOW,
      label: '1h',
      absolute: false,
    });
  });

  it('empty strings count as absent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(resolveTimeWindow({ timeRange: '5m', stime: '', etime: ' ' }).absolute).toBe(false);
  });

  it('stime + etime → exact window, timeRange ignored', () => {
    const w = resolveTimeWindow({
      timeRange: '5m',
      stime: '2026-05-14T09:00:00+09:00',
      etime: '2026-05-14T10:30:00+09:00',
    });
    expect(w.stime).toBe(KST_0900);
    expect(w.etime).toBe(KST_0900 + 90 * 60_000);
    expect(w.absolute).toBe(true);
    expect(w.label).toBe('2026-05-14T00:00:00Z → 2026-05-14T01:30:00Z');
  });

  it('stime only → [stime, stime + timeRange]', () => {
    const w = resolveTimeWindow({ timeRange: '1h', stime: String(KST_0900) });
    expect(w.etime - w.stime).toBe(3_600_000);
    expect(w.stime).toBe(KST_0900);
  });

  it('etime only → [etime - timeRange, etime]', () => {
    const w = resolveTimeWindow({ timeRange: '1d', etime: String(KST_0900) });
    expect(w.etime).toBe(KST_0900);
    expect(w.stime).toBe(KST_0900 - 86_400_000);
  });

  it('rejects stime >= etime', () => {
    expect(() =>
      resolveTimeWindow({
        timeRange: '5m',
        stime: '2026-05-14T10:00:00+09:00',
        etime: '2026-05-14T09:00:00+09:00',
      })
    ).toThrow('must be before etime');
  });
});

describe('requestedWindow', () => {
  it('echoes what was asked without parsing', () => {
    expect(requestedWindow('5m')).toBe('5m');
    expect(requestedWindow('5m', 'bad')).toBe('stime=bad, etime=-, timeRange=5m');
  });
});

describe('time argument errors in tool responses', () => {
  it('are reported as fixable input, not as a wrong project code', async () => {
    const { classifyAndBuildError } = await import('../src/utils/response.ts');
    let err: unknown;
    try {
      parseTimePoint('2026-05-14T09:00:00', 'stime');
    } catch (e) {
      err = e;
    }
    const text = classifyAndBuildError(err, { toolName: 'whatap_query_data', projectCode: 11 })
      .content[0].text;
    expect(text).toContain('no timezone offset');
    expect(text).toContain('not sent to WhaTap');
    expect(text).not.toContain('Verify project code');
  });
});
