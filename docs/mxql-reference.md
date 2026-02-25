# MXQL Reference

MXQL (Monitoring Query Language) is WhaTap's proprietary query language for extracting monitoring data. This document covers the syntax, known-working categories, field tables, and critical gotchas discovered during development.

## Critical Gotchas

> These are the most important things to know. Getting any of these wrong produces silent failures (empty results, not errors).

1. **The JSON field is `mql`, NOT `mxql`** — The API payload uses `mql` as the key. Using `mxql` returns empty results with no error.

2. **The JSON field is `param`, NOT `params`** — Singular form. Using `params` is silently ignored.

3. **`pageKey` is required** — Must be set in every MXQL request. Our client auto-sets it to `"mxql"`.

4. **FILTER syntax uses colons, not equals** — `FILTER {key:fieldName, value:fieldValue}` not `key=value`.

5. **SELECT uses brackets** — `SELECT [field1, field2]` not `SELECT field1, field2`.

6. **ORDER uses nested brackets** — `ORDER {key:[fieldName], sort:[desc]}` not `key:fieldName`.

7. **TAGLOAD is required after CATEGORY** — Without it, no data is loaded.

8. **Field names are case-sensitive** — `cpu_usr` not `CPU_USR` or `cpuUsr`.

9. **Time range is Unix milliseconds** — `stime` and `etime` must be in milliseconds, not seconds.

## Query Structure

Every MXQL query follows this pattern:

```
CATEGORY {category_name}
TAGLOAD
[FILTER {key:field, value:value}]
[FILTER {key:field, like:pattern}]
SELECT [field1, field2, ...]
[ORDER {key:[field], sort:[desc]}]
```

### Commands

| Command | Required | Description |
|---------|----------|-------------|
| `CATEGORY` | Yes | Specifies the data category to query |
| `TAGLOAD` | Yes | Loads data from the category (must follow CATEGORY) |
| `FILTER` | No | Filters rows by field value or pattern |
| `SELECT` | Yes | Specifies which fields to return |
| `ORDER` | No | Sorts results by a field |

### FILTER Syntax

```
# Exact match
FILTER {key:fieldName, value:fieldValue}

# Pattern match (like/contains)
FILTER {key:fieldName, like:pattern}

# OID filter (agent filter)
FILTER {key:oid, value:12345}
```

### ORDER Syntax

```
ORDER {key:[fieldName], sort:[desc]}
ORDER {key:[fieldName], sort:[asc]}
```

## API Payload Format

```json
{
  "stime": 1700000000000,
  "etime": 1700003600000,
  "mql": "CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu]",
  "limit": 100,
  "pageKey": "mxql"
}
```

**Endpoint:** `POST /open/api/flush/mxql/text`

**Headers:**
- `x-whatap-token: {project_token}`
- `x-whatap-pcode: {project_code}`
- `Content-Type: application/json`

**Response:** Flat JSON array of row objects:
```json
[
  {"oid": 123, "oname": "server-01", "cpu": 45.2},
  {"oid": 456, "oname": "server-02", "cpu": 72.8}
]
```

## Known-Working Categories

### Server / Infrastructure

#### `server_base`
Server-level metrics (CPU, memory, load averages).

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Agent/server name |
| `cpu` | number | Total CPU usage (%) |
| `cpu_usr` | number | User-space CPU (%) |
| `cpu_sys` | number | System CPU (%) |
| `cpu_idle` | number | Idle CPU (%) |
| `cpu_load1` | number | 1-minute load average |
| `cpu_load5` | number | 5-minute load average |
| `cpu_load15` | number | 15-minute load average |
| `memory_pused` | number | Memory usage (%) |
| `memory_used` | number | Memory used (bytes) |
| `memory_total` | number | Memory total (bytes) |
| `onodeName` | string | Kubernetes node name (K8s projects only) |

#### `server_disk`
Disk I/O and usage per mount point.

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Agent/server name |
| `readIops` | number | Read IOPS |
| `writeIops` | number | Write IOPS |
| `blkSize` | number | Block size |
| `mountPoint` | string | Mount point path |
| `fileSystem` | string | Filesystem type |
| `usedPercent` | number | Disk usage (%) |

