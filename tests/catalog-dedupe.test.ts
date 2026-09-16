// tests/catalog-dedupe.test.ts
// The yard lives in a Maven project, so every .mql exists twice on disk:
// src/main/resources/... and a byte-identical copy under target/classes/...
// The generator used to register both, putting 232 of 931 entries (24.9%) in the
// catalog as duplicate pairs — wasted bundle bytes, and wasted LLM context on
// every `category=`/`domain=` listing, where up to half the rows were copies.

import { describe, it, expect } from "vitest";
import { CATALOG_ENTRIES, CATALOG_RAW } from "../src/data/mxql-catalog.js";
import {
  canonicalCatalogPath,
  getAllBaseCategories,
  getDomainSummary,
  searchEntries,
  suggestCategories,
} from "../src/yard/catalog.js";
import {
  hasBuildLayoutPrefix,
  normalizeCatalogPath,
  preferredDuplicate,
} from "../src/yard/paths.js";
import { isTemplateCategory, decodeCategoryArg } from "../src/yard/markers.js";

describe("normalizeCatalogPath", () => {
  it("strips both Maven layout prefixes and leaves clean paths alone", () => {
    expect(normalizeCatalogPath("src/main/resources/mxql/apm/stat/x")).toBe("mxql/apm/stat/x");
    expect(normalizeCatalogPath("target/classes/mxql/apm/stat/x")).toBe("mxql/apm/stat/x");
    expect(normalizeCatalogPath("mxql/v2/sys/server_base")).toBe("mxql/v2/sys/server_base");
    expect(normalizeCatalogPath("/target/classes/mxql/a")).toBe("mxql/a");
  });

  it("prefers the clean spelling, then the source tree over build output", () => {
    expect(preferredDuplicate("mxql/a", "target/classes/mxql/a")).toBe("mxql/a");
    expect(
      preferredDuplicate("src/main/resources/mxql/a", "target/classes/mxql/a")
    ).toBe("src/main/resources/mxql/a");
  });
});

describe("shipped catalog", () => {
  it("registers no build-layout prefixed paths", () => {
    const prefixed = CATALOG_ENTRIES.filter((e) => hasBuildLayoutPrefix(e.path));
    expect(prefixed.map((e) => e.path)).toEqual([]);
  });

  it("holds 815 unique entries — one per logical query", () => {
    expect(CATALOG_ENTRIES.length).toBe(815);
    expect(new Set(CATALOG_ENTRIES.map((e) => e.path)).size).toBe(815);
  });

  it("keeps CATALOG_RAW in lockstep with CATALOG_ENTRIES", () => {
    expect(Object.keys(CATALOG_RAW).length).toBe(CATALOG_ENTRIES.length);
    for (const e of CATALOG_ENTRIES) {
      expect(CATALOG_RAW[e.path], `${e.path} has no raw body`).toBeTypeOf("string");
    }
  });

  it("no two entries collapse onto the same normalized path", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const e of CATALOG_ENTRIES) {
      const key = normalizeCatalogPath(e.path);
      const prev = seen.get(key);
      if (prev) collisions.push(`${prev} <-> ${e.path}`);
      seen.set(key, e.path);
    }
    expect(collisions).toEqual([]);
  });

  it("exposes no build-layout domains", () => {
    const domains = getDomainSummary().map((d) => d.domain);
    expect(domains.filter((d) => hasBuildLayoutPrefix(d))).toEqual([]);
  });
});

describe("listings no longer carry copies", () => {
  it("returns each query once per category, across every category", () => {
    const offenders: string[] = [];
    for (const category of getAllBaseCategories()) {
      const paths = searchEntries({ category }).map((e) => e.path);
      if (new Set(paths).size !== paths.length) offenders.push(category);
    }
    expect(offenders).toEqual([]);
  });

  it("transaction_stat resolves to one path, not a src/target pair", () => {
    const hits = searchEntries({ search: "apm/stat/transaction_stat" }).map((e) => e.path);
    expect(hits).toContain("mxql/apm/stat/transaction_stat");
    expect(hits.filter((p) => p.endsWith("/transaction_stat"))).toHaveLength(1);
  });
});

describe("legacy path spellings still resolve", () => {
  it("accepts a path copied from a pre-dedupe response", () => {
    expect(canonicalCatalogPath("src/main/resources/mxql/apm/stat/transaction_diff")).toBe(
      "mxql/apm/stat/transaction_diff"
    );
    expect(canonicalCatalogPath("target/classes/mxql/apm/stat/transaction_diff")).toBe(
      "mxql/apm/stat/transaction_diff"
    );
  });

  it("still accepts the documented bare and mxql/-prefixed spellings", () => {
    expect(canonicalCatalogPath("mxql/v2/sys/server_base")).toBe("mxql/v2/sys/server_base");
    expect(canonicalCatalogPath("v2/sys/server_base")).toBe("mxql/v2/sys/server_base");
  });

  it("returns null for a path that genuinely does not exist", () => {
    expect(canonicalCatalogPath("src/main/resources/mxql/nope/nope")).toBeNull();
  });
});

