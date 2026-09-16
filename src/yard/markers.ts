// src/yard/markers.ts
// Detects unsubstituted yard template markers (<% NAME %>) in raw MXQL.
//
// These markers are filled in by the yard service when it serves a query by
// path; they never reach the MXQL engine. Sending such raw text to
// /open-mcp/api/flush/mxql/text returns HTTP 200 with an error row:
//
//   [{"error":"A JSONObject text must begin with '{' at 1 [character 2 line 1]"}]
//
// which the tool layer used to misreport as "No data found". Verified live
// against pcode 5490 on 2026-09-10 with mxql/apm/stat/transaction_diff (registered
// as src/main/resources/... before the build-layout dedupe).

const MARKER_RE = /<%([\s\S]*?)%>/g;

export interface MarkerScan {
  hasMarkers: boolean;
  /** Marker names in first-seen order, whitespace-trimmed, de-duplicated. */
  markers: string[];
}

/**
 * Scan raw MXQL for unresolved yard template markers.
 * Comment lines (-- prefixed) are inert and ignored.
 * Marker names are NOT normalized — the catalog carries both `<%OID%>` and
 * `<% AGENT %>`, and the caller should see what is actually in the text.
 */
export function scanMarkers(raw: string): MarkerScan {
  const names = new Set<string>();
  if (!raw) return { hasMarkers: false, markers: [] };
  for (const line of raw.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    for (const m of line.matchAll(MARKER_RE)) {
      const name = m[1].trim();
      if (name) names.add(name);
    }
  }
  return { hasMarkers: names.size > 0, markers: [...names] };
}

/**
 * True when a CATEGORY name still contains an unsubstituted yard marker.
 *
 * 14 of the catalog's 164 base categories are marker text rather than category
 * names (`<%CATEGORY%>`, `db_oracle_dma_sqlstat<%TIMEUNIT%>`, and a bare `<%`).
 * They cannot be looked up, and every one of the 62 entries carrying them is a
 * non-executable template, so they are filtered out of the browsable category
 * list. Uses its own non-global regex — MARKER_RE is /g and carries lastIndex.
 */
export function isTemplateCategory(category: string): boolean {
  return /<%|%>/.test(category);
}
