// Static MXQL category and field metadata registry.
// Source of truth: docs/mxql-reference.md (live-tested fields).
//
// Each category defines:
//   - tags: dimension fields used for grouping/filtering (oid, oname, etc.)
//   - fields: metric values that can be aggregated (cpu, tps, etc.)
//
// Future: if WhaTap exposes a "list categories" API, this can be replaced
// with a dynamic fetch while keeping the same interface.

export type Domain =
  | "server"
  | "apm"
  | "kubernetes"
  | "database"
  | "log"
  | "alert";

export type FieldKind = "tag" | "field";

export interface FieldMeta {
  name: string;
  type: "number" | "string";
  description: string;
  kind: FieldKind;
}

export interface CategoryMeta {
  name: string;
  domain: Domain;
  description: string;
  platforms: string[];
  fields: FieldMeta[];
  exampleMxql: string;
}

// ---------------------------------------------------------------------------
// Platform constants
// ---------------------------------------------------------------------------

const APM_PLATFORMS = ["JAVA", "NODEJS", "PYTHON", "PHP", "DOTNET", "GO"];
const SERVER_PLATFORMS = ["SERVER", "KUBERNETES"];
const DB_PLATFORMS = ["POSTGRESQL", "ORACLE", "MYSQL", "MSSQL"];
const ALL_PLATFORMS = [
  ...APM_PLATFORMS,
  ...SERVER_PLATFORMS,
  ...DB_PLATFORMS,
];

// ---------------------------------------------------------------------------
// Category registry
// ---------------------------------------------------------------------------