#### `server_network`
Network interface I/O.

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Agent/server name |
| `desc` | string | Network interface name |
| `in` | number | Bytes received per second |
| `out` | number | Bytes sent per second |

#### `server_process`
Process-level resource usage.

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Agent/server name |
| `pid` | number | Process ID |
| `name` | string | Process name |
| `cpu` | number | Process CPU usage (%) |
| `rss` | number | Resident set size (bytes) |
| `memory` | number | Memory usage (%) |

### APM (Application Performance)

#### `app_counter`
Application performance counters.

| Field | Type | Description |
|-------|------|-------------|
| `pcode` | number | Project code |
| `pname` | string | Project name |
| `tps` | number | Transactions per second |
| `tx_time` | number | Average transaction time (ms) |
| `tx_count` | number | Transaction count |
| `tx_error` | number | Transaction error count |
| `apdex_satisfied` | number | APDEX satisfied count |
| `apdex_tolerated` | number | APDEX tolerated count |
| `apdex_total` | number | APDEX total count |

#### `app_active_stat`
Currently active (in-flight) transactions.

| Field | Type | Description |
|-------|------|-------------|
| `pcode` | number | Project code |
| `pname` | string | Project name |
| `active_tx_count` | number | Total active transactions |
| `active_tx_0` | number | Active < 3 seconds |
| `active_tx_3` | number | Active 3-8 seconds |
| `active_tx_8` | number | Active > 8 seconds |

### Kubernetes

#### `kube_pod_stat`
Pod status and statistics.

| Field | Type | Description |
|-------|------|-------------|
| `podName` | string | Pod name |
| `podStatus` | string | Pod status (Running, Pending, etc.) |
| `namespace` | string | Kubernetes namespace |
| `nodeName` | string | Node the pod runs on |
| `containerCount` | number | Number of containers |
| `restartCount` | number | Total restart count |

#### `kube_container_stat`
Container resource usage.

| Field | Type | Description |
|-------|------|-------------|
| `containerName` | string | Container name |
| `podName` | string | Parent pod name |
| `namespace` | string | Kubernetes namespace |
| `cpu_usage` | number | Container CPU usage |
| `mem_usage` | number | Container memory usage |

#### `kube_event`
Kubernetes cluster events.

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event type (Normal, Warning) |
| `reason` | string | Event reason |
| `message` | string | Event message |
| `namespace` | string | Namespace |
| `name` | string | Object name |
| `kind` | string | Object kind (Pod, Node, etc.) |
| `oname` | string | Agent name |

### Database

#### `db_counter`
Database performance counters.

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Instance name |
| `active_sessions` | number | Active session count |
| `lock_wait` | number | Lock wait count |
| `long_running` | number | Long-running query count |
| `cpu` | number | CPU usage (%) |
| `memory` | number | Memory usage (%) |

#### `db_active_session`
Active database sessions with SQL details.

| Field | Type | Description |
|-------|------|-------------|
| `oid` | number | Agent object ID |
| `oname` | string | Instance name |
| `sid` | number | Session ID |
| `serial` | number | Serial number |
| `user` | string | Database user |
| `sql_text` | string | SQL statement text |
| `status` | string | Session status |
| `wait_event` | string | Current wait event |
| `elapsed_time` | number | Elapsed time (ms) |

#### `db_wait_event`
Wait event analysis (Oracle-specific).

| Field | Type | Description |
|-------|------|-------------|
| `wait_class` | string | Wait class category |
| `wait_event` | string | Specific wait event |
| `total_waits` | number | Total wait count |
| `time_waited` | number | Total time waited (ms) |

### Log

#### `app_log`
Application log entries.

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Timestamp (Unix ms) |
| `content` | string | Log message content |
| `oname` | string | Agent name |
| `category` | string | Log category |

#### `app_log_count`
Log volume statistics.

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Timestamp (Unix ms) |
| `count` | number | Log entry count |
| `category` | string | Log category |

### Alerts

#### `event`
General alert/event data.

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Event timestamp |
| `title` | string | Event title |
| `message` | string | Event message |
| `level` | string | Severity level |
| `oname` | string | Agent name |
| `status` | string | Event status |
