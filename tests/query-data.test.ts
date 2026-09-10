import { describe, it, expect } from 'vitest';
import { registerYardTools } from '../src/tools/yard.ts';
import { McpServer } from '../src/mcp/server.ts';
import type { WhatapApiClient } from '../src/api/client.ts';
import { CATALOG_RAW } from '../src/data/mxql-catalog.ts';
import { scanMarkers } from '../src/yard/markers.ts';

interface Captured {
  endpoint: 'text' | 'path';
  pcode: number;
  mql: string;
}

/**
 * Wire up whatap_query_data over a fake client.
 * `result` is what the server "returns"; `calls` records every request that
 * actually left the tool, so a pre-execution guard can be proven, not assumed.
 */
function setupTool(result: unknown[] = []) {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const calls: Captured[] = [];
  const client = {
    executeMxqlText: async (pcode: number, p: { mql: string }) => {
      calls.push({ endpoint: 'text', pcode, mql: p.mql });
      return result;
    },
    executeMxqlPath: async (pcode: number, p: { mql: string }) => {
      calls.push({ endpoint: 'path', pcode, mql: p.mql });
      return result;
    },
    executePromql: async (pcode: number, p: { query: string }) => {
      calls.push({ endpoint: 'text', pcode, mql: `OPENMX ${p.query}` });
      return result;
    },
    resolveOids: async () => new Map(),
  } as unknown as WhatapApiClient;
  registerYardTools(server, client);
  const tool = (server as any)._tools.get('whatap_query_data');
  return { calls, callback: tool.callback };
}

const args = (over: Record<string, unknown> = {}) => ({
  projectCode: 5490,
  timeRange: '6h',
  limit: 100,
  ...over,
});

const TICKET_PATH = 'src/main/resources/mxql/apm/stat/transaction_diff';

// The four states the response contract distinguishes. Live-verified against
// pcode 5490 on 2026-09-10; these lock the behaviour in.
describe('whatap_query_data — state C: not executed (template markers)', () => {
  it('rejects the ticket path without sending anything to the server', async () => {
    const { calls, callback } = setupTool();
    const res = await callback(args({ path: TICKET_PATH }));
    expect(res.isError).toBe(true);
    expect(calls).toEqual([]); // nothing left the process
    const text = res.content[0].text;
    expect(text).toContain('NOT sent to the server');
    expect(text).toContain('<%AGENT%>');
    expect(text).toContain('Do NOT retry');
    expect(text).not.toContain('No data found');
    expect(text).not.toContain('No rows returned');
  });

  it('names the template category and offers an executable path over it', async () => {
    const { callback } = setupTool();
    const text = (await callback(args({ path: TICKET_PATH }))).content[0].text;
    expect(text).toContain('db3_stat_tx');
    expect(text).toContain('mxql/app/stat_tx_pcode');
  });

  it('never suggests another template as the alternative', async () => {
    const { callback } = setupTool();
    const text = (await callback(args({ path: TICKET_PATH }))).content[0].text;
    const suggested = [...text.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
    expect(suggested.length).toBeGreaterThan(0);
    for (const p of suggested) {
      expect(scanMarkers(CATALOG_RAW[p] ?? '').hasMarkers).toBe(false);
    }
  });

  it('blocks every marker path in the catalog — none can reach the client', async () => {
    const markerPaths = Object.keys(CATALOG_RAW).filter(
      (p) => scanMarkers(CATALOG_RAW[p]).hasMarkers
    );
    expect(markerPaths.length).toBe(200); // 100 logical paths, shipped twice
    const { calls, callback } = setupTool();
    for (const p of markerPaths) {
      const res = await callback(args({ path: p }));
      expect(res.isError, `${p} should be rejected`).toBe(true);
    }
    expect(calls).toEqual([]);
  });
});

describe('whatap_query_data — state B: the server said why', () => {
  it('passes through an error whose message does not contain "not found"', async () => {
    const wire = [{ error: "A JSONObject text must begin with '{' at 1 [character 2 line 1]" }];
    const { callback } = setupTool(wire);
    const res = await callback(args({ path: 'mxql/app/stat_tx_pcode' }));
    expect(res.isError).toBe(true);
    const text = res.content[0].text;
    expect(text).toContain('JSONObject text must begin');
    expect(text).toContain('not** an absence of data');
    expect(text).not.toContain('No data found');
  });

  it('reports an error row that arrives alongside a _head_ row', async () => {
    const wire = [{ _head_: ['tps'] }, { error: 'query breaker tripped' }];
    const { callback } = setupTool(wire);
    const res = await callback(args({ path: 'mxql/app/stat_tx_pcode' }));
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('query breaker tripped');
  });

  it('keeps the fuzzy-suggestion treatment for a genuine "not found"', async () => {
    const wire = [{ error: 'not found /v2/app/nope' }];
    const { callback } = setupTool(wire);
    const res = await callback(args({ path: 'v2/app/nope' }));
    expect(res.isError).toBe(true);
    const text = res.content[0].text;
    expect(text).toContain('not found on the server');
    expect(text).toContain('**Server message**');
  });
});

describe('whatap_query_data — state A: executed, no error, no rows', () => {
  it('echoes the executed MXQL and refuses to assert a cause', async () => {
    const { calls, callback } = setupTool([]);
    const res = await callback(args({ path: 'mxql/app/stat_tx_pcode' }));
    expect(res.isError).toBeUndefined();
    expect(calls).toHaveLength(1);
    const text = res.content[0].text;
    expect(text).toContain('No rows returned');
    expect(text).toContain('Executed MXQL');
    expect(text).toContain(calls[0].mql.split('\n')[0]);
    expect(text).not.toContain('Time range may be too narrow');
    expect(text).not.toContain('No active agents sending data');
  });

  it('reports an empty array through the same echo path as a _head_-only result', async () => {
    const empty = await setupTool([]);
    const headOnly = await setupTool([{ _head_: ['tps'] }]);
    const a = (await empty.callback(args({ path: 'mxql/app/stat_tx_pcode' }))).content[0].text;
    const b = (await headOnly.callback(args({ path: 'mxql/app/stat_tx_pcode' }))).content[0].text;
    expect(a).toContain('Executed MXQL');
    expect(b).toContain('Executed MXQL');
    expect(b).toContain('1 returned, 0 after metadata filtering');
  });

  it('marks the path endpoint as server-expanded instead of claiming the sent text ran', async () => {
    const { calls, callback } = setupTool([]);
    // Unprefixed spelling misses the catalog and goes to the path endpoint.
    const res = await callback(args({ path: 'v2/container/kube_pod_stat' }));
    expect(calls[0].endpoint).toBe('path');
    const text = res.content[0].text;
    expect(text).toContain('a path reference');
    expect(text).toContain('not the executed text');
  });
});

describe('whatap_query_data — data still flows', () => {
  it('returns a formatted table when rows come back', async () => {
    const { callback } = setupTool([{ _head_: ['tps'] }, { tps: 40.1 }, { tps: 0 }]);
    const res = await callback(args({ path: 'mxql/app/stat_tx_pcode' }));
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    expect(text).toContain('|');
    expect(text).not.toContain('No rows returned');
  });
});