export const CATEGORY_REGISTRY: CategoryMeta[] = [
  // --- Server / Infrastructure ---
  {
    name: "server_base",
    domain: "server",
    description: "Server-level metrics including CPU, memory, and load averages",
    platforms: SERVER_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Agent/server name", kind: "tag" },
      { name: "onodeName", type: "string", description: "Kubernetes node name (K8s projects only)", kind: "tag" },
      { name: "cpu", type: "number", description: "Total CPU usage (%)", kind: "field" },
      { name: "cpu_usr", type: "number", description: "User-space CPU (%)", kind: "field" },
      { name: "cpu_sys", type: "number", description: "System CPU (%)", kind: "field" },
      { name: "cpu_idle", type: "number", description: "Idle CPU (%)", kind: "field" },
      { name: "cpu_load1", type: "number", description: "1-minute load average", kind: "field" },
      { name: "cpu_load5", type: "number", description: "5-minute load average", kind: "field" },
      { name: "cpu_load15", type: "number", description: "15-minute load average", kind: "field" },
      { name: "memory_pused", type: "number", description: "Memory usage (%)", kind: "field" },
      { name: "memory_used", type: "number", description: "Memory used (bytes)", kind: "field" },
      { name: "memory_total", type: "number", description: "Memory total (bytes)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu, memory_pused, cpu_load1]",
  },
  {
    name: "server_disk",
    domain: "server",
    description: "Disk I/O and usage per mount point",
    platforms: SERVER_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Agent/server name", kind: "tag" },
      { name: "mountPoint", type: "string", description: "Mount point path", kind: "tag" },
      { name: "fileSystem", type: "string", description: "Filesystem type", kind: "tag" },
      { name: "readIops", type: "number", description: "Read IOPS", kind: "field" },
      { name: "writeIops", type: "number", description: "Write IOPS", kind: "field" },
      { name: "blkSize", type: "number", description: "Block size", kind: "field" },
      { name: "usedPercent", type: "number", description: "Disk usage (%)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY server_disk\nTAGLOAD\nSELECT [oid, oname, mountPoint, usedPercent, readIops, writeIops]",
  },
  {
    name: "server_network",
    domain: "server",
    description: "Network interface I/O metrics",
    platforms: SERVER_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Agent/server name", kind: "tag" },
      { name: "desc", type: "string", description: "Network interface name", kind: "tag" },
      { name: "in", type: "number", description: "Bytes received per second", kind: "field" },
      { name: "out", type: "number", description: "Bytes sent per second", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY server_network\nTAGLOAD\nSELECT [oid, oname, desc, in, out]",
  },
  {
    name: "server_process",
    domain: "server",
    description: "Process-level CPU and memory usage",
    platforms: SERVER_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Agent/server name", kind: "tag" },
      { name: "pid", type: "number", description: "Process ID", kind: "tag" },
      { name: "name", type: "string", description: "Process name", kind: "tag" },
      { name: "cpu", type: "number", description: "Process CPU usage (%)", kind: "field" },
      { name: "rss", type: "number", description: "Resident set size (bytes)", kind: "field" },
      { name: "memory", type: "number", description: "Memory usage (%)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY server_process\nTAGLOAD\nSELECT [oid, oname, pid, name, cpu, rss, memory]",
  },

  // --- APM ---
  {
    name: "app_counter",
    domain: "apm",
    description: "Application performance counters (TPS, response time, errors, APDEX)",
    platforms: APM_PLATFORMS,
    fields: [
      { name: "pcode", type: "number", description: "Project code", kind: "tag" },
      { name: "pname", type: "string", description: "Project name", kind: "tag" },
      { name: "tps", type: "number", description: "Transactions per second", kind: "field" },
      { name: "tx_time", type: "number", description: "Average transaction time (ms)", kind: "field" },
      { name: "tx_count", type: "number", description: "Transaction count", kind: "field" },
      { name: "tx_error", type: "number", description: "Transaction error count", kind: "field" },
      { name: "apdex_satisfied", type: "number", description: "APDEX satisfied count", kind: "field" },
      { name: "apdex_tolerated", type: "number", description: "APDEX tolerated count", kind: "field" },
      { name: "apdex_total", type: "number", description: "APDEX total count", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, tps, tx_time, tx_error]",
  },
  {
    name: "app_active_stat",
    domain: "apm",
    description: "Currently active (in-flight) transactions by duration bucket",
    platforms: APM_PLATFORMS,
    fields: [
      { name: "pcode", type: "number", description: "Project code", kind: "tag" },
      { name: "pname", type: "string", description: "Project name", kind: "tag" },
      { name: "active_tx_count", type: "number", description: "Total active transactions", kind: "field" },
      { name: "active_tx_0", type: "number", description: "Active < 3 seconds", kind: "field" },
      { name: "active_tx_3", type: "number", description: "Active 3-8 seconds", kind: "field" },
      { name: "active_tx_8", type: "number", description: "Active > 8 seconds", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY app_active_stat\nTAGLOAD\nSELECT [pcode, pname, active_tx_count, active_tx_0, active_tx_3, active_tx_8]",
  },

  // --- Kubernetes ---
  {
    name: "kube_pod_stat",
    domain: "kubernetes",
    description: "Kubernetes pod status, restart counts, and container info",
    platforms: ["KUBERNETES"],
    fields: [
      { name: "podName", type: "string", description: "Pod name", kind: "tag" },
      { name: "namespace", type: "string", description: "Kubernetes namespace", kind: "tag" },
      { name: "nodeName", type: "string", description: "Node the pod runs on", kind: "tag" },
      { name: "podStatus", type: "string", description: "Pod status (Running, Pending, etc.)", kind: "field" },
      { name: "containerCount", type: "number", description: "Number of containers", kind: "field" },
      { name: "restartCount", type: "number", description: "Total restart count", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY kube_pod_stat\nTAGLOAD\nSELECT [podName, podStatus, namespace, nodeName, restartCount]",
  },
  {
    name: "kube_container_stat",
    domain: "kubernetes",
    description: "Kubernetes container CPU and memory usage",
    platforms: ["KUBERNETES"],
    fields: [
      { name: "containerName", type: "string", description: "Container name", kind: "tag" },
      { name: "podName", type: "string", description: "Parent pod name", kind: "tag" },
      { name: "namespace", type: "string", description: "Kubernetes namespace", kind: "tag" },
      { name: "cpu_usage", type: "number", description: "Container CPU usage", kind: "field" },
      { name: "mem_usage", type: "number", description: "Container memory usage", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY kube_container_stat\nTAGLOAD\nSELECT [containerName, podName, namespace, cpu_usage, mem_usage]",
  },
  {
    name: "kube_event",
    domain: "kubernetes",
    description: "Kubernetes cluster events (Normal, Warning)",
    platforms: ["KUBERNETES"],
    fields: [
      { name: "type", type: "string", description: "Event type (Normal, Warning)", kind: "tag" },
      { name: "reason", type: "string", description: "Event reason", kind: "tag" },
      { name: "namespace", type: "string", description: "Namespace", kind: "tag" },
      { name: "name", type: "string", description: "Object name", kind: "tag" },
      { name: "kind", type: "string", description: "Object kind (Pod, Node, etc.)", kind: "tag" },
      { name: "oname", type: "string", description: "Agent name", kind: "tag" },
      { name: "message", type: "string", description: "Event message", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY kube_event\nTAGLOAD\nSELECT [type, reason, message, namespace, name, kind]",
  },

  // --- Database ---
  {
    name: "db_counter",
    domain: "database",
    description: "Database instance performance counters",
    platforms: DB_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Instance name", kind: "tag" },
      { name: "active_sessions", type: "number", description: "Active session count", kind: "field" },
      { name: "lock_wait", type: "number", description: "Lock wait count", kind: "field" },
      { name: "long_running", type: "number", description: "Long-running query count", kind: "field" },
      { name: "cpu", type: "number", description: "CPU usage (%)", kind: "field" },
      { name: "memory", type: "number", description: "Memory usage (%)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY db_counter\nTAGLOAD\nSELECT [oid, oname, active_sessions, lock_wait, cpu, memory]",
  },
  {
    name: "db_active_session",
    domain: "database",
    description: "Active database sessions with SQL and wait event details",
    platforms: DB_PLATFORMS,
    fields: [
      { name: "oid", type: "number", description: "Agent object ID", kind: "tag" },
      { name: "oname", type: "string", description: "Instance name", kind: "tag" },
      { name: "sid", type: "number", description: "Session ID", kind: "tag" },
      { name: "serial", type: "number", description: "Serial number", kind: "tag" },
      { name: "user", type: "string", description: "Database user", kind: "tag" },
      { name: "sql_text", type: "string", description: "SQL statement text", kind: "field" },
      { name: "status", type: "string", description: "Session status", kind: "field" },
      { name: "wait_event", type: "string", description: "Current wait event", kind: "field" },
      { name: "elapsed_time", type: "number", description: "Elapsed time (ms)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY db_active_session\nTAGLOAD\nSELECT [oid, oname, sid, user, sql_text, wait_event, elapsed_time]",
  },
  {
    name: "db_wait_event",
    domain: "database",
    description: "Wait event analysis (Oracle-specific)",
    platforms: ["ORACLE"],
    fields: [
      { name: "wait_class", type: "string", description: "Wait class category", kind: "tag" },
      { name: "wait_event", type: "string", description: "Specific wait event", kind: "tag" },
      { name: "total_waits", type: "number", description: "Total wait count", kind: "field" },
      { name: "time_waited", type: "number", description: "Total time waited (ms)", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY db_wait_event\nTAGLOAD\nSELECT [wait_class, wait_event, total_waits, time_waited]\nORDER {key:[time_waited], sort:[desc]}",
  },

  // --- Log ---
  {
    name: "app_log",
    domain: "log",
    description: "Application log entries with content search",
    platforms: [...APM_PLATFORMS, ...SERVER_PLATFORMS],
    fields: [
      { name: "time", type: "number", description: "Timestamp (Unix ms)", kind: "tag" },
      { name: "oname", type: "string", description: "Agent name", kind: "tag" },
      { name: "category", type: "string", description: "Log category", kind: "tag" },
      { name: "content", type: "string", description: "Log message content", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY app_log\nTAGLOAD\nSELECT [time, content, oname, category]\nORDER {key:[time], sort:[desc]}",
  },
  {
    name: "app_log_count",
    domain: "log",
    description: "Log volume statistics over time",
    platforms: [...APM_PLATFORMS, ...SERVER_PLATFORMS],
    fields: [
      { name: "time", type: "number", description: "Timestamp (Unix ms)", kind: "tag" },
      { name: "category", type: "string", description: "Log category", kind: "tag" },
      { name: "count", type: "number", description: "Log entry count", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY app_log_count\nTAGLOAD\nSELECT [time, count, category]",
  },

  // --- Alert ---
  {
    name: "event",
    domain: "alert",
    description: "Alert and event data across all monitoring types",
    platforms: ALL_PLATFORMS,
    fields: [
      { name: "time", type: "number", description: "Event timestamp (Unix ms)", kind: "tag" },
      { name: "oname", type: "string", description: "Agent name", kind: "tag" },
      { name: "title", type: "string", description: "Event title", kind: "field" },
      { name: "message", type: "string", description: "Event message", kind: "field" },
      { name: "level", type: "string", description: "Severity level", kind: "field" },
      { name: "status", type: "string", description: "Event status", kind: "field" },
    ],
    exampleMxql:
      "CATEGORY event\nTAGLOAD\nSELECT [time, title, message, level, oname]",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const _byName = new Map<string, CategoryMeta>(
  CATEGORY_REGISTRY.map((c) => [c.name, c])
);

/** Get all categories, optionally filtered by domain and/or platform. */
export function getCategories(filters?: {
  domain?: string;
  platform?: string;
}): CategoryMeta[] {
  let result = CATEGORY_REGISTRY;
  if (filters?.domain) {
    const d = filters.domain.toLowerCase();
    result = result.filter((c) => c.domain === d);
  }
  if (filters?.platform) {
    const p = filters.platform.toUpperCase();
    result = result.filter((c) =>
      c.platforms.some((pp) => pp.toUpperCase() === p)
    );
  }
  return result;
}

/** Get a single category by name, or undefined. */
export function getCategoryByName(name: string): CategoryMeta | undefined {
  return _byName.get(name);
}

/** Get all valid domain names. */
export function getDomains(): Domain[] {
  return ["server", "apm", "kubernetes", "database", "log", "alert"];
}
