import { describe, it, expect } from 'vitest';
import { canonicalCatalogPath, describeMql } from '../src/yard/catalog.ts';
import { registerYardTools } from '../src/tools/yard.ts';
import { McpServer } from '../src/mcp/server.ts';
import type { WhatapApiClient } from '../src/api/client.ts';
import { PARAM_MXQL_PATH } from '../src/utils/descriptions.ts';

function describeCallback() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerYardTools(server, {} as unknown as WhatapApiClient);
  return (server as any)._tools.get('whatap_describe_query').callback;
}

describe('canonicalCatalogPath', () => {
  it('resolves the bare spelling the tool docs use', () => {
    expect(canonicalCatalogPath('v2/sys/server_base')).toBe('mxql/v2/sys/server_base');
    expect(canonicalCatalogPath('v2/app/tps_pcode')).toBe('mxql/v2/app/tps_pcode');
  });

  it('leaves an already-canonical key untouched', () => {
    expect(canonicalCatalogPath('mxql/v2/sys/server_base')).toBe('mxql/v2/sys/server_base');
  });

  it('tolerates a leading slash', () => {
    expect(canonicalCatalogPath('/v2/sys/server_base')).toBe('mxql/v2/sys/server_base');
  });

  it('returns null for a path that exists in neither spelling', () => {
    expect(canonicalCatalogPath('v2/app/no_such_thing_xyz')).toBeNull();
    expect(canonicalCatalogPath('')).toBeNull();
  });

  it('resolves every path the tool descriptions advertise', () => {
    // PARAM_MXQL_PATH and the query_data description list bare paths as examples.
    // Every one of them must be describable, or the tool guides callers into an error.
    const advertised = [...PARAM_MXQL_PATH.matchAll(/\b(v2\/[a-z0-9_/]+)/g)].map((m) => m[1]);
    expect(advertised.length).toBeGreaterThan(0);
    for (const p of advertised) {
      expect(canonicalCatalogPath(p), `${p} is advertised but not resolvable`).not.toBeNull();
    }
  });
});

describe('whatap_describe_query path spelling', () => {
  it('describes the documented bare spelling instead of erroring', async () => {
    const res = await describeCallback()({ path: 'v2/sys/server_base' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    expect(text).toContain('**Categories**');
    expect(text).not.toContain('not found in the catalog');
    // Names the canonical key so the caller can see what it resolved to.
    expect(text).toContain('mxql/v2/sys/server_base');
    expect(text).toContain('Resolved from');
  });

  it('describes the canonical spelling without the resolution note', async () => {
    const res = await describeCallback()({ path: 'mxql/v2/sys/server_base' });
    expect(res.isError).toBeUndefined();
    expect(res.content[0].text).not.toContain('Resolved from');
  });

  it('still errors, with suggestions, on a path that does not exist', async () => {
    const res = await describeCallback()({ path: 'v2/app/no_such_thing_xyz' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('not found in the catalog');
  });

  it('example blocks use the canonical key, so a copied call resolves', async () => {
    const text = (await describeCallback()({ path: 'v2/sys/server_base' })).content[0].text;
    const example = text.split('### Example')[1] ?? '';
    expect(example).toContain('path="mxql/v2/sys/server_base"');
  });
});
