import { describe, it, expect, vi, afterEach } from 'vitest';
import { registerYardTools } from '../src/tools/yard.ts';
import { registerMeshTools } from '../src/tools/mesh.ts';
import { registerPromqlTools, getPromqlQueryStore } from '../src/tools/promql.ts';
import { McpServer } from '../src/mcp/server.ts';
import type { WhatapApiClient } from '../src/api/client.ts';
import { CATALOG_RAW } from '../src/data/mxql-catalog.ts';
import { scanMarkers } from '../src/yard/markers.ts';
import { MAX_WINDOW_MS, MAX_LIMIT } from '../src/api/limits.ts';

interface Sent {
  fn: string;
  stime: number;
  etime: number;
  limit?: number;
}

const ROW = [{ _head_: { cpu: 'P' } }, { time: 1, oid: 7, oname: 'a', cpu: 1 }];

/** Registers every time-windowed tool over a fake client that records each request. */
function setup(result: unknown[] = ROW) {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const sent: Sent[] = [];
  const rec = (fn: string) => async (_pcode: number, p: Sent) => {
    sent.push({ fn, stime: p.stime, etime: p.etime, limit: p.limit });
    return result;
  };
  const client = {
    executeMxqlText: rec('text'),
    executeMxqlPath: rec('path'),
    executePromql: rec('promql'),
    resolveOids: async () => new Map(),
  } as unknown as WhatapApiClient;
  registerYardTools(server, client);
  registerMeshTools(server, client);
  registerPromqlTools(server, client);
  const call = (name: string, args: Record<string, unknown>) =>
    (server as any)._tools.get(name).callback(args);
  return { sent, call };
}

const KST_0900 = Date.parse('2026-05-14T00:00:00Z');
const H = 3_600_000;
// A catalog path that runs as text (catalog hit, no markers) and one that the server expands.
const TEXT_PATH = Object.keys(CATALOG_RAW).find(
  (k) => k.startsWith('mxql/') && !scanMarkers(CATALOG_RAW[k]).hasMarkers
)!;
const PATH_ONLY = 'v2/sys/server_base';

const defaults: Record<string, Record<string, unknown>> = {
  whatap_query_data: { projectCode: 1, path: PATH_ONLY, timeRange: '5m', limit: 100 },
  whatap_create_promql: { projectCode: 1, name: 'q', query: 'up', timeRange: '5m' },
  whatap_apm_anomaly: { projectCode: 1, timeRange: '5m', sensitivity: 'medium' },
  whatap_service_topology: { projectCode: 1, timeRange: '1h' },
};
const TOOLS = Object.keys(defaults);

afterEach(() => vi.useRealTimers());

describe('every time-windowed tool sends the absolute window it was given', () => {
  it.each(TOOLS)('%s: stime + etime go out unchanged on every request', async (tool) => {
    const { sent, call } = setup();
    await call(tool, {
      ...defaults[tool],
      stime: '2026-05-14T09:00:00+09:00',
      etime: '2026-05-14T10:00:00+09:00',
    });
    expect(sent.length).toBeGreaterThan(0);
    for (const s of sent) {
      expect(s.stime).toBe(KST_0900);
      expect(s.etime).toBe(KST_0900 + H);
    }
  });

  it.each(TOOLS)('%s: without stime/etime the window still ends now', async (tool) => {
    vi.useFakeTimers();
    vi.setSystemTime(KST_0900);
    const { sent, call } = setup();
    await call(tool, defaults[tool]);
    const span = { whatap_service_topology: H }[tool] ?? 5 * 60_000;
    for (const s of sent) {
      expect(s.etime).toBe(KST_0900);
      expect(s.etime - s.stime).toBe(span);
    }
  });

  it.each(TOOLS)('%s: a window of 32 days is rejected before any request', async (tool) => {
    const { sent, call } = setup();
    const res = await call(tool, {
      ...defaults[tool],
      stime: String(KST_0900),
      etime: String(KST_0900 + MAX_WINDOW_MS),
    });
    expect(sent).toEqual([]);
    expect(res.isError).toBe(true);
    const text = res.content[0].text;
    expect(text).toContain('32 days');
    expect(text).toContain('not sent to WhaTap');
    expect(text).not.toContain('Verify project code');
  });

  it.each(TOOLS)('%s: 32 days minus 1 ms goes out', async (tool) => {
    const { sent, call } = setup();
    await call(tool, {
      ...defaults[tool],
      stime: String(KST_0900),
      etime: String(KST_0900 + MAX_WINDOW_MS - 1),
    });
    expect(sent.length).toBeGreaterThan(0);
    expect(sent[0].etime - sent[0].stime).toBe(MAX_WINDOW_MS - 1);
  });

  it.each(TOOLS)('%s: a relative "32d" is rejected too', async (tool) => {
    const { sent, call } = setup();
    const res = await call(tool, { ...defaults[tool], timeRange: '32d' });
    expect(sent).toEqual([]);
    expect(res.content[0].text).toContain('32 days');
  });

  it.each(TOOLS)('%s: an ISO time without offset is rejected before any request', async (tool) => {
    const { sent, call } = setup();
    const res = await call(tool, { ...defaults[tool], stime: '2026-05-14T09:00:00' });
    expect(sent).toEqual([]);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('no timezone offset');
    expect(res.content[0].text).not.toContain('Verify project code');
  });

  it.each(TOOLS)('%s: stime after etime is rejected before any request', async (tool) => {
    // The server answers this with an empty result, which reads as "no data".
    const { sent, call } = setup();
    const res = await call(tool, {
      ...defaults[tool],
      stime: String(KST_0900 + H),
      etime: String(KST_0900),
    });
    expect(sent).toEqual([]);
    expect(res.content[0].text).toContain('must be before etime');
  });
});

