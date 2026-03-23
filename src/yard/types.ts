// src/yard/types.ts
// Type definitions for the MXQL yard system.

export interface MqlMetadata {
  /** Raw .mql file content */
  raw: string;
  /** CATEGORY names found (e.g. ["server_base", "server_base{m5}"]) */
  categories: string[];
  /** $-prefixed parameters (e.g. ["$oid", "$okind", "$onode"]) */
  parameters: string[];
  /** HEADER type annotations (e.g. {"cpu": "P", "memory_pused": "P"}) */
  headerTypes: Record<string, string>;
  /** Fields in SELECT clauses */
  selectFields: string[];
  /** JOIN query paths (e.g. ["/v2/sys/dashboard/agent_cpu"]) */
  joins: string[];
  /** Comment lines (-- prefixed, Korean descriptions) */
  comments: string[];
  /** Data load type used in the query */
  loadType: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown";
}

export interface CatalogEntry {
  /** API path, e.g. "v2/sys/server_base" */
  path: string;
  /** Domain portion, e.g. "v2/sys" */
  domain: string;
  /** Description from comments */
  description: string;
  /** CATEGORY names (e.g. ["server_base", "server_base{m5}"]) */
  categories: string[];
  /** Base categories with modifiers stripped (e.g. ["server_base"]) */
  baseCategories: string[];
  /** $-prefixed parameters */
  parameters: string[];
  /** HEADER type annotations */
  headerTypes: Record<string, string>;
  /** Fields in SELECT clauses */
  selectFields: string[];
  /** JOIN query paths */
  joins: string[];
  /** Data load type */
  loadType: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown";
}

export interface DomainSummary {
  domain: string;
  count: number;
  description: string;
}
