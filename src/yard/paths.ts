// src/yard/paths.ts
// Catalog path normalization.
//
// The yard lives inside the WhaTap backend, which uses the Maven standard
// layout: every .mql under `src/main/resources/` is copied verbatim to
// `target/classes/` at build time. The catalog generator used to walk both trees
// and register the same query twice under two keys, so 232 of 931 entries
// (24.9%) were duplicate pairs — bloating both the shipped bundle and, more
// importantly, the LLM context of any `category=` or `domain=` listing.
//
// Stripping the build-layout prefix collapses each pair onto the `mxql/...`
// spelling that 699 of the entries already used.

/** Maven source / build-output prefixes that are not part of a query's identity. */
export const BUILD_LAYOUT_PREFIXES = [
  "src/main/resources/",
  "target/classes/",
] as const;

const PREFIX_RE = /^(?:src\/main\/resources\/|target\/classes\/)+/;

/** Strip Maven source/build-output prefixes from a catalog path. */
export function normalizeCatalogPath(path: string): string {
  return path.replace(/^\/+/, "").replace(PREFIX_RE, "");
}

/** True when the path carries a build-layout prefix that normalization removes. */
export function hasBuildLayoutPrefix(path: string): boolean {
  return PREFIX_RE.test(path.replace(/^\/+/, ""));
}

/**
 * Pick the winner between two paths that normalize to the same key.
 *
 * An already-clean `mxql/...` spelling always wins; otherwise the Maven source
 * tree beats the build output, so the catalog points at the file a human edits.
 */
export function preferredDuplicate(a: string, b: string): string {
  const aPrefixed = hasBuildLayoutPrefix(a);
  const bPrefixed = hasBuildLayoutPrefix(b);
  if (aPrefixed !== bPrefixed) return aPrefixed ? b : a;
  return a <= b ? a : b;
}
