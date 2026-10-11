import { describe, it, expect, vi, afterEach } from 'vitest';
import { MAX_WINDOW_MS, MAX_LIMIT, checkLimit } from '../src/api/limits.ts';
import { resolveTimeWindow, TimeArgumentError } from '../src/utils/time.ts';
import { LocalArgumentError } from '../src/utils/errors.ts';
import { classifyAndBuildError } from '../src/utils/response.ts';

const DAY = 86_400_000;
const T0 = Date.parse('2026-01-20T00:00:00Z');

function thrown(fn: () => unknown): Error {
  try {
    fn();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}

afterEach(() => vi.useRealTimers());

describe('window length boundary (server: under 32 days)', () => {
  const abs = (span: number) =>
    resolveTimeWindow({ timeRange: '5m', stime: String(T0), etime: String(T0 + span) });

  it('MAX_WINDOW_MS is exactly 32 days', () => {
    expect(MAX_WINDOW_MS).toBe(2_764_800_000);
  });

  it('32 days - 1 ms passes, 32 days and 32 days + 1 ms are rejected', () => {
    expect(abs(MAX_WINDOW_MS - 1).etime - T0).toBe(MAX_WINDOW_MS - 1);
    expect(() => abs(MAX_WINDOW_MS)).toThrow(TimeArgumentError);
    expect(() => abs(MAX_WINDOW_MS + 1)).toThrow(TimeArgumentError);
  });

  it('counts a fixed length, not a calendar month (February included)', () => {
    // 2026-01-20 → 2026-02-21 is 32 days; a "one month" rule would differ.
    expect(() =>
      resolveTimeWindow({ timeRange: '5m', stime: '2026-01-20T00:00:00Z', etime: '2026-02-21T00:00:00Z' })
    ).toThrow(/32 days/);
    expect(
      resolveTimeWindow({ timeRange: '5m', stime: '2026-02-01T00:00:00Z', etime: '2026-03-04T23:59:59Z' }).absolute
    ).toBe(true);
  });

  it.each(['31d', '767h', 'last 31 days', '4w'])('relative %s passes', (tr) => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    expect(resolveTimeWindow({ timeRange: tr }).etime).toBe(T0);
  });

  it.each(['32d', '768h', 'last 32 days', '5w'])(
    'relative %s is rejected',
    (tr) => {
      expect(() => resolveTimeWindow({ timeRange: tr })).toThrow(/32 days/);
    }
  );

  it('stime only or etime only with a 32-day timeRange is rejected', () => {
    expect(() => resolveTimeWindow({ timeRange: '32d', stime: String(T0) })).toThrow(/32 days/);
    expect(() => resolveTimeWindow({ timeRange: '32d', etime: String(T0) })).toThrow(/32 days/);
    expect(resolveTimeWindow({ timeRange: '31d', stime: String(T0) }).etime).toBe(T0 + 31 * DAY);
  });

  it('the message states the span and a split that itself passes', () => {
    const err = thrown(() => abs(40 * DAY));
    expect(err.message).toContain('Time window is 40d');
    expect(err.message).toContain('The maximum search period is one month');
    const m = err.message.match(/stime="([^"]+)", etime="([^"]+)"/)!;
    expect(m[1]).toBe('2026-01-20T00:00:00Z');
    const part = resolveTimeWindow({ timeRange: '5m', stime: m[1], etime: m[2] });
    expect(part.etime - part.stime).toBe(31 * DAY);
  });

  it('formats spans with hours and minutes', () => {
    expect(thrown(() => abs(MAX_WINDOW_MS + 2 * 3_600_000 + 5 * 60_000)).message).toContain(
      'Time window is 32d 2h 5m'
    );
  });

  it('time errors are local argument errors', () => {
    const err = thrown(() => abs(MAX_WINDOW_MS));
    expect(err).toBeInstanceOf(LocalArgumentError);
    expect(err.name).toBe('TimeArgumentError');
  });
});

