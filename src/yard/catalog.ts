// src/yard/catalog.ts
// Static catalog module — synchronous functions operating on build-time data.
// Replaces the filesystem-based YardScanner.

import { CATALOG_ENTRIES, CATALOG_RAW } from "../data/mxql-catalog.js";
import type { CatalogEntry, DomainSummary, MqlMetadata } from "./types.js";
import { parseMqlFile } from "./parser.js";
import { isTemplateCategory } from "./markers.js";
import { normalizeCatalogPath } from "./paths.js";

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  "v2/app": "APM: TPS, response time, errors, active TX, apdex, heap, GC, threads",
  "v2/sys": "Server: CPU, memory, disk, network, process, load, agent status",
  "v2/container": "Kubernetes: pods, nodes, containers, events, resource usage",
  "v2/db": "Database: active sessions, wait events, replication, counters",
  "v2/logs": "Logs: log sink collection, counts, aggregation, RPS",
  "v2/aws": "AWS: CloudWatch metrics for various AWS services",
  "v2/rum": "Real User Monitoring: page load, resource timing, AJAX",
  "v2/ha": "High Availability: cluster status, dependencies, network",
  "v2/url": "URL Monitoring: URL status checks, issue tracking",
  "npm/all": "NPM: network performance monitoring (all metrics)",
  "npm/tcp": "NPM: TCP-specific network metrics",
  "log/stat": "Log statistics: log count aggregations",
  app: "Legacy APM queries",
  sys: "Legacy server queries",
  log: "Legacy log queries",
};

// ── Lazy indexes ──

let _byPath: Map<string, CatalogEntry> | null = null;
let _byDomain: Map<string, CatalogEntry[]> | null = null;
let _byCategoryBase: Map<string, CatalogEntry[]> | null = null;

function byPath(): Map<string, CatalogEntry> {
  if (!_byPath) {
    _byPath = new Map();
    for (const e of CATALOG_ENTRIES) {
      _byPath.set(e.path, e);
    }
  }
  return _byPath;
}

function byDomain(): Map<string, CatalogEntry[]> {
  if (!_byDomain) {
    _byDomain = new Map();
    for (const e of CATALOG_ENTRIES) {
      const list = _byDomain.get(e.domain) ?? [];
      list.push(e);
      _byDomain.set(e.domain, list);
    }
  }
  return _byDomain;
}

function byCategoryBase(): Map<string, CatalogEntry[]> {
  if (!_byCategoryBase) {
    _byCategoryBase = new Map();
    for (const e of CATALOG_ENTRIES) {
      for (const cat of e.baseCategories) {
        // Marker names ARE indexed. They are not offered as candidates — see
        // getAllBaseCategories() — but "which paths use <%SQLSTAT_CATEGORY%>?"
        // is a real question with a real answer (two, as it happens), and
        // dropping them from the index turned it into a dead end.
        const list = _byCategoryBase.get(cat) ?? [];
        list.push(e);
        _byCategoryBase.set(cat, list);
      }
    }
  }
  return _byCategoryBase;
}

// ── Public API ──

export function getDomainSummary(): DomainSummary[] {
  const domains = byDomain();
  const summaries: DomainSummary[] = [];
  for (const [domain, entries] of domains) {
    summaries.push({
      domain,
      count: entries.length,
      description: DOMAIN_DESCRIPTIONS[domain] ?? "",
    });
  }
  summaries.sort((a, b) => b.count - a.count);
  return summaries;
}

export function searchEntries(opts: {
  domain?: string;
  search?: string;
  category?: string;
}): CatalogEntry[] {
  let results: CatalogEntry[];

  if (opts.category) {
    // Reverse lookup: which paths use this category
    const base = opts.category.replace(/\{[^}]+\}$/, "");
    results = byCategoryBase().get(base) ?? [];
  } else if (opts.domain) {
    results = byDomain().get(opts.domain) ?? [];
  } else {
    results = CATALOG_ENTRIES;
  }

  if (opts.search) {
    const term = opts.search.toLowerCase();
    results = results.filter(
      (e) =>
        e.path.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term)
    );
  }

  return results;
}

/**
 * Resolve a catalog path written either way.
 *
 * Every catalog key carries an `mxql/` prefix (`mxql/v2/sys/server_base`), but
 * the tool descriptions and PARAM_MXQL_PATH tell callers to use the bare form
 * (`v2/sys/server_base`), so whatap_describe_query used to reject its own
 * documented spelling with "not found in the catalog".
 *
 * This is a LOOKUP helper only. It deliberately does not change which endpoint
 * whatap_query_data uses: a bare path still misses the catalog there and goes to
 * the server's path endpoint, which resolves it. Making execution follow this
 * normalization would move 340 v2 paths from the path endpoint to the text
 * endpoint, which needs its own verification.
 *
 * Returns the canonical catalog key, or null when nothing matches either way.
 */
