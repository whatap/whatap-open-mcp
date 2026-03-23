// src/utils/semantic.ts
// Result type classification for MXQL query responses.
// Derives semantic metadata from path naming conventions and catalog entry data.

export interface ResultSemantics {
  resultType:
    | "timeseries"
    | "snapshot"
    | "ranking"
    | "inventory"
    | "events"
    | "aggregate";
  entityLevel:
    | "agent"
    | "kind"
    | "node"
    | "project"
    | "endpoint"
    | "unknown";
  grain: string;
  timeBucket: string;
  rankingSafe: boolean;
  sort: string;
}

const ENTITY_LABELS: Record<string, string> = {
  agent: "agent",
  kind: "agent kind",
  node: "node",
  project: "project total",
  endpoint: "endpoint/path",
  unknown: "entity",
};

/** Strip surrounding quotes from field names (e.g., "'time'" → "time"). */
function normalizeFields(fields: string[]): string[] {
  return fields.map((f) => f.replace(/^['"]|['"]$/g, ""));
}

/**
 * Classify result type, entity level, grain, and time bucket
 * from MXQL path naming conventions and optional catalog metadata.
 */
export function classifyResultType(
  path: string,
  opts?: { selectFields?: string[]; rawMxql?: string }
): ResultSemantics {
  const filename = path.split("/").pop() ?? "";
  const normalized = opts?.selectFields ? normalizeFields(opts.selectFields) : [];
  const hasTimeField = normalized.includes("time");
  const hasGroupTime =
    opts?.rawMxql?.includes("timeunit:") ||
    opts?.rawMxql?.includes("GROUP") ||
    false;

  // --- Entity level from path suffix ---
  let entityLevel: ResultSemantics["entityLevel"] = "unknown";
  if (/_oid($|_)/.test(filename)) entityLevel = "agent";
  else if (/_okind($|_)/.test(filename)) entityLevel = "kind";
  else if (/_onode($|_)/.test(filename)) entityLevel = "node";
  else if (/_pcode($|_)/.test(filename)) entityLevel = "project";
  else if (/context|_path\b/.test(filename)) entityLevel = "endpoint";

  // Fallback: infer from selectFields
  if (entityLevel === "unknown" && normalized.length > 0) {
    if (normalized.includes("oname") || normalized.includes("oid")) {
      entityLevel = "agent";
    }
  }

  // --- Result type ---
  let resultType: ResultSemantics["resultType"];
  if (/top[n5_]|top\d/i.test(filename)) {
    resultType = "ranking";
  } else if (
    /agent_list|instance_list|agent_count|db_agent/i.test(filename)
  ) {
    resultType = "inventory";
  } else if (/event/i.test(filename)) {
    resultType = "events";
  } else if (/^stat_/i.test(filename)) {
    resultType = "aggregate";
  } else if (/act_tx|active_stat|pull_act/i.test(filename)) {
    resultType = "snapshot";
  } else if (hasTimeField || hasGroupTime) {
    resultType = "timeseries";
  } else {
    resultType = "snapshot";
  }

  // --- Time bucket ---
  let timeBucket = "5s";
  if (/_daily/i.test(filename)) timeBucket = "5m";
  else if (/_month/i.test(filename)) timeBucket = "1d";
  else if (/act_tx|active_stat/i.test(filename)) timeBucket = "15s";

  // --- Grain ---
  const eLabel = ENTITY_LABELS[entityLevel];
  let grain: string;
  if (resultType === "timeseries") grain = `${eLabel} x ${timeBucket} bucket`;
  else if (resultType === "ranking") grain = `${eLabel} ranked by metric`;
  else if (resultType === "inventory") grain = `one row per ${eLabel}`;
  else if (resultType === "events") grain = "one row per event";
  else if (resultType === "aggregate") grain = `${eLabel} aggregated`;
  else grain = `${eLabel} point-in-time`;

  // --- Sort and ranking safety ---
  let sort: string;
  let rankingSafe: boolean;
  if (resultType === "ranking") {
    sort = "metric desc";
    rankingSafe = true;
  } else if (resultType === "timeseries") {
    sort = "time asc (raw API order)";
    rankingSafe = false;
  } else if (resultType === "inventory") {
    sort = "agent order";
    rankingSafe = true;
  } else if (resultType === "events") {
    sort = "time desc";
    rankingSafe = true;
  } else {
    sort = "raw API order";
    rankingSafe = resultType === "snapshot";
  }

  return { resultType, entityLevel, grain, timeBucket, rankingSafe, sort };
}

/** Format a compact semantic header line for query output. */
export function formatSemanticHeader(
  sem: ResultSemantics,
  rows: { displayed: number; total: number }
): string {
  const parts = [
    `**Result**: ${sem.resultType}`,
    `**Grain**: ${sem.grain}`,
  ];
  const trunc = rows.displayed >= rows.total;
  // With server-side limit, displayed===total doesn't guarantee completeness
  parts.push(`**Rows**: ${rows.displayed}${trunc ? "+" : ""}`);
  if (!sem.rankingSafe) {
    parts.push(`**Sort**: ${sem.sort}`);
  }
  return parts.join(" | ");
}

/** Derive a "Best for" description from semantics. */
export function deriveBestFor(sem: ResultSemantics): string {
  const entity = ENTITY_LABELS[sem.entityLevel];
  switch (sem.resultType) {
    case "timeseries":
      return `Monitoring ${entity} metric trends over time`;
    case "snapshot":
      return `Checking current ${entity} status (point-in-time)`;
    case "ranking":
      return `Ranking ${entity}s by metric value`;
    case "inventory":
      return `Listing all ${entity}s with status`;
    case "events":
      return "Viewing recent events and alerts";
    case "aggregate":
      return `Viewing aggregated ${entity} statistics`;
  }
}

/** Generate a compact badge string for discovery listings. */
export function formatBadge(
  sem: ResultSemantics,
  opts?: { metrics?: string[]; filters?: string[] }
): string {
  const parts = [sem.resultType, `grain:${sem.grain}`];
  if (opts?.metrics && opts.metrics.length > 0) {
    parts.push(`metrics:${opts.metrics.join(",")}`);
  }
  if (opts?.filters && opts.filters.length > 0) {
    parts.push(`filters:${opts.filters.join(",")}`);
  }
  return `[${parts.join(" | ")}]`;
}