describe('whatap_query_data window per execution mode', () => {
  const win = { stime: String(KST_0900), etime: String(KST_0900 + H) };

  it('catalog text path', async () => {
    const { sent, call } = setup();
    await call('whatap_query_data', { ...defaults.whatap_query_data, path: TEXT_PATH, ...win });
    expect(sent.map((s) => s.fn)).toEqual(['text']);
    expect(sent[0]).toMatchObject({ stime: KST_0900, etime: KST_0900 + H });
  });

  it('server-expanded path', async () => {
    const { sent, call } = setup();
    await call('whatap_query_data', { ...defaults.whatap_query_data, ...win });
    expect(sent.map((s) => s.fn)).toEqual(['path']);
    expect(sent[0]).toMatchObject({ stime: KST_0900, etime: KST_0900 + H });
  });

  it('PromQL query', async () => {
    const { sent, call } = setup();
    await call('whatap_query_data', { projectCode: 1, query: 'up', timeRange: '5m', limit: 100, ...win });
    expect(sent.map((s) => s.fn)).toEqual(['promql']);
    expect(sent[0]).toMatchObject({ stime: KST_0900, etime: KST_0900 + H });
  });

  it('saved PromQL query', async () => {
    getPromqlQueryStore().save({
      name: 'saved-x', description: '', query: 'up', projectCode: 1,
      metricType: '', createdAt: '', lastUsed: '',
    });
    const { sent, call } = setup();
    await call('whatap_query_data', { projectCode: 1, savedQuery: 'saved-x', timeRange: '5m', limit: 100, ...win });
    expect(sent.map((s) => s.fn)).toEqual(['promql']);
    expect(sent[0]).toMatchObject({ stime: KST_0900, etime: KST_0900 + H });
  });

  it('shows the absolute window as Period on a result', async () => {
    const { call } = setup();
    const res = await call('whatap_query_data', { ...defaults.whatap_query_data, ...win });
    expect(res.content[0].text).toContain('2026-05-14 00:00:00 UTC → 2026-05-14 01:00:00 UTC');
  });

  it('names the absolute window, not the unused timeRange, when no rows come back', async () => {
    const { call } = setup([]);
    const res = await call('whatap_query_data', { ...defaults.whatap_query_data, ...win });
    const text = res.content[0].text;
    expect(text).toContain('2026-05-14T00:00:00Z → 2026-05-14T01:00:00Z');
    expect(text).not.toContain('timeRange: "5m"');
  });
});

describe('whatap_query_data limit', () => {
  it.each([1, 100, MAX_LIMIT])('limit %i goes out as given', async (limit) => {
    const { sent, call } = setup();
    await call('whatap_query_data', { ...defaults.whatap_query_data, limit });
    expect(sent).toHaveLength(1);
    expect(sent[0].limit).toBe(limit);
  });

  it.each([
    [MAX_LIMIT + 1, '100,000'],
    [0, 'between 1 and'],
    [-1, 'between 1 and'],
    [1.5, 'whole number'],
  ])('limit %s is rejected before any request', async (limit, expected) => {
    const { sent, call } = setup();
    const res = await call('whatap_query_data', { ...defaults.whatap_query_data, limit });
    expect(sent).toEqual([]);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain(expected);
    expect(res.content[0].text).toContain('not sent to WhaTap');
  });

  it('checks limit in PromQL mode too', async () => {
    const { sent, call } = setup();
    const res = await call('whatap_query_data', { projectCode: 1, query: 'up', timeRange: '5m', limit: MAX_LIMIT + 1 });
    expect(sent).toEqual([]);
    expect(res.isError).toBe(true);
  });
});
