// src/utils/mxql-comments.ts
// Translates the Korean comment lines inside raw MXQL to English for display.
//
// This is DISPLAY-ONLY. whatap_query_data sends CATALOG_RAW to the server's text
// endpoint verbatim (src/tools/yard.ts), so the stored MXQL must stay byte-identical
// to the yard source. Only whatap_describe_query, which shows the query to a human
// or an LLM, runs its copy through here.
//
// Why this is comment-aware rather than a line-level find/replace: mxql/techross/*
// uses Korean SCADA tag names as real field identifiers (`P1_PV_AI_UF_1차압`,
// `204A_PV_AI_UF_AB생산량`). Those are data, not prose — rewriting them would
// produce MXQL that does not match the customer's metrics.

import { MXQL_COMMENT_TRANSLATIONS } from "../data/mxql-comment-translations.js";

const HANGUL = /[가-힣]/;

export function hasKorean(text: string): boolean {
  return HANGUL.test(text);
}

/** Look up a single comment line's translation. Returns null when untranslated. */
export function translateCommentLine(text: string): string | null {
  return MXQL_COMMENT_TRANSLATIONS[text.trim()] ?? null;
}

/** Translate a comment line, falling back to the original when unmapped. */
export function translateComment(text: string): string {
  return translateCommentLine(text) ?? text;
}

/**
 * Collect the trimmed text of every comment line in raw MXQL.
 *
 * Shares its comment-span logic with translateMxqlComments(), so a regression
 * test can assert "no comment still contains Korean" over exactly the spans the
 * translator is able to rewrite.
 */
export function extractComments(raw: string): string[] {
  if (!raw) return [];

  const found: string[] = [];
  let inBlock = false;

  const collect = (segment: string): void => {
    for (const line of segment.split("\n")) {
      const t = line.trim();
      if (t) found.push(t);
    }
  };

  for (const line of raw.split("\n")) {
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        collect(line);
      } else {
        inBlock = false;
        collect(line.slice(0, end));
      }
      continue;
    }

    const start = findCommentStart(line);
    if (!start) continue;

    const rest = line.slice(start.index + start.marker.length);
    if (start.marker === "/*") {
      const end = rest.indexOf("*/");
      if (end === -1) {
        inBlock = true;
        collect(rest);
      } else {
        collect(rest.slice(0, end));
      }
    } else {
      collect(rest);
    }
  }

  return found;
}

/**
 * Rewrite the comment text inside raw MXQL, leaving code untouched.
 *
 * Handles the three comment forms the yard uses: `--` to end of line, `#` to end
 * of line, and `/* ... *\/` blocks whose continuation lines carry no marker.
 * Markers inside single- or double-quoted strings are ignored so a quoted `#`
 * cannot swallow the rest of a line.
 */
export function translateMxqlComments(raw: string): string {
  if (!raw) return raw;

  const out: string[] = [];
  let inBlock = false;

  for (const line of raw.split("\n")) {
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        out.push(rewriteSegment(line, ""));
      } else {
        inBlock = false;
        out.push(rewriteSegment(line.slice(0, end), line.slice(end)));
      }
      continue;
    }

    const start = findCommentStart(line);
    if (!start) {
      out.push(line);
      continue;
    }

    const code = line.slice(0, start.index + start.marker.length);
    const rest = line.slice(start.index + start.marker.length);

    if (start.marker === "/*") {
      const end = rest.indexOf("*/");
      if (end === -1) {
        inBlock = true;
        out.push(code + rewriteSegment(rest, ""));
      } else {
        out.push(code + rewriteSegment(rest.slice(0, end), rest.slice(end)));
      }
    } else {
      out.push(code + rewriteSegment(rest, ""));
    }
  }

  return out.join("\n");
}

/** Replace `body` with its translation, preserving surrounding whitespace and any tail. */
function rewriteSegment(body: string, tail: string): string {
  const trimmed = body.trim();
  if (!trimmed) return body + tail;

  const translated = MXQL_COMMENT_TRANSLATIONS[trimmed];
  if (!translated) return body + tail;

  const lead = body.slice(0, body.indexOf(trimmed[0]));
  const trailStart = lead.length + trimmed.length;
  return lead + translated + body.slice(trailStart) + tail;
}

/** First comment marker on the line that is not inside a quoted string. */
function findCommentStart(
  line: string
): { index: number; marker: "--" | "#" | "/*" } | null {
  let quote: string | null = null;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === "/" && line[i + 1] === "*") return { index: i, marker: "/*" };
    if (c === "-" && line[i + 1] === "-") return { index: i, marker: "--" };
    if (c === "#") return { index: i, marker: "#" };
  }

  return null;
}
