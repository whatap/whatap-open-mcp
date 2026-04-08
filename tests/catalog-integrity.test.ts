import { describe, it, expect } from 'vitest';
import { CATALOG_ENTRIES } from '../src/data/mxql-catalog.ts';
import {
  getCatalogSize,
  getDomainSummary,
  searchEntries,
  fuzzyMatch,
  describeMql,
} from '../src/yard/catalog.ts';
import { ENGLISH_DESCRIPTIONS } from '../src/utils/descriptions.ts';

describe('catalog integrity', () => {
  it('CATALOG_ENTRIES has at least 640 entries', () => {
    expect(CATALOG_ENTRIES.length).toBeGreaterThanOrEqual(640);
  });

  it('ENGLISH_DESCRIPTIONS has at least 120 entries', () => {
    expect(Object.keys(ENGLISH_DESCRIPTIONS).length).toBeGreaterThanOrEqual(120);
  });

  it('getDomainSummary() returns entries', () => {
    const summary = getDomainSummary();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary[0]).toHaveProperty('domain');
    expect(summary[0]).toHaveProperty('count');
  });

  it('getCatalogSize() > 0', () => {
    expect(getCatalogSize()).toBeGreaterThan(0);
  });

  it('searchEntries({search: "cpu"}) returns results', () => {
    const results = searchEntries({ search: 'cpu' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('fuzzyMatch("server_bas") returns suggestions (partial/typo match)', () => {
    // fuzzyMatch uses substring inclusion — "server_bas" matches paths containing it
    const suggestions = fuzzyMatch('server_bas');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('describeMql returns non-null with categories and selectFields for a known path', () => {
    // Catalog paths are prefixed with "mxql/"
    const result = describeMql('mxql/v2/sys/server_base');
    expect(result).not.toBeNull();
    expect(result!.categories).toBeDefined();
    expect(result!.selectFields).toBeDefined();
  });

  it('every CatalogEntry has path, domain, baseCategories as arrays', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(entry).toHaveProperty('path');
      expect(typeof entry.path).toBe('string');
      expect(entry).toHaveProperty('domain');
      expect(typeof entry.domain).toBe('string');
      expect(entry).toHaveProperty('baseCategories');
      expect(Array.isArray(entry.baseCategories)).toBe(true);
    }
  });
});
