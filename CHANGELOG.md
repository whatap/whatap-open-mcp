# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-09-10

### Fixed

- Query results carried no entity identity for 362 catalog paths. Many catalog
  queries move the identity into the dashboard's series keys — either
  `CREATE {key:_name_, from:oname}` followed by `DELETE [oid,oname]`, or
  `RENAME {dst:_name_, src:oname}`, which consumes `oname` outright — and the
  formatter stripped `_id_`/`_name_` as internal metadata. The server was
  returning the identity all along; this client deleted it at the last step.
  `mxql/app/gc_oid` returned 9 rows per timestamp, one per agent, with nothing to
  tell them apart, and `v2/sys/server_base` — the path the tool descriptions
  advertise first — returned `time | cpu | memory_pused` with no host name.

### Changed

- `_name_` and `_id_` are now rendered as table columns, placed next to `time`,
  with a note explaining them: `_name_` is the entity display name (agent
  `oname`, or a project/node name), `_id_` is the query's series key, which may
  be a raw `oid` or a composite such as `pcode_oname` and is therefore only
  comparable within one query.
- They are deliberately **not** renamed to `name`/`id`: a real `name` column
  already exists in 16 catalog paths (process name, pod name, container name) and
  a real `id` in 3, so a rename would silently overwrite one of the two. Keeping
  the wire keys makes a collision impossible.
- An entity column is suppressed when another column already carries the same
  value in every row (e.g. `mxql/sys/process_oid`, where `_name_` copies `name`
  and `_id_` copies `hash`), so paths that already expose identity gain no
  duplicate column.
- Identity is never summarized as a metric, and `_head_`/`_type_`/`_rows_` stay
  hidden.

### Notes

- Responses for narrow timeseries tables grow measurably, because identity is
  repeated per row: `v2/sys/server_base` went from 4,781 to 8,549 characters and
  `v2/app/tps_pcode` from 2,553 to 5,171 in the live protocol suite. A follow-up
  can hoist a single-entity result's identity into one line above the table
  instead of repeating it.
- Verified live against pcodes 5490 / 29763 / 33194 on 2026-09-10, with the
  server's own wire rows captured as test fixtures. 110 unit tests, live MCP
  protocol suite 12/12.

## [1.3.1] - 2026-09-10

### Fixed

- `whatap_describe_query` rejected the path spelling its own documentation uses.
  Catalog keys all carry an `mxql/` prefix (`mxql/v2/sys/server_base`; the bare
  form has 0 keys against 340 prefixed ones), while `PARAM_MXQL_PATH` and the
  `whatap_query_data` description advertise the bare form — so
  `describe_query(path="v2/sys/server_base")` returned
  `isError: "Query path not found in the catalog."` Both spellings now resolve.
  Lookup only: execution routing is unchanged, since a bare path is still
  resolved by the server's path endpoint. The response names the canonical key,
  and its example block uses it so a copied call hits the catalog.
- The live acceptance assertion that hid this. Its `describe_query` case checked
  only `text.includes("tps")`, which the *error* response satisfied via the fuzzy
  "Did you mean" list — the gate stayed green over a broken documented path. It
  now asserts `isError` and the presence of catalog metadata.

## [1.3.0] - 2026-09-10

### Changed

- **BREAKING-ish for text consumers**: every empty-result and server-error response
  was reworded, and `isError: true` is now set in cases that previously returned a
  normal response. Anything matching on the old strings (`"No data found."`,
  `"No data found for the specified time range."`,
  `"No NPM topology data found."`) must be updated.
- `whatap_query_data`, `whatap_log_search`, `whatap_apm_anomaly` and
  `whatap_service_topology` no longer guess *why* a result was empty. The previous
  wording asserted three causes as fact ("time range may be too narrow",
  "no data was collected", "no active agents"); all three were false for the
  reported case, and because an LLM consumes these responses those guesses
  propagated into analyses as evidence. The response now separates what is known
  (zero rows for this query and window) from what is not, and states explicitly
  that it is not evidence of missing collection or absent agents.
