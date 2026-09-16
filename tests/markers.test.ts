import { describe, it, expect } from 'vitest';
import { scanMarkers, isTemplateCategory } from '../src/yard/markers.ts';
import { CATALOG_RAW, CATALOG_ENTRIES } from '../src/data/mxql-catalog.ts';

describe('scanMarkers', () => {
  it('detects a marker and reports its name without normalizing', () => {
    const scan = scanMarkers('CATEGORY x\n<% AGENT %>\nTAGLOAD');
    expect(scan.hasMarkers).toBe(true);
    expect(scan.markers).toEqual(['AGENT']);
  });

  it('treats spacing variants as the same name but keeps both forms detectable', () => {
    expect(scanMarkers('<%OID%>').markers).toEqual(['OID']);
    expect(scanMarkers('<%   OID   %>').markers).toEqual(['OID']);
  });

  it('de-duplicates and preserves first-seen order', () => {
    const scan = scanMarkers('<% B %>\n<% A %>\n<%B%>');
    expect(scan.markers).toEqual(['B', 'A']);
  });

  it('ignores markers inside -- comment lines', () => {
    const scan = scanMarkers('-- <% AGENT %> is filled in by yard\nCATEGORY x\nTAGLOAD');
    expect(scan.hasMarkers).toBe(false);
    expect(scan.markers).toEqual([]);
  });

  it('marker-free MXQL scans clean', () => {
    const scan = scanMarkers('CATEGORY app_counter\nTAGLOAD\nSELECT [tps]');
    expect(scan.hasMarkers).toBe(false);
  });

  it('handles empty and multi-line markers', () => {
    expect(scanMarkers('').hasMarkers).toBe(false);
    expect(scanMarkers('<%%>').hasMarkers).toBe(false); // empty name is not a marker
  });
});

describe('catalog marker inventory', () => {
  // Ground truth measured 2026-09-10 against main HEAD c6e1f8a, restated after
  // the build-layout dedupe: the 100 template paths were counted twice then
  // (once under src/main/resources, once under target/classes) and are counted
  // once now. These numbers are asserted so a catalog regeneration cannot
  // silently change the blast radius.
  const markerPaths = Object.keys(CATALOG_RAW).filter(
    (p) => scanMarkers(CATALOG_RAW[p]).hasMarkers
  );

  it('carries the 100 template paths exactly once', () => {
    expect(markerPaths.length).toBe(100);
  });

  it('registers every marker path under mxql/, not a build-layout prefix', () => {
    expect(markerPaths.filter((p) => !p.startsWith('mxql/'))).toEqual([]);
  });

  it('no longer ships the src/main/resources and target/classes duplicates', () => {
    const prefixed = Object.keys(CATALOG_RAW).filter(
      (p) => p.startsWith('src/main/resources/') || p.startsWith('target/classes/')
    );
    expect(prefixed).toEqual([]);
  });

  it('the reported per-domain split holds (apm/stat 48, dbx 27, infra 22, other 3)', () => {
    const domainOf = (p: string) => {
      const seg = p.replace(/^mxql\//, '').split('/');
      return seg[0] === 'apm' && seg[1] === 'stat' ? 'apm/stat' : seg[0];
    };
    const counts = new Map<string, number>();
    for (const p of markerPaths) {
      const d = domainOf(p);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    expect(counts.get('apm/stat')).toBe(48);
    expect(counts.get('dbx')).toBe(27);
    expect(counts.get('infra')).toBe(22);
    const other = [...counts.entries()]
      .filter(([d]) => !['apm/stat', 'dbx', 'infra'].includes(d))
      .reduce((n, [, c]) => n + c, 0);
    expect(other).toBe(3);
  });

  it('the ticket reproduction path is a template with AGENT and FILTER markers', () => {
    const p = 'mxql/apm/stat/transaction_diff';
    const scan = scanMarkers(CATALOG_RAW[p]);
    expect(scan.hasMarkers).toBe(true);
    expect(scan.markers).toEqual(['AGENT', 'FILTER']);
  });

  it('an executable alternative exists for the reproduction path (same base category family)', () => {
    // stat_tx vs the template's db3_stat_tx — the suggester matches on this.
    const alt = CATALOG_ENTRIES.find((e) => e.path === 'mxql/app/stat_tx_pcode');
    expect(alt).toBeDefined();
    expect(scanMarkers(CATALOG_RAW[alt!.path]).hasMarkers).toBe(false);
  });
});

describe('isTemplateCategory', () => {
  it('flags marker text and passes real category names', () => {
    expect(isTemplateCategory('<%CATEGORY%>')).toBe(true);
    expect(isTemplateCategory('db_oracle_dma_sqlstat<%TIMEUNIT%>')).toBe(true);
    expect(isTemplateCategory('<%')).toBe(true);
    expect(isTemplateCategory('app_counter')).toBe(false);
    expect(isTemplateCategory('server_base')).toBe(false);
  });
});