describe("browsable categories exclude template markers", () => {
  const categories = getAllBaseCategories();

  it("offers no category name containing an unresolved marker", () => {
    expect(categories.filter(isTemplateCategory)).toEqual([]);
  });

  it("drops exactly the 14 reported marker names and keeps the other 150", () => {
    const fromEntries = new Set<string>();
    for (const e of CATALOG_ENTRIES) for (const c of e.baseCategories) fromEntries.add(c);
    const marked = [...fromEntries].filter(isTemplateCategory);
    expect(marked.length).toBe(14);
    expect(categories.length).toBe(fromEntries.size - marked.length);
  });

  it("still answers an explicit lookup for a marker category", () => {
    // Regression: 1.5.1 dropped marker names from the index as well as the list,
    // which turned "which paths use <%SQLSTAT_CATEGORY%>?" into a dead end.
    // Hiding them from the candidate list is right; making them unanswerable is not.
    const hits = searchEntries({ category: "<%SQLSTAT_CATEGORY%>" }).map((e) => e.path);
    expect(hits).toEqual([
      "mxql/dbx/planchange/chart",
      "mxql/dbx/planchange/summary",
    ]);
  });

  it("resolves a marker category written with its modifier", () => {
    const hits = searchEntries({ category: "<%SQLSTAT_CATEGORY%>{h1}" }).map((e) => e.path);
    expect(hits.length).toBe(2);
  });

  it("every marker name in the catalog is reachable by explicit lookup", () => {
    const fromEntries = new Set<string>();
    for (const e of CATALOG_ENTRIES) for (const c of e.baseCategories) fromEntries.add(c);
    const unreachable = [...fromEntries]
      .filter(isTemplateCategory)
      .filter((c) => searchEntries({ category: c }).length === 0);
    expect(unreachable).toEqual([]);
  });

  it("keeps the real categories the probe list depends on", () => {
    for (const c of ["server_base", "app_counter", "kube_pod_stat", "logsink_stats"]) {
      expect(categories, `${c} missing`).toContain(c);
    }
  });

  it("every marker category belonged only to non-executable templates", async () => {
    const { scanMarkers } = await import("../src/yard/markers.js");
    const carriers = CATALOG_ENTRIES.filter((e) =>
      e.baseCategories.some(isTemplateCategory)
    );
    expect(carriers.length).toBeGreaterThan(0);
    const executable = carriers.filter(
      (e) => !scanMarkers(CATALOG_RAW[e.path] ?? "").hasMarkers
    );
    expect(executable.map((e) => e.path)).toEqual([]);
  });
});

describe("HTML-escaped category arguments", () => {
  it("decodes the escaped spelling of a marker category", () => {
    expect(decodeCategoryArg("&lt;%SQLSTAT_CATEGORY%&gt;")).toBe("<%SQLSTAT_CATEGORY%>");
    expect(decodeCategoryArg("&#60;%CATEGORY%&#62;")).toBe("<%CATEGORY%>");
  });

  it("leaves an ordinary category name untouched", () => {
    expect(decodeCategoryArg("app_counter")).toBe("app_counter");
    expect(decodeCategoryArg("<%SQLSTAT_CATEGORY%>")).toBe("<%SQLSTAT_CATEGORY%>");
  });

  it("resolves to the same paths escaped or not", () => {
    const plain = searchEntries({ category: "<%SQLSTAT_CATEGORY%>" }).map((e) => e.path);
    const escaped = searchEntries({
      category: decodeCategoryArg("&lt;%SQLSTAT_CATEGORY%&gt;"),
    }).map((e) => e.path);
    expect(escaped).toEqual(plain);
    expect(escaped.length).toBe(2);
  });
});

describe("category miss suggestions", () => {
  it("finds the marker category when the delimiters are omitted", () => {
    // Three sessions asked for `SQLSTAT_CATEGORY` and got an alphabetical
    // sample that never contained `<%SQLSTAT_CATEGORY%>`.
    expect(suggestCategories("SQLSTAT_CATEGORY")).toEqual(["<%SQLSTAT_CATEGORY%>"]);
    expect(suggestCategories("PLAN_CHANGE_CATEGORY")).toEqual(["<%PLAN_CHANGE_CATEGORY%>"]);
  });

  it("is case- and punctuation-insensitive", () => {
    expect(suggestCategories("sqlstat_category")).toEqual(["<%SQLSTAT_CATEGORY%>"]);
    expect(suggestCategories("<% SQLSTAT_CATEGORY %>")).toEqual(["<%SQLSTAT_CATEGORY%>"]);
  });

  it("suggests the whole family for a partial name", () => {
    const hits = suggestCategories("sqlstat");
    expect(hits).toContain("db_oracle_sqlstat");
    expect(hits).toContain("db_mysql_sqlstat");
  });

  it("corrects a typo in an ordinary category", () => {
    expect(suggestCategories("server_bas")).toContain("server_base");
  });

  it("returns nothing for a name with no resemblance", () => {
    expect(suggestCategories("totally_unknown_xyz")).toEqual([]);
    expect(suggestCategories("")).toEqual([]);
  });
});