export function canonicalCatalogPath(path: string): string | null {
  const bare = path.replace(/^\/+/, "");
  if (byPath().has(bare)) return bare;

  // Back-compat: catalogs before the build-layout dedupe registered these
  // queries under `src/main/resources/...` and `target/classes/...`, so a path
  // copied from an older response still resolves.
  const normalized = normalizeCatalogPath(bare);
  if (normalized !== bare && byPath().has(normalized)) return normalized;

  const prefixed = `mxql/${normalized}`;
  if (byPath().has(prefixed)) return prefixed;
  const stripped = normalized.replace(/^mxql\//, "");
  if (stripped !== normalized && byPath().has(stripped)) return stripped;
  return null;
}

export function describeMql(path: string): (MqlMetadata & { entry: CatalogEntry }) | null {
  const entry = byPath().get(path);
  if (!entry) return null;

  const raw = CATALOG_RAW[path];
  if (raw) {
    const metadata = parseMqlFile(raw);
    return { ...metadata, entry };
  }

  // Fallback: reconstruct from catalog entry
  return {
    raw: "",
    categories: entry.categories,
    parameters: entry.parameters,
    headerTypes: entry.headerTypes,
    selectFields: entry.selectFields,
    joins: entry.joins,
    comments: entry.description ? [entry.description] : [],
    loadType: entry.loadType,
    entry,
  };
}

export function fuzzyMatch(path: string, limit = 5): CatalogEntry[] {
  const term = path.toLowerCase();
  const scored: Array<{ entry: CatalogEntry; score: number }> = [];

  for (const entry of CATALOG_ENTRIES) {
    const haystack = entry.path.toLowerCase();
    const filename = entry.path.split("/").pop()?.toLowerCase() ?? "";

    if (haystack === term) {
      scored.push({ entry, score: 100 });
    } else if (filename === term) {
      scored.push({ entry, score: 90 });
    } else if (haystack.includes(term)) {
      scored.push({ entry, score: 50 });
    } else if (term.includes(filename)) {
      scored.push({ entry, score: 30 });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

export function getPathsForCategory(category: string): CatalogEntry[] {
  const base = category.replace(/\{[^}]+\}$/, "");
  return byCategoryBase().get(base) ?? [];
}

/**
 * Browsable base category names.
 *
 * Callers use this list to pick a `category=` argument, so unsubstituted yard
 * markers are filtered out: every one of the 62 entries carrying them is a
 * non-executable template, so they are never usable candidates. They remain
 * reachable by explicit lookup — see byCategoryBase().
 */
export function getAllBaseCategories(): string[] {
  return Array.from(byCategoryBase().keys())
    .filter((c) => !isTemplateCategory(c))
    .sort();
}

/**
 * Near matches for a category name that did not resolve.
 *
 * Callers keep spelling marker categories without their delimiters — asking for
 * `SQLSTAT_CATEGORY` when the catalog holds `<%SQLSTAT_CATEGORY%>`. The old miss
 * response listed the first 15 categories alphabetically (`#WhaTapPIIClearHistory,
 * $category, 1d, 2h, ...`), which never contains the answer. Matching on a
 * normalized form (lowercase, alphanumerics only) makes the two spellings equal,
 * so the suggestion is exactly the category the caller meant.
 *
 * Searches the unfiltered index, markers included — a marker is a legitimate
 * lookup target even though it is not offered as a browsing candidate.
 */
export function suggestCategories(term: string, limit = 8): string[] {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = norm(term);
  if (!wanted) return [];

  const scored: Array<{ name: string; score: number }> = [];
  for (const name of byCategoryBase().keys()) {
    const candidate = norm(name);
    if (!candidate) continue;

    let score = 0;
    if (candidate === wanted) score = 100;
    else if (candidate.includes(wanted)) score = 70;
    else if (wanted.includes(candidate)) score = 50;

    if (score > 0) scored.push({ name, score });
  }

  // An exact normalized match is the answer, not a candidate. Returning weaker
  // matches alongside it (`stat`, `$category`) only invites a second wrong guess.
  const exact = scored.filter((s) => s.score === 100);
  const pool = exact.length > 0 ? exact : scored;

  pool.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
  return pool.slice(0, limit).map((s) => s.name);
}

export function getCatalogSize(): number {
  return CATALOG_ENTRIES.length;
}
