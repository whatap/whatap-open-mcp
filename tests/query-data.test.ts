import { describe, it, expect } from 'vitest';
import { registerYardTools } from '../src/tools/yard.ts';
import { McpServer } from '../src/mcp/server.ts';
import type { WhatapApiClient } from '../src/api/client.ts';

interface Captured {
  endpoint: 'text' | 'path';
  pcode: number;
  mql: string;
}

/**
 * Wire up whatap_query_data over a fake client.
 * `result` is what the server "returns"; `calls` records every request that
 * actually left the tool.
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

describe('whatap_query_data — the server said why', () => {
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

  it('surfaces an error row from the PromQL branch too', async () => {
    const { callback } = setupTool([{ error: 'bad promql' }]);
    const res = await callback(args({ query: 'rate(' }));
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('bad promql');
  });
});

describe('whatap_query_data — data still flows', () => {
  it('returns a formatted table when rows come back', async () => {
    const { callback } = setupTool([{ _head_: ['tps'] }, { tps: 40.1 }, { tps: 0 }]);
    const res = await callback(args({ path: 'mxql/app/stat_tx_pcode' }));
    expect(res.isError).toBeUndefined();
    expect(res.content[0].text).toContain('|');
  });
});
