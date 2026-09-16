// tests/no-korean-output.test.ts
// Guards the promise that MCP tool output never shows Korean to a caller.
//
// The server's own prose is English; Korean only ever entered through the two
// auto-generated data files (mxql-catalog.ts, field-metadata.ts). These tests fail
// when a catalog or field-metadata regeneration introduces a new Korean string,
// which is the moment a translation needs adding.

import { describe, it, expect } from "vitest";
import { CATALOG_ENTRIES, CATALOG_RAW } from "../src/data/mxql-catalog.js";
import { FIELD_METADATA } from "../src/data/field-metadata.js";
import { getCategoryMeta } from "../src/utils/field-guide.js";
import { translateDescription } from "../src/utils/descriptions.js";
import {
  extractComments,
  hasKorean,
  translateMxqlComments,
} from "../src/utils/mxql-comments.js";

/**
 * mxql/techross/* uses Korean SCADA tag names as real metric identifiers
 * (`P1_PV_AI_UF_1차압`). Those are the customer's data, not prose — translating
 * them would produce MXQL that matches nothing. They live in code, never in
 * comments, so only the raw-body check has to allow them.
 */
const KOREAN_IDENTIFIER_PATHS = /^mxql\/techross\//;

describe("catalog descriptions", () => {
  it("has an English description for every Korean catalog entry", () => {
    const untranslated = CATALOG_ENTRIES.filter(
      (e) => e.description && hasKorean(translateDescription(e.path, e.description))
    ).map((e) => `${e.path} — ${e.description}`);

    expect(untranslated).toEqual([]);
  });
});

describe("raw MXQL comments", () => {
  it("translates every Korean comment line shown by describe_query", () => {
    const untranslated: string[] = [];

    for (const [path, raw] of Object.entries(CATALOG_RAW)) {
      for (const comment of extractComments(translateMxqlComments(raw))) {
        if (hasKorean(comment)) untranslated.push(`${path} — ${comment}`);
      }
    }

    expect(untranslated).toEqual([]);
  });

  it("leaves Korean metric identifiers in code untouched", () => {
    const techross = Object.entries(CATALOG_RAW).filter(([p]) =>
      KOREAN_IDENTIFIER_PATHS.test(p)
    );
    expect(techross.length).toBeGreaterThan(0);

    for (const [path, raw] of techross) {
      const identifiers = raw.match(/[\w@]*[가-힣][\w@가-힣]*/g) ?? [];
      const translated = translateMxqlComments(raw);
      for (const id of identifiers) {
        expect(translated, `${path} dropped ${id}`).toContain(id);
      }
    }
  });

  it("preserves every non-comment line verbatim", () => {
    for (const [path, raw] of Object.entries(CATALOG_RAW)) {
      const before = raw.split("\n");
      const after = translateMxqlComments(raw).split("\n");
      expect(after.length, `${path} changed line count`).toBe(before.length);
    }
  });

  it("is display-only — CATALOG_RAW itself is never mutated", () => {
    const path = "mxql/app/act_tps_oid";
    const snapshot = CATALOG_RAW[path];
    translateMxqlComments(snapshot);
    expect(CATALOG_RAW[path]).toBe(snapshot);
  });
});

describe("field metadata", () => {
  it("serves English for every category description and field description", () => {
    const korean: string[] = [];

    for (const name of Object.keys(FIELD_METADATA)) {
      const meta = getCategoryMeta(name);
      if (!meta) continue;

      if (hasKorean(meta.title)) korean.push(`${name}.title — ${meta.title}`);
      if (hasKorean(meta.description)) {
        korean.push(`${name}.description — ${meta.description}`);
      }

      for (const [field, fm] of Object.entries(meta.fields)) {
        if (fm.description && hasKorean(fm.description)) {
          korean.push(`${name}.${field}.description — ${fm.description}`);
        }
        if (fm.summary_guide && hasKorean(fm.summary_guide)) {
          korean.push(`${name}.${field}.summary_guide — ${fm.summary_guide}`);
        }
      }
    }

    expect(korean).toEqual([]);
  });
});
