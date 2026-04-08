import { describe, it, expect } from 'vitest';
import { parseTimeRange } from '../src/utils/time.ts';

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
