// src/utils/descriptions.ts
// Shared Zod .describe() constants reused across all tool files.

export const PARAM_PROJECT_CODE =
  "Project code (pcode). " +
  "Get this by calling whatap_list_projects first — " +
  "it returns all accessible projects with their pcodes.";

export const PARAM_TIME_RANGE =
  'Time range to query. ' +
  'Examples: "5m", "1h", "6h", "1d", "7d", "last 30 minutes". ' +
  'Shorter ranges are faster. Start with "5m" for recent data.';

export const PARAM_TIME_RANGE_OPTIONAL =
  'Time range (default: "5m"). ' +
  'Examples: "5m", "1h", "6h", "1d", "last 30 minutes".';

export const PARAM_MXQL_PATH =
  'MXQL query path from the yard (e.g., "v2/sys/server_base", "v2/app/tps_pcode"). ' +
  "Discover paths with whatap_data_availability.";

export const PARAM_SENSITIVITY =
  "Anomaly detection sensitivity: " +
  '"low" = only major issues (3σ threshold), ' +
  '"medium" = balanced (2σ, default), ' +
  '"high" = catch subtle issues (1.5σ).';

// ── MXQL Parameter Registry ─────────────────────────────────────
// Maps $-prefixed MXQL parameters to descriptions and kind labels.
// kind: "auto" = handled by tool, "filter" = optional user filter, "query" = query-specific

export const MXQL_PARAM_REGISTRY: Record<
  string,
  { desc: string; kind: "auto" | "filter" | "query" }
> = {
  // Auto-set by tool — user doesn't need to provide
  $etime: { desc: "End time (Unix ms) — auto-set by timeRange", kind: "auto" },
  $stime: { desc: "Start time (Unix ms) — auto-set by timeRange", kind: "auto" },
  $duration: { desc: "Query duration — auto-set by timeRange", kind: "auto" },
  $pcode: { desc: "Project code — auto-set from projectCode", kind: "auto" },
  $s_default: { desc: "Default stat aggregation — auto-set", kind: "auto" },
  $limit: { desc: "Row limit — auto-set from limit parameter", kind: "auto" },

  // Optional filters — pass via params
  $oid: {
    desc: "Agent object ID — filter to a specific agent (get from whatap_list_agents)",
    kind: "filter",
  },
  $okind: {
    desc: "Agent kind — filter by application group name",
    kind: "filter",
  },
  $onode: {
    desc: "Agent node — filter by host/node group",
    kind: "filter",
  },
  $okindName: { desc: "Agent kind display name filter", kind: "filter" },
  $onodeName: { desc: "Agent node display name filter", kind: "filter" },
  $category: { desc: "MXQL category name filter", kind: "filter" },

  // Query-specific
  $groupby: { desc: "Group-by field list for aggregation", kind: "query" },
  $orderby: { desc: "Order-by field for sorting", kind: "query" },
  $avg: { desc: "Include average in aggregation", kind: "query" },
  $max: { desc: "Include max in aggregation", kind: "query" },
  $sum: { desc: "Include sum in aggregation", kind: "query" },
};

// Short unit suffixes for column header annotation
export const HEADER_UNIT_SUFFIX: Record<string, string> = {
  P: "%",
  ms: "ms",
  B: "bytes",
};

// ── English Description Overlay ──────────────────────────────────
// Translates Korean .mql comment descriptions to English.
// Used by describe_mxql and data_availability to serve English-speaking LLMs.

