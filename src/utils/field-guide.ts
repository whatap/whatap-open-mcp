// src/utils/field-guide.ts
// Runtime lookup and enrichment builders for category field metadata.
// Uses the auto-generated FIELD_METADATA from build-time YAML processing.

import {
  FIELD_METADATA,
  type CategoryMeta,
  type FieldMeta,
} from "../data/field-metadata.js";

// ── Lookup ───────────────────────────────────────────────────────

let _map: Map<string, CategoryMeta> | null = null;

function getMap(): Map<string, CategoryMeta> {
  if (!_map) {
    _map = new Map(Object.entries(FIELD_METADATA));
  }
  return _map;
}

export function getCategoryMeta(category: string): CategoryMeta | undefined {
  return getMap().get(category);
}

export function getFieldMeta(
  category: string,
  field: string
): FieldMeta | undefined {
  return getMap().get(category)?.fields[field];
}

// ── Field Guide Table ────────────────────────────────────────────

const MAX_GUIDE_FIELDS = 8;

/**
 * Build a compact Field Guide table for the given fields.
 * Only includes fields that have metadata (description or normal_operation).
 */
export function buildFieldGuide(
  category: string,
  fields: string[]
): string | null {
  const cat = getCategoryMeta(category);
  if (!cat) return null;

  // Prioritize fields with descriptions, then normal_operation
  const entries: Array<{
    name: string;
    desc: string;
    range: string;
  }> = [];

  for (const field of fields) {
    if (entries.length >= MAX_GUIDE_FIELDS) break;
    const fm = cat.fields[field];
    if (!fm) continue;
    if (!fm.description && !fm.normal_operation) continue;

    let range = "—";
    if (fm.normal_operation) {
      const parts: string[] = [];
      if (fm.normal_operation.min !== undefined && fm.normal_operation.max !== undefined) {
        parts.push(`${fm.normal_operation.min}–${fm.normal_operation.max}`);
      }
      if (fm.normal_operation.recommended) {
        parts.push(`rec. ${fm.normal_operation.recommended}`);
      }
      if (parts.length > 0) range = parts.join(", ");
    }

    entries.push({
      name: field,
      desc: fm.description ?? fm.summary_guide.slice(0, 60) + "…",
      range,
    });
  }

  if (entries.length === 0) return null;

  const lines = [
    `### Field Guide`,
    "",
    "| Field | Description | Normal Range |",
    "| --- | --- | --- |",
  ];
  for (const e of entries) {
    lines.push(`| ${e.name} | ${e.desc} | ${e.range} |`);
  }
  return lines.join("\n");
}

// ── Threshold Alerts ─────────────────────────────────────────────

const MAX_ALERTS = 3;

/** Parse a recommended string like "<=70" into { op, value }. */
function parseThreshold(
  rec: string
): { op: "<=" | "<"; value: number } | null {
  const match = rec.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const op = match[1] as "<=" | "<";
  if (op !== "<=" && op !== "<") return null;
  return { op, value: parseFloat(match[2]) };
}

/**
 * Check summary stats against normal_operation thresholds.
 * Returns alert strings for fields exceeding recommended values.
 */
export function buildThresholdAlerts(
  category: string,
  stats: Record<string, { max: number; avg: number }>
): string[] {
  const cat = getCategoryMeta(category);
  if (!cat) return [];

  const alerts: string[] = [];

  for (const [field, { max, avg }] of Object.entries(stats)) {
    if (alerts.length >= MAX_ALERTS) break;
    const fm = cat.fields[field];
    if (!fm?.normal_operation?.recommended) continue;

    const thresh = parseThreshold(fm.normal_operation.recommended);
    if (!thresh) continue;

    const exceeds =
      thresh.op === "<="
        ? max > thresh.value
        : max >= thresh.value;

    if (exceeds) {
      alerts.push(
        `> **${field}**: max ${max.toFixed(1)} exceeds recommended ${fm.normal_operation.recommended}`
      );
    }
  }

  return alerts;
}

// ── Summary Guidance ─────────────────────────────────────────────

const MAX_GUIDANCE = 3;
const MAX_GUIDANCE_CHARS = 300;

/**
 * Build deduplicated LLM summary guidance from field summary_guides.
 * Returns a compact analysis hint block.
 */
export function buildSummaryGuidance(
  category: string,
  fields: string[]
): string | null {
  const cat = getCategoryMeta(category);
  if (!cat) return null;

  const seen = new Set<string>();
  const guides: string[] = [];

  for (const field of fields) {
    if (guides.length >= MAX_GUIDANCE) break;
    const fm = cat.fields[field];
    if (!fm?.summary_guide) continue;

    // Deduplicate identical guides (many fields share the same text)
    const key = fm.summary_guide.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);

    guides.push(fm.summary_guide);
  }

  if (guides.length === 0) return null;

  // Join and truncate
  let text = guides.join(" ");
  if (text.length > MAX_GUIDANCE_CHARS) {
    text = text.slice(0, MAX_GUIDANCE_CHARS).replace(/\s\S*$/, "") + "…";
  }

  return `**How to analyze**: ${text}`;
}
