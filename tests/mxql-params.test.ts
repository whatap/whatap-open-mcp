import { describe, it, expect } from 'vitest';
import { normalizeMxqlParams } from '../src/api/client.ts';
import { describeMql } from '../src/yard/catalog.ts';
import { parseMqlFile } from '../src/yard/parser.ts';

// MXQL variables are written `$oid`, `$field`, … and the server substitutes them
// by that exact name, so `param` must be keyed with the `$`. The tools advertised
// the bare form, which the server ignored in silence:
//   param {"oid": 384770091}  → 9 agents returned (filter dropped)
//   param {"$oid": 384770091} → 1 agent  (verified live, pcode 5490, 2026-09-11)
// For `SELECT [time, oid, oname, $field]` the metric column simply never appeared.

describe('normalizeMxqlParams', () => {
  it('adds the $ the server substitutes on', () => {
    expect(normalizeMxqlParams({ oid: '12345' })).toEqual({ $oid: '12345' });
    expect(normalizeMxqlParams({ field: 'gc_time' })).toEqual({ $field: 'gc_time' });
  });

  it('leaves an already-prefixed key alone', () => {
    expect(normalizeMxqlParams({ $field: 'gc_time' })).toEqual({ $field: 'gc_time' });
  });

  it('prefers the explicit $ spelling when a caller passes both', () => {
    expect(normalizeMxqlParams({ field: 'gc_count', $field: 'gc_time' }))
      .toEqual({ $field: 'gc_time' });
  });

  it('passes through undefined and empty maps untouched', () => {
    expect(normalizeMxqlParams(undefined)).toBeUndefined();
    expect(normalizeMxqlParams({})).toEqual({});
  });

  it('normalizes every key, not just the first', () => {
    expect(normalizeMxqlParams({ oid: '1', okind: 'app', onode: 'n1' }))
      .toEqual({ $oid: '1', $okind: 'app', $onode: 'n1' });
  });
});

describe('HEADER parsing', () => {
  // `HEADER {gc_time$:ms, gc_count$:'I'}` — the quotes are optional in the yard
  // files, and requiring them dropped the unquoted entry on 82 catalog paths,
  // losing its unit annotation and its name from describe_query's metric list.
  it('accepts unquoted type codes alongside quoted ones', () => {
    const meta = parseMqlFile("HEADER {gc_time$:ms, gc_count$:'I', gc_oldgen_count$:'I'}\nCATEGORY x\nTAGLOAD");
    expect(meta.headerTypes).toEqual({ gc_time: 'ms', gc_count: 'I', gc_oldgen_count: 'I' });
  });

  it('keeps gc_time on the reported path', () => {
    expect(describeMql('mxql/v2/app/app_gc')!.headerTypes.gc_time).toBe('ms');
  });
});

describe('$field paths', () => {
  it('the reported paths declare $field as a caller parameter', () => {
    for (const p of ['mxql/v2/app/app_gc', 'mxql/flexboard/app_gc']) {
      const m = describeMql(p)!;
      expect(m.parameters, p).toContain('$field');
      // The metric column is the parameter: SELECT carries no concrete metric.
      expect(m.selectFields, p).toContain('$field');
    }
  });
});

describe('unit annotations from _head_', () => {
  it('resolves units when the server echoes the $-suffixed HEADER keys', async () => {
    const { formatMxqlResponse } = await import('../src/utils/format.ts');
    const wire = [
      { _head_: { 'gc_time$': 'ms', 'gc_count$': 'I' } },
      { time: 1789098540000, gc_time: 20.17, gc_count: 12, _name_: 'demo-8103' },
    ];
    const header = formatMxqlResponse(wire).split('\n').find((l) => l.startsWith('|'))!;
    expect(header).toContain('gc_time (ms)');
  });

  it('still resolves units when the keys come back bare', async () => {
    const { formatMxqlResponse } = await import('../src/utils/format.ts');
    const wire = [
      { _head_: { cpu: 'P' } },
      { time: 1789098540000, cpu: 3.82, _name_: 'host-1' },
    ];
    const header = formatMxqlResponse(wire).split('\n').find((l) => l.startsWith('|'))!;
    expect(header).toContain('cpu (%)');
  });
});
