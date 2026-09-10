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
// against pcode 5490 on 2026-09-10 with src/main/resources/mxql/apm/stat/transaction_diff.

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