export const ENGLISH_DESCRIPTIONS: Record<string, string> = {
  // --- app (legacy APM) ---
  "app/act_tps_oid": "Active TX count per agent by tier + total TPS, last 15s",
  "app/act_tx/act_tx_oid": "Active TX count per agent by tier, last 15s",
  "app/act_tx/agent_with_tx": "Active TX count per agent by tier, including INACTIVE agents, last 15s",
  "app/act_tx_oid": "Active TX count per agent by tier, last 15s",
  "app/act_tx_okind": "Active TX count per agent kind by tier, last 15s",
  "app/act_tx_pcode": "Active TX count project total by tier, last 15s",
  "app/active_stat_oid": "Active TX count per agent by status, last 15s",
  "app/active_stat_okind": "Active TX count per agent kind by status, last 15s",
  "app/active_stat_pcode": "Active TX count project total by status, last 15s",
  "app/apdex_okind": "Apdex score per agent kind, 5s interval",
  "app/apdex_pcode": "Apdex score project total, 5s interval",
  "app/con_user_oid": "Concurrent users per agent",
  "app/con_user_okind": "Concurrent users per agent kind",
  "app/con_user_okind_daily": "Concurrent users per agent kind, daily, 5m interval",
  "app/con_user_pcode": "Concurrent users project total, 5s interval",
  "app/con_user_pcode_daily": "Concurrent users project total, daily, 5m interval",
  "app/cpu_oid": "Host CPU % per agent, 5s interval",
  "app/dbnum_oid": "DB connection count per agent, every 5s",
  "app/gc_oid": "GC time and count per agent, including OldGen GC",
  "app/heap_oid": "Heap memory usage (bytes) per agent",
  "app/pull_act_tx_list": "Pull active transaction list from each agent",
  "app/resp_time_oid": "Response time per agent",
  "app/resp_time_okind": "Response time per agent kind",
  "app/resp_time_pcode": "Response time project total",
  "app/resp_time_pcode_daily": "TPS project total daily, 5m interval",
  "app/resp_time_pcode_month": "TPS project total monthly, 5m interval",
  "app/speed": "Speed chart data (arrival_rate or tx_count fallback for java2.0_23 and below)",
  "app/stat_error_pcode": "Transaction error statistics",
  "app/stat_httpc_pcode": "External HTTP call statistics",
  "app/stat_sql_pcode": "SQL query statistics",
  "app/stat_tx_pcode": "Transaction statistics",
  "app/tps_last_pcode": "TPS project total, 5s interval",
  "app/tps_oid": "TPS per agent, 5s interval",
  "app/tps_okind": "TPS per agent kind, 5s interval",
  "app/tps_pcode": "TPS project total, 5s interval",
  "app/tps_pcode_daily": "TPS project total daily, 5m interval",
  "app/tps_pcode_month": "TPS project total monthly, 5m interval",
  "app/tps_topn": "Top-N TPS per agent kind, daily, 5m interval",
  "app/visitor_pcode_month": "Concurrent users project total, daily/monthly, 5m interval",

  // --- cpm (container perf monitoring) ---
  "cpm/apiserver_get_request_count_per_min": "CPU millicore count per OID",
  "cpm/container_app_cpu_quota_okind": "CPU millicore count per OKIND",
  "cpm/container_app_cpu_quota_onode": "CPU millicore count per ONODE",
  "cpm/container_app_cpu_quota_pcode": "CPU millicore count project total",

  // --- flexboard ---
  "flexboard/app_gc": "GC time and count per agent, including OldGen GC",
  "flexboard/app_heap": "Heap memory usage per agent",

  // --- ha (high availability) ---
  "ha/EDB-12_state": "EDB-12 state metrics per agent",
  "ha/cluster_dep": "Cluster dependency (returns all columns)",
  "v2/ha/cluster_dep": "Cluster dependency (returns all columns)",

  // --- redis ---
  "redis/alert_event": "Alert events (use config, not settings)",
  "redis/parameter_oid": "Redis parameters per agent (use config, not settings)",

  // --- sap_ase ---
  "sap_ase/parameter_oid_range": "Agent count summary",

  // --- sys (legacy server) ---
  "sys/agent_cpu": "Agent CPU & memory, last 15s",
  "sys/agent_inact": "Inactive agent list",
  "sys/agent_list": "Agent list with status, CPU & memory",
  "sys/agent_list_ex": "Agent list with status, CPU & memory (extended)",
  "sys/agent_list_simple": "Agent list with status, CPU & memory (simple)",
  "sys/cpu_core_perf": "CPU per-core performance, last 15s",
  "sys/cpu_oid": "Agent CPU & memory, last 15s",

  // --- techross ---
  "techross/dev/series": "Active TX count per agent by tier, last 11s",

  // --- v2/app (APM v2) ---
  "v2/app/act_tx/agent_with_tx": "Active TX count per context, last 15s",
  "v2/app/act_tx_ext_oid": "Active TX count per agent by tier, including INACTIVE agents, last 15s",
  "v2/app/act_tx_oid": "Active TX count per agent by tier, last 15s",
  "v2/app/act_tx_okind": "Active TX count per agent kind by tier, last 15s",
  "v2/app/active_stat_oid": "Active TX count per agent by status, last 15s",
  "v2/app/active_stat_okind": "Active TX count per agent kind by status, last 15s",
  "v2/app/apdex_okind": "Apdex score per agent kind, 5s interval",
  "v2/app/apdex_pcode": "Apdex score project total, 5s interval",
  "v2/app/app_gc": "GC time and count per agent, including OldGen GC",
  "v2/app/app_heap": "Heap memory usage per agent",
  "v2/app/con_user_okind": "Concurrent users per agent kind",
  "v2/app/con_user_okind_daily": "Concurrent users per agent kind, daily, 5m interval",
  "v2/app/con_user_pcode": "Concurrent users project total, 5s interval",
  "v2/app/con_user_pcode_daily": "Concurrent users project total, daily, 5m interval",
  "v2/app/dashboard/speed": "Response time per context",
  "v2/app/resp_time_oid": "Response time per agent",
  "v2/app/resp_time_okind": "Response time per agent kind",
  "v2/app/resp_time_pcode": "Response time project total",
  "v2/app/resp_time_pcode_daily": "TPS project total daily, 5m interval",
  "v2/app/speed": "TPS per context, 5s interval",
  "v2/app/tps_oid": "TPS per agent, 5s interval",
  "v2/app/tps_okind": "TPS per agent kind, 5s interval",
  "v2/app/tps_pcode": "TPS project total, 5s interval",
  "v2/app/tps_pcode_daily": "TPS project total daily, 5m interval",
  "v2/app/tx_error_oid": "APM agent count per okind in container",

  // --- v2/container ---
  "v2/container/container_app_counts_onode": "APM agent count per onode in container",
  "v2/container/container_app_counts_pcode": "APM agent count total in container",
  "v2/container/container_app_cpu_quota_oid": "CPU millicore count per OID",
  "v2/container/container_app_cpu_quota_oid_sum": "CPU millicore count per OID (sum)",
  "v2/container/container_app_cpu_quota_okind": "CPU millicore count per OKIND",
  "v2/container/container_app_cpu_quota_okind_sum": "CPU millicore count per OKIND (sum)",
  "v2/container/container_app_cpu_quota_onode": "CPU millicore count per ONODE",
  "v2/container/container_app_cpu_quota_onode_sum": "CPU millicore count per ONODE (sum)",
  "v2/container/container_app_cpu_quota_pcode": "CPU millicore count project total",
  "v2/container/container_app_state": "APM agent state per OID over time",
  "v2/container/container_cpu_top5": "Agent list with status (top 5 CPU)",

  // --- v2/logs ---
  "v2/logs/logsink_aggr": "Log sink aggregation with agent status",

  // --- missed entries from audit ---
  "app/act_tx_ext_oid": "Active TX count per agent by tier, including INACTIVE agents, last 15s",
  "app/visitor_okind_month": "Concurrent users per agent kind, daily/monthly, 5m interval",
  "cpm/container_app_cpu_quota_oid": "CPU millicore count per OID",
  "flexboard/tps_monthly": "TPS project total monthly, 5m interval",
  "ha/cluster_info": "Cluster info (returns all columns)",
  "redis/config": "Redis config parameters (use config, not settings)",
  "sys/agent_count": "Agent count summary",
  "sys/cpu_load": "CPU load average, last 15s",
  "sys/mem_oid_last": "Agent memory usage, last 15s",
  "v2/app/act_tx/act_tx_oid": "Active TX count per agent by tier, last 11s",
  "v2/app/act_tx_context": "Active TX count per context/endpoint, last 15s",
  "v2/app/con_user_oid": "Concurrent users per agent",
  "v2/app/resp_time_context": "Response time per context/endpoint",
  "v2/app/tps_context": "TPS per context/endpoint, 5s interval",
  "v2/container/container_app_counts_okind": "APM agent count per okind in container",
  "v2/db/db_agent_list": "Database agent list with status",

  // --- v2/db: long session counts (all duration thresholds in SECONDS) ---
  "v2/db/db_mssql_long_active_session_count": "Long-running active session count per MSSQL instance. L1-L4 = session counts by duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: elapse_time (seconds)",
  "v2/db/db_mssql_long_waiting_session_count": "Long-waiting (lock-blocked) session count per MSSQL instance. L1-L4 = session counts by wait duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: elapse_time (seconds)",
  "v2/db/db_mysql_long_active_session_count": "Long-running active session count per MySQL instance. L1-L4 = session counts by duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: time1 (seconds)",
  "v2/db/db_mysql_long_waiting_session_count": "Long-waiting (lock-blocked) session count per MySQL instance. L1-L4 = session counts by wait duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: time1 (seconds)",
  "v2/db/db_oracle_long_active_session_count": "Long-running active session count per Oracle instance. L1-L4 = session counts by duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: last_call_et (seconds)",
  "v2/db/db_oracle_long_waiting_session_count": "Long-waiting (lock-blocked) session count per Oracle instance. L1-L4 = session counts by wait duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: last_call_et (seconds)",
  "v2/db/db_oracle_dma_long_active_session_count": "Long-running active session count per Oracle DMA instance. L1-L4 = session counts by duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: last_call_et (seconds)",
  "v2/db/db_oracle_dma_long_waiting_session_count": "Long-waiting (lock-blocked) session count per Oracle DMA instance. L1-L4 = session counts by wait duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: last_call_et (seconds)",
  "v2/db/db_postgresql_long_active_session_count": "Long-running active session count per PostgreSQL instance. L1-L4 = session counts by duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: runtime (seconds)",
  "v2/db/db_postgresql_long_waiting_session_count": "Long-waiting (lock-blocked) session count per PostgreSQL instance. L1-L4 = session counts by wait duration threshold (in SECONDS): L1 <3s, L2 3-10s, L3 10-15s, L4 ≥15s. Duration field: runtime (seconds)",

  "v2/ha/cluster_info": "Cluster info (returns all columns)",
  "v2/sys/active_agent_list": "Active agent list with status, CPU & memory",
  "v2/sys/cpu_load": "CPU load average, last 15s",

  // --- v2/sys ---
  "v2/sys/agent_count": "Agent count summary",
  "v2/sys/agent_list": "Agent list with status, CPU & memory",
  "v2/sys/agent_list_subtype": "Agent CPU & memory by subtype, last 15s",
  "v2/sys/dashboard/agent_cpu": "Agent CPU & memory, last 15s",
  "v2/sys/dashboard/agent_list": "Agent list with status, CPU & memory",
};

/** Returns English description if available, otherwise the original. */
export function translateDescription(
  path: string,
  original: string
): string {
  return ENGLISH_DESCRIPTIONS[path] ?? original;
}
