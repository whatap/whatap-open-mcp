import { describe, it, expect } from 'vitest';
import { formatMxqlResponse } from '../src/utils/format.ts';
import type { ResultSemantics } from '../src/utils/semantic.ts';
import { registerYardTools } from '../src/tools/yard.ts';
import { McpServer } from '../src/mcp/server.ts';
import type { WhatapApiClient } from '../src/api/client.ts';

const T0 = Date.parse('2026-10-10T01:00:00Z');
const H = 3_600_000;
const meta = { stime: T0, etime: T0 + H };

function sem(resultType: ResultSemantics['resultType']): ResultSemantics {
  return { resultType, entityLevel: 'agent', grain: '5s', timeBucket: '5s', rankingSafe: false, sort: '' };
}

/** n rows, 3 agents per 5-second bucket, starting at stime: the server's fill order. */
function rows(n: number, start = T0) {
  return [
    { _head_: { tps: 'F' } },
    ...Array.from({ length: n }, (_, i) => ({ time: start + Math.floor(i / 3) * 5000, oid: i % 3, tps: i })),
  ];
}

describe('truncated result names where it stops', () => {
  it('gives the span of returned rows and where to continue', () => {
    const text = formatMxqlResponse(rows(10), { maxRows: 10, queryMeta: meta, semantics: sem('timeseries') });
    // 10 rows / 3 per bucket → last bucket 01:00:15, partially filled
    expect(text).toContain('Truncated at limit 10.');
    expect(text).toContain('Returned rows span 2026-10-10 01:00:00 UTC → 2026-10-10 01:00:15 UTC');
    expect(text).toContain('rows at that time may be partial');
    expect(text).toContain('Do not treat this as the whole Period');
    expect(text).toContain('stime="2026-10-10T01:00:15Z"');
    // replaces, not adds to, the generic caution
    expect(text).not.toContain('may be truncated');
  });

  it('formats a large limit with separators', () => {
    const text = formatMxqlResponse(rows(1234), { maxRows: 1234, queryMeta: meta, semantics: sem('timeseries') });
    expect(text).toContain('Truncated at limit 1,234.');
  });

  it('all rows at one time → raise limit, not a stime that repeats the same rows', () => {
    // Measured: 177 agents per 5-second bucket; limit 20 returns 20 rows of one time.
    const data = [{ _head_: {} }, ...Array.from({ length: 20 }, (_, i) => ({ time: T0 + 25_000, oid: i }))];
    const text = formatMxqlResponse(data, { maxRows: 20, queryMeta: { stime: T0 + 25_000, etime: T0 + H }, semantics: sem('snapshot') });
    expect(text).toContain('All returned rows are at 2026-10-10 01:00:25 UTC');
    expect(text).toContain('raise limit well above 20');
    expect(text).not.toMatch(/stime="/);
  });

  it('uses the latest time, not the last row, when rows are out of order', () => {
    // The server's order is not strictly ascending (measured: steps back of one interval).
    const data = [
      { _head_: {} },
      { time: T0, v: 1 },
      { time: T0 + 10_000, v: 2 },
      { time: T0 + 5_000, v: 3 },
    ];
    const text = formatMxqlResponse(data, { maxRows: 3, queryMeta: meta, semantics: sem('timeseries') });
    expect(text).toContain('→ 2026-10-10 01:00:10 UTC');
    expect(text).toContain('stime="2026-10-10T01:00:10Z"');
  });

  it('without semantics, replaces the legacy notice too', () => {
    const text = formatMxqlResponse(rows(6), { maxRows: 6, queryMeta: meta });
    expect(text).toContain('Truncated at limit 6.');
    expect(text).not.toContain('result may be truncated');
  });
});

describe('falls back to the old caution when the span says nothing', () => {
  it('not truncated → no notice', () => {
    const text = formatMxqlResponse(rows(5), { maxRows: 10, queryMeta: meta, semantics: sem('timeseries') });
    expect(text).not.toContain('Truncated');
    expect(text).not.toContain('may be truncated');
  });

  it('rows reach etime → generic caution', () => {
    const data = [{ _head_: {} }, { time: T0, v: 1 }, { time: T0 + H, v: 2 }];
    const text = formatMxqlResponse(data, { maxRows: 2, queryMeta: meta, semantics: sem('snapshot') });
    expect(text).not.toContain('Truncated at limit');
    expect(text).toContain('may be truncated');
  });

  it('no time column → generic caution', () => {
    const data = [{ _head_: {} }, { oname: 'a', v: 1 }, { oname: 'b', v: 2 }];
    const text = formatMxqlResponse(data, { maxRows: 2, queryMeta: meta, semantics: sem('snapshot') });
    expect(text).not.toContain('Truncated at limit');
    expect(text).toContain('may be truncated');
  });

  it('ranking results are ordered by value, not time → unchanged (no notice)', () => {
    const text = formatMxqlResponse(rows(4), { maxRows: 4, queryMeta: meta, semantics: sem('ranking') });
    expect(text).not.toContain('Truncated at limit');
  });

  it('no queryMeta → generic caution', () => {
    const text = formatMxqlResponse(rows(4), { maxRows: 4, semantics: sem('snapshot') });
    expect(text).not.toContain('Truncated at limit');
    expect(text).toContain('may be truncated');
  });
});

describe('whatap_query_data: following the hint continues the window', () => {
  it('the suggested stime goes out on the next call', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const sent: { stime: number; etime: number; limit?: number }[] = [];
    const client = {
      executeMxqlPath: async (_p: number, q: { stime: number; etime: number; limit?: number }) => {
        sent.push({ stime: q.stime, etime: q.etime, limit: q.limit });
        return rows(q.limit ?? 100, q.stime);
      },
      executeMxqlText: async () => [],
      executePromql: async () => [],
      resolveOids: async () => new Map(),
    } as unknown as WhatapApiClient;
    registerYardTools(server, client);
    const call = (args: Record<string, unknown>) =>
      (server as any)._tools.get('whatap_query_data').callback(args);

    const etime = String(T0 + H);
    const first = await call({ projectCode: 1, path: 'v2/app/tps_oid', stime: String(T0), etime, timeRange: '5m', limit: 9 });
    const hint = first.content[0].text.match(/stime="([^"]+)"/);
    expect(hint).not.toBeNull();
    await call({ projectCode: 1, path: 'v2/app/tps_oid', stime: hint![1], etime, timeRange: '5m', limit: 9 });
    expect(sent[1].stime).toBe(T0 + 10_000); // 9 rows / 3 per bucket → last bucket +10s
    expect(sent[1].etime).toBe(T0 + H);
  });
});