- An empty result now echoes what was executed: endpoint, the MXQL text sent
  verbatim, `param`, `limit`, `pageKey`, the window in epoch-ms plus UTC and KST,
  and row counts before/after metadata filtering. For the path endpoint — where the
  server expands the `.mql` file and the executed text is not visible to this
  client — the catalog source is attached, labelled as such.
- `whatap_apm_anomaly` runs its 4 sub-queries with `Promise.allSettled` instead of
  `Promise.all`, so one failing sub-query no longer discards the three that
  succeeded. Partial results are labelled as partial.

### Fixed

- Server-reported query errors are no longer silently converted into "no data".
  The server returns HTTP 200 with `[{"error":"..."}]` for invalid MXQL; the tool
  only reported it when the message contained `"not found"` **and** it was the only
  row in the response, and the metadata filter then deleted the row. Every other
  server error — including the reported
  `A JSONObject text must begin with '{' at 1 [character 2 line 1]` — reached the
  caller as an absence of data. Any error row anywhere in the response is now an
  error, regardless of its message.
- Catalog paths whose raw MXQL still contains unresolved yard template markers
  (`<% AGENT %>`, `<% FILTER %>`) are rejected before execution instead of being
  sent and reported as empty. Nothing in this package substitutes those markers,
  so such a query can never match anything. 200 of 931 catalog entries are affected
  (100 logical paths, duplicated under `src/main/resources/` and `target/classes/`).
  The error names the missing markers and suggests executable paths over the same
  or a related category.
- `whatap_describe_query` marks a template path NOT EXECUTABLE and no longer prints
  a `whatap_query_data` example for it. Its parameter list is empty for these paths,
  which read as "no arguments needed".

### Added

- `src/yard/markers.ts` — `scanMarkers()` detects unresolved yard template markers.
- `extractServerError()` / `buildServerErrorResponse()` in `src/utils/response.ts`.

### Notes

- Verified live against `api.whatap.io` (pcodes 5490, 29763, 33194, 29762, 28458,
  32496) on 2026-09-10, plus 93 unit tests and the live MCP protocol and 30-prompt
  acceptance suites.
- Still open: catalog discovery is unchanged, so `whatap_data_availability(search=…)`
  can still return template paths — they now fail loudly with an alternative instead
  of reporting no data. `whatap_describe_query` also still requires the `mxql/`
  prefixed spelling, while the tool descriptions use the bare form.

## [1.2.1] - tag only

Released as tag `v1.2.1`; no changelog entry was written at the time. Notable
contents: DB SQL statistics catalog paths (640 → 914 entries), local catalog
priority for MXQL execution, `oname` on DB queries, version single-sourced in
`src/version.ts`.

## [1.2.0] - tag only

Released as tag `v1.2.0`; no changelog entry was written at the time. Notable
contents: PromQL / OpenMetrics support with query validation and reuse
(`whatap_create_promql`), OpenAgent install guide.

## [1.1.0] - tag only

Released as tag `v1.1.0`; no changelog entry was written at the time.

## [1.0.0] - 2025-01-01

### Added
- MCP server with stdio transport using `@modelcontextprotocol/sdk`
- WhatapApiClient with two-tier authentication (account + project tokens)
- Project token caching to minimize API calls
- MXQL text query execution pipeline
- 30 monitoring tools across 8 categories:
  - **Project Management** (3): list_projects, project_info, list_agents
  - **Server/Infrastructure** (7): cpu, memory, disk, network, process, cpu_load, top
  - **APM** (6): tps, response_time, error, apdex, active_transactions, transaction_stats
  - **Kubernetes** (6): node_list, node_cpu, node_memory, pod_status, container_top, events
  - **Database** (4): instance_list, db_stat, active_sessions, wait_analysis
  - **Log** (2): log_search, log_stats
  - **Alerts** (1): alerts (with event/kube_event fallback)
  - **Advanced** (1): mxql_query (raw MXQL)
- Human-readable time range parsing ("5m", "1h", "last 7 days")
- Markdown table formatting for AI-friendly responses
- ESM-only build via tsup targeting Node.js 18+
- Claude Desktop and Claude Code integration support