describe('checkLimit (server: at most 100,000)', () => {
  it.each([1, 100, 99_999, MAX_LIMIT])('%i passes', (n) => {
    expect(() => checkLimit(n)).not.toThrow();
  });

  it('100,001 names the maximum and how to get more rows', () => {
    const err = thrown(() => checkLimit(MAX_LIMIT + 1));
    expect(err).toBeInstanceOf(LocalArgumentError);
    expect(err.message).toBe(
      'limit 100,001 exceeds the WhaTap API maximum of 100,000. ' +
        'Use a smaller limit, or split the window with stime/etime and query each part.'
    );
  });

  it.each([0, -1, -100_000])('%i is out of range', (n) => {
    expect(thrown(() => checkLimit(n)).message).toBe(
      `limit must be between 1 and 100,000, got ${n}.`
    );
  });

  it.each([1.5, NaN, Infinity])('%s is not a whole number', (n) => {
    expect(thrown(() => checkLimit(n)).message).toContain('whole number');
  });
});

describe('classifyAndBuildError', () => {
  const ctx = { toolName: 'whatap_query_data', projectCode: 403 };
  const classify = (err: unknown) => classifyAndBuildError(err, ctx).content[0].text;
  // Exact bodies returned by /open-mcp/api/flush/mxql/path on 2026-10-11,
  // wrapped the way WhatapApiClient wraps them. pcode 403 on purpose.
  const PERIOD =
    'WhaTap API error (400) for project 403: {"msg":"[F] The search period is too long. The maximum search period is one month."}';
  const LIMIT =
    'WhaTap API error (400) for project 403: {"msg":"[F] /open-mcp/api/flush/mxql/path, max limit is 100,000"}';

  it('a local argument error comes first, even if it mentions other cases', () => {
    const text = classify(new LocalArgumentError('rate limit 429 timeout max limit is 401'));
    expect(text).toContain('whatap_query_data: rate limit 429');
    expect(text).toContain('not sent to WhaTap');
    expect(text).toContain('Do NOT retry');
    expect(text).not.toContain('Verify');
  });

  it('server period limit → split under 32 days, not project code or auth', () => {
    const text = classify(new Error(PERIOD));
    expect(text).toContain('under 32 days');
    expect(text).toContain('stime/etime');
    expect(text).not.toMatch(/Verify project code|Authentication failed/);
  });

  it('server row limit → 100,000, not project code or auth', () => {
    const text = classify(new Error(LIMIT));
    expect(text).toContain('at most 100,000 rows');
    expect(text).not.toMatch(/Verify project code|Authentication failed/);
  });

  it('other 400 → server reason, no project-code hint', () => {
    const text = classify(new Error('WhaTap API error (400) for project 403: {"msg":"bad mql"}'));
    expect(text).toContain('bad mql');
    expect(text).toContain('HTTP 400');
    expect(text).not.toMatch(/Verify project code|Authentication failed/);
  });

  it.each([401, 403, 429])('pcode %i in a 400 message does not decide the class', (pcode) => {
    const text = classifyAndBuildError(
      new Error(`WhaTap API error (400) for project ${pcode}: {"msg":"bad mql"}`),
      { toolName: 'whatap_query_data', projectCode: pcode }
    ).content[0].text;
    expect(text).toContain('HTTP 400');
    expect(text).not.toMatch(/Authentication failed|rate limit hit/);
  });

  it('real 401 / 403 → authentication', () => {
    expect(classify(new Error('WhaTap API error (401): Unauthorized'))).toContain('Authentication failed');
    expect(classify(new Error('WhaTap API error (403) for project 1: Forbidden'))).toContain(
      'Authentication failed'
    );
  });

  it('real 429 → rate limit, retryable', () => {
    const text = classify(new Error('WhaTap API error (429) for project 1: slow down'));
    expect(text).toContain('rate limit hit');
    expect(text).toContain('retrying may work');
  });

  it('missing token → project not accessible', () => {
    expect(classify(new Error('No API token found for project 403'))).toContain('not found or not accessible');
  });

  it('unknown errors keep the old project-code hint', () => {
    expect(classify(new Error('socket hang up'))).toContain('Verify project code 403');
  });
});
