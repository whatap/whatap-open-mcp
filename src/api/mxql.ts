// MXQL query builders for common monitoring scenarios.
// Each function returns a valid MXQL text query string.
//
// MXQL syntax notes:
//   FILTER uses colon key-value: FILTER {key:fieldName, value:fieldValue}
//   ORDER uses colon with brackets: ORDER {key:[fieldName], sort:[desc]}
//   OID filter can also use: OID [oid1, oid2]

// Helper to build an OID filter line
function oidFilter(oid?: string): string[] {
  if (!oid) return [];
  return [`FILTER {key:oid, value:${oid}}`];
}

// --- Server / Infrastructure ---

export function buildServerCpuQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, cpu, cpu_usr, cpu_sys, cpu_idle]`,
  ].join("\n");
}

export function buildServerMemoryQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, memory_pused, memory_used, memory_total]`,
  ].join("\n");
}

export function buildServerDiskQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_disk`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, readIops, writeIops, blkSize, mountPoint, fileSystem, usedPercent]`,
  ].join("\n");
}

export function buildServerNetworkQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_network`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, desc, in, out]`,
  ].join("\n");
}

export function buildServerProcessQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_process`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, pid, name, cpu, rss, memory]`,
  ].join("\n");
}

export function buildServerCpuLoadQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, cpu_load1, cpu_load5, cpu_load15]`,
  ].join("\n");
}

// --- APM ---

export function buildApmTpsQuery(): string {
  return [
    `CATEGORY app_counter`,
    `TAGLOAD`,
    `SELECT [pcode, pname, tps]`,
  ].join("\n");
}

export function buildApmResponseTimeQuery(): string {
  return [
    `CATEGORY app_counter`,
    `TAGLOAD`,
    `SELECT [pcode, pname, tx_time, tx_count]`,
  ].join("\n");
}

export function buildApmErrorQuery(): string {
  return [
    `CATEGORY app_counter`,
    `TAGLOAD`,
    `SELECT [pcode, pname, tx_error, tx_count]`,
  ].join("\n");
}

export function buildApmApdexQuery(): string {
  return [
    `CATEGORY app_counter`,
    `TAGLOAD`,
    `SELECT [pcode, pname, apdex_satisfied, apdex_tolerated, apdex_total]`,
  ].join("\n");
}

export function buildApmActiveTransactionsQuery(): string {
  return [
    `CATEGORY app_active_stat`,
    `TAGLOAD`,
    `SELECT [pcode, pname, active_tx_count, active_tx_0, active_tx_3, active_tx_8]`,
  ].join("\n");
}

export function buildApmTransactionStatsQuery(): string {
  return [
    `CATEGORY app_counter`,
    `TAGLOAD`,
    `SELECT [pcode, pname, tx_count, tx_time, tx_error]`,
  ].join("\n");
}

// --- Kubernetes ---

export function buildK8sNodeListQuery(): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    `SELECT [oid, oname, onodeName, cpu, memory_pused]`,
  ].join("\n");
}

export function buildK8sNodeCpuQuery(): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    `SELECT [oid, oname, onodeName, cpu, cpu_usr, cpu_sys]`,
  ].join("\n");
}

export function buildK8sNodeMemoryQuery(): string {
  return [
    `CATEGORY server_base`,
    `TAGLOAD`,
    `SELECT [oid, oname, onodeName, memory_pused, memory_used, memory_total]`,
  ].join("\n");
}

export function buildK8sPodStatusQuery(): string {
  return [
    `CATEGORY kube_pod_stat`,
    `TAGLOAD`,
    `SELECT [podName, podStatus, namespace, nodeName, containerCount, restartCount]`,
  ].join("\n");
}

export function buildK8sContainerTopQuery(metric: string): string {
  const field = metric === "memory" ? "mem_usage" : "cpu_usage";
  return [
    `CATEGORY kube_container_stat`,
    `TAGLOAD`,
    `SELECT [containerName, podName, namespace, ${field}]`,
    `ORDER {key:[${field}], sort:[desc]}`,
  ].join("\n");
}

export function buildK8sEventsQuery(): string {
  return [
    `CATEGORY kube_event`,
    `TAGLOAD`,
    `SELECT [type, reason, message, namespace, name, kind, oname]`,
  ].join("\n");
}

// --- Database ---

export function buildDbStatQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY db_counter`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, active_sessions, lock_wait, long_running, cpu, memory]`,
  ].join("\n");
}

export function buildDbActiveSessionsQuery(opts?: {
  oid?: string;
}): string {
  return [
    `CATEGORY db_active_session`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [oid, oname, sid, serial, user, sql_text, status, wait_event, elapsed_time]`,
  ].join("\n");
}

export function buildDbWaitAnalysisQuery(): string {
  return [
    `CATEGORY db_wait_event`,
    `TAGLOAD`,
    `SELECT [wait_class, wait_event, total_waits, time_waited]`,
    `ORDER {key:[time_waited], sort:[desc]}`,
  ].join("\n");
}

// --- Log ---

export function buildLogSearchQuery(keyword: string): string {
  return [
    `CATEGORY app_log`,
    `TAGLOAD`,
    `FILTER {key:content, like:${keyword}}`,
    `SELECT [time, content, oname, category]`,
    `ORDER {key:[time], sort:[desc]}`,
  ].join("\n");
}

export function buildLogStatsQuery(): string {
  return [
    `CATEGORY app_log_count`,
    `TAGLOAD`,
    `SELECT [time, count, category]`,
  ].join("\n");
}