describe('whatap_query_data: following the hints never loops', () => {
  it('each suggested stime is later than the last, until the hint stops offering one', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const PER_BUCKET = 7;
    const client = {
      executeMxqlPath: async (_p: number, q: { stime: number; etime: number; limit?: number }) => {
        // PER_BUCKET rows every 5 s from stime to etime, cut at limit: the server's behavior
        const out: Record<string, unknown>[] = [{ _head_: {} }];
        for (let t = q.stime; t <= q.etime && out.length <= (q.limit ?? 100); t += 5000)
          for (let k = 0; k < PER_BUCKET && out.length <= (q.limit ?? 100); k++) out.push({ time: t, oid: k });
        return out;
      },
      executeMxqlText: async () => [],
      executePromql: async () => [],
      resolveOids: async () => new Map(),
    } as unknown as WhatapApiClient;
    registerYardTools(server, client);
    const call = (args: Record<string, unknown>) =>
      (server as any)._tools.get('whatap_query_data').callback(args);

    for (const limit of [3, 7, 10, 20]) {
      let stime = String(T0);
      const seen: string[] = [];
      for (let i = 0; i < 50; i++) {
        const res = await call({ projectCode: 1, path: 'v2/app/tps_oid', stime, etime: String(T0 + 60_000), timeRange: '5m', limit });
        const next = res.content[0].text.match(/stime="([^"]+)"/)?.[1];
        if (!next) break;
        expect(seen).not.toContain(next);
        expect(Date.parse(next)).toBeGreaterThan(Number.isNaN(Number(stime)) ? Date.parse(stime) : Number(stime));
        seen.push(next);
        stime = next;
      }
    }
  });
});
