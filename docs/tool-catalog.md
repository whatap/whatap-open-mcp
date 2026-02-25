# Tool Catalog

All 30 MCP tools organized by category. Each entry includes the tool name, description, parameters, source file, and MXQL category used (if applicable).

## Summary

| Category | Count | Source File |
|----------|-------|-------------|
| [Project Management](#project-management) | 3 | `src/tools/project.ts` |
| [Server / Infrastructure](#server--infrastructure) | 7 | `src/tools/server.ts` |
| [APM](#apm-application-performance) | 6 | `src/tools/apm.ts` |
| [Kubernetes](#kubernetes) | 6 | `src/tools/kubernetes.ts` |
| [Database](#database) | 4 | `src/tools/database.ts` |
| [Log](#log-monitoring) | 2 | `src/tools/log.ts` |
| [Alerts](#alerts--events) | 1 | `src/tools/alert.ts` |
| [Advanced](#advanced) | 1 | `src/tools/mxql.ts` |
| **Total** | **30** | |

---

## Project Management

**Source:** `src/tools/project.ts` (3 tools)

### `whatap_list_projects`
List all monitoring projects accessible with the account token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *(none)* | | | |

- **API:** `GET /open/api/json/projects` (account-level)
- **MXQL:** Not used

### `whatap_project_info`
Get detailed project information for a specific project code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectCode` | number | Yes | Project code (pcode) |

- **API:** `GET /open/api/json/project` (project-level)
- **MXQL:** Not used

### `whatap_list_agents`
List agents (servers/instances) in a project with their status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectCode` | number | Yes | Project code (pcode) |

- **API:** `GET /open/json/agents` (project-level)
- **MXQL:** Not used

---

## Server / Infrastructure

**Source:** `src/tools/server.ts` (7 tools)

### `whatap_server_cpu`
CPU usage metrics per server.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range (e.g., "5m", "1h", "1d") |
| `oid` | string | No | | Filter by specific agent OID |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, cpu, cpu_usr, cpu_sys, cpu_idle

### `whatap_server_memory`
Memory usage metrics per server.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by agent OID |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, memory_pused, memory_used, memory_total

### `whatap_server_disk`
Disk I/O and usage metrics per mount point.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by agent OID |

- **MXQL Category:** `server_disk`
- **Fields:** oid, oname, readIops, writeIops, blkSize, mountPoint, fileSystem, usedPercent

### `whatap_server_network`
Network I/O metrics per interface.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by agent OID |

- **MXQL Category:** `server_network`
- **Fields:** oid, oname, desc, in, out

### `whatap_server_process`
Process-level CPU and memory usage.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by agent OID |

- **MXQL Category:** `server_process`
- **Fields:** oid, oname, pid, name, cpu, rss, memory

### `whatap_server_cpu_load`
CPU load averages (1/5/15 minute).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by agent OID |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, cpu_load1, cpu_load5, cpu_load15

### `whatap_server_top`
Top-N servers ranked by a metric.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `metric` | string | Yes | | Metric to rank by: "cpu", "memory", or "disk" |
| `timeRange` | string | No | `"5m"` | Time range |
| `limit` | number | No | `10` | Number of top results |

- **MXQL Category:** `server_base` (cpu/memory) or `server_disk` (disk)
- **Fields:** Varies by metric, includes ORDER clause

---

## APM (Application Performance)

**Source:** `src/tools/apm.ts` (6 tools)

### `whatap_apm_tps`
Transactions per second (TPS).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_counter`
- **Fields:** pcode, pname, tps

### `whatap_apm_response_time`
Service response time metrics.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_counter`
- **Fields:** pcode, pname, tx_time, tx_count

### `whatap_apm_error`
Transaction error count and rate.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_counter`
- **Fields:** pcode, pname, tx_error, tx_count

### `whatap_apm_apdex`
APDEX (Application Performance Index) satisfaction score.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_counter`
- **Fields:** pcode, pname, apdex_satisfied, apdex_tolerated, apdex_total

### `whatap_apm_active_transactions`
Currently active (in-flight) transactions snapshot.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_active_stat`
- **Fields:** pcode, pname, active_tx_count, active_tx_0, active_tx_3, active_tx_8

### `whatap_apm_transaction_stats`
Transaction statistics (count, avg time, errors).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `app_counter`
- **Fields:** pcode, pname, tx_count, tx_time, tx_error

---

## Kubernetes

**Source:** `src/tools/kubernetes.ts` (6 tools)

### `whatap_k8s_node_list`
List Kubernetes nodes with CPU and memory overview.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, onodeName, cpu, memory_pused

### `whatap_k8s_node_cpu`
Node CPU usage.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, onodeName, cpu, cpu_usr, cpu_sys

### `whatap_k8s_node_memory`
Node memory usage.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `server_base`
- **Fields:** oid, oname, onodeName, memory_pused, memory_used, memory_total

### `whatap_k8s_pod_status`
Pod status and statistics.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `kube_pod_stat`
- **Fields:** podName, podStatus, namespace, nodeName, containerCount, restartCount

### `whatap_k8s_container_top`
Top containers by CPU or memory usage.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `metric` | string | No | `"cpu"` | Metric to rank by: "cpu" or "memory" |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `kube_container_stat`
- **Fields:** containerName, podName, namespace, cpu_usage or mem_usage

### `whatap_k8s_events`
Recent Kubernetes events (warnings, errors, etc.).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"1h"` | Time range |

- **MXQL Category:** `kube_event`
- **Fields:** type, reason, message, namespace, name, kind, oname

---

## Database

**Source:** `src/tools/database.ts` (4 tools)

### `whatap_db_instance_list`
List database instances in a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectCode` | number | Yes | Project code |

- **API:** Uses `getAgents()` (not MXQL)
- **MXQL:** Not used

### `whatap_db_stat`
Database performance stats (active sessions, locks, CPU, memory).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by instance OID |

- **MXQL Category:** `db_counter`
- **Fields:** oid, oname, active_sessions, lock_wait, long_running, cpu, memory

### `whatap_db_active_sessions`
Active database sessions with SQL text and wait events.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |
| `oid` | string | No | | Filter by instance OID |

- **MXQL Category:** `db_active_session`
- **Fields:** oid, oname, sid, serial, user, sql_text, status, wait_event, elapsed_time

### `whatap_db_wait_analysis`
Wait event analysis (Oracle). Shows wait classes ranked by time waited.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"5m"` | Time range |

- **MXQL Category:** `db_wait_event`
- **Fields:** wait_class, wait_event, total_waits, time_waited

---

## Log Monitoring

**Source:** `src/tools/log.ts` (2 tools)

### `whatap_log_search`
Search logs with keyword filter. Returns matching log entries with timestamps.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `keyword` | string | Yes | | Search keyword |
| `timeRange` | string | No | `"1h"` | Time range |

- **MXQL Category:** `app_log`
- **Fields:** time, content, oname, category
- **Filter:** `FILTER {key:content, like:{keyword}}`

### `whatap_log_stats`
Log volume and rate statistics over a time period.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"1h"` | Time range |

- **MXQL Category:** `app_log_count`
- **Fields:** time, count, category

---

## Alerts & Events

**Source:** `src/tools/alert.ts` (1 tool)

### `whatap_alerts`
Get active or recent alert events. Tries general `event` category first, falls back to `kube_event` for Kubernetes projects.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `timeRange` | string | No | `"1h"` | Time range |

- **MXQL Category:** `event` (primary), `kube_event` (fallback)
- **Fields:** time, title, message, level, oname, status

---

## Advanced

**Source:** `src/tools/mxql.ts` (1 tool)

### `whatap_mxql_query`
Execute raw MXQL text queries for advanced/custom data retrieval.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectCode` | number | Yes | | Project code |
| `mxql` | string | Yes | | Raw MXQL query text |
| `timeRange` | string | No | `"5m"` | Time range |
| `limit` | number | No | `100` | Max rows to return |

- **MXQL Category:** User-specified in query
- **Fields:** User-specified in query
