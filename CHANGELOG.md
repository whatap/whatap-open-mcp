# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.3] - 2026-09-16

### Fixed

- **An HTML-escaped `category` argument silently returned "No queries found".**
  Marker categories are spelled `<%SQLSTAT_CATEGORY%>`, and some MCP clients
  escape the angle brackets in transit, so the server received
  `&lt;%SQLSTAT_CATEGORY%&gt;`. That missed the index and answered "No queries
  found for category …" — which reads as *nothing uses this marker*, the opposite
  of the truth. It actually has two paths (`mxql/dbx/planchange/chart`,
  `mxql/dbx/planchange/summary`).

  Observed three times in the wild, including once against the live server, and
  it cost one session 7½ minutes of grepping `dist/index.js` to reach an answer
  the tool should have given in a single call. The `category` argument is now
  entity-decoded before lookup, so both spellings resolve identically and the
  echoed category shows the form the caller meant. No real MXQL category name
  contains `&`, so the decoding is unambiguous.

## [1.5.2] - 2026-09-16

### Fixed

- **`describe_query` displayed syntactically broken MXQL for 39 paths.** The raw
  body shown to the caller strips internal directives, but did so line by line.
  A multi-line directive lost only its first line, leaving the continuation lines
  and the closing bracket behind:

  ```
  UPDATE { key: [tx_count, tx_error, tx_time_sum], value:sum}
         ,[tx_count, count]
         ,[tx_error, error]
  ]
  ```

  The source `.mql` is well-formed — the display invented the defect, and readers
  reasonably concluded the collector's file was malformed. Stripping is now
  directive-aware (`src/utils/simplify-mxql.ts`): a directive is consumed whole,
  continuation lines included.

  `CREATE` is no longer hidden. It introduces derived output fields
  (`CREATE { key: timeAvg, expr: "tx_time_sum/tx_count" }`), which is precisely
  what a caller needs in order to understand the result; hiding it dropped real
  output semantics.

- **Marker categories became unanswerable in 1.5.1 (regression).** 1.5.1 removed
  unsubstituted yard markers such as `<%SQLSTAT_CATEGORY%>` from the browsable
  category list, which was the intent — every entry carrying one is a
  non-executable template, so they are never usable candidates. But it also
  dropped them from the reverse-lookup index, so "which paths use
  `<%SQLSTAT_CATEGORY%>`?" became a dead end rather than returning its two paths
  (`mxql/dbx/planchange/chart`, `mxql/dbx/planchange/summary`).

  Marker names are indexed again and remain excluded from the candidate list
  (150 browsable, unchanged). An explicit lookup now returns the template paths
  with a note that they are not executable via `whatap_query_data`.

### Added

- `tests/simplify-mxql.test.ts` asserts that no catalog body with balanced
  brackets is ever displayed with an unbalanced one, and that the running bracket
  depth never goes negative. Run against the 1.5.1 filter this flags 40 paths;
  against 1.5.2, zero.

## [1.5.1] - 2026-09-16

### Fixed

- **MCP responses showed Korean to non-Korean-speaking users.** Reported by a
  Japanese customer. The server's own prose was already English; Korean entered
  only through the two auto-generated data files and was passed straight through
  to the caller:

  | surface | leaked | tool |
  |---|---|---|
  | raw MXQL comments (`--`, `#`, `/* */`) | 294 lines across 192 of 931 paths | `whatap_describe_query` |
  | field/category descriptions from upstream YAML | 16, in 5 categories | `describe_query`, `query_data` Field Guide |

  Catalog descriptions were already covered by the existing `ENGLISH_DESCRIPTIONS`
  overlay; that layer simply never reached raw MXQL or field metadata. Added a
  comment-aware rewriter (`src/utils/mxql-comments.ts`) that translates the 135
  distinct Korean comment lines, and English overrides applied at the single
  `getCategoryMeta()` lookup point so they survive metadata regeneration.

  Translation is display-only — `whatap_query_data` still sends `CATALOG_RAW` to
  the text endpoint byte-identical to the yard source. The Korean in
  `mxql/techross/*` is left alone: those are real SCADA metric identifiers
  (`P1_PV_AI_UF_1차압`), not prose, so rewriting them would produce MXQL that
  matches nothing.

  Verified by sweeping all 931 paths through the built bundle over MCP stdio:
  zero Korean outside the techross identifiers.

- **A quarter of the catalog was duplicate rows.** The yard lives in a Maven
  project, so every `.mql` exists twice on disk — under `src/main/resources/` and
  as a byte-identical build copy under `target/classes/`. The generator walked
  both trees and registered each query twice, so 232 of 931 entries (24.9%) were
  duplicate pairs. Tool output goes straight into LLM context, so a `category=`
  listing could spend up to half its rows on copies.

  All 116 pairs were verified identical in raw body and metadata, with zero
  collisions against the 699 already-clean paths, so collapsing them loses no
  queries:

  | | before | after |
  |---|---|---|
  | catalog entries | 931 | **815** |
  | category listings containing copies | 45 of 164 | **0** |
  | duplicate rows across listings | 124 | 0 |
  | `dist/index.js` | 1.99 MB | **1.85 MB** |

  Fixed at the source in `scripts/generate-catalog.ts`. `canonicalCatalogPath()`
  still resolves the old prefixed spellings, so a path copied from a pre-1.5.1
  response keeps working.

- **Unusable category names were offered as query candidates.** 14 of the 164
  base categories were unsubstituted yard markers (`<%CATEGORY%>`,
  `db_oracle_dma_sqlstat<%TIMEUNIT%>`, a bare `<%`) rather than category names.
  All 62 entries carrying them are non-executable templates, so they were never
  usable candidates. They are now excluded from the category index and the
  browsable list (164 → 150), and asking for one by name returns an explanation
  instead of a bare "not found" — which would otherwise read as "this project has
  no such data".

  Not addressed here: `$category` (11 paths) is a runtime `$`-parameter in the
  same class, but all of its paths are executable, so removing it would hide
  working log paths from `category=` lookup. `db3_stat_httpc[h1}` is a brace typo
  in the upstream collector `.mql`, tracked in PLAT-854.

## [1.5.0] - 2026-09-11

### Fixed

- **`params` were silently ignored.** MXQL variables are written `$oid`, `$field`,
  `$okind` … and the server substitutes them by that exact name, so the request's
  `param` map must be keyed with the `$`. Every tool advertised the bare form
  (`params={"oid":"12345"}`), which the server dropped without a word:

  | sent | result (pcode 5490, `v2/app/tps_oid`) |
  |---|---|
  | `param {"oid":384770091}` | 9 agents — filter ignored |
  | `param {"$oid":384770091}` | 1 agent — filter applied |

  A caller asking for one agent silently received all of them, which an LLM would
  then attribute to that agent. 432 executable catalog paths take caller-supplied
  parameters (`$oid` 408, `$okind`/`$onode` 325, `$field` 32). Both spellings are
  now accepted and normalized before the request is sent.

- **Queries whose `SELECT` takes the metric as `$field` returned no metric.**
  Reported against `mxql/v2/app/app_gc` and `mxql/flexboard/app_gc`, whose
  `SELECT [time, pcode, oid, oname, $field]` came back with only time and entity
  columns — indistinguishable from "this project has no GC data". With the fix,
  `params={"field":"gc_time"}` returns the column. `whatap_describe_query` now
  announces the requirement, lists the metrics the query declares, and prints a
  working example.

- **`HEADER` entries with an unquoted type code were dropped by the parser**
  (`HEADER {gc_time$:ms, gc_count$:'I'}` kept only the quoted ones), losing the
  field from `describe_query`'s metric list on 82 catalog paths — `tps`,
  `resp_time`, `apdex` and `cpu_quota` among them.

- **Unit annotations never rendered for Format A `_head_` rows.** The server
  echoes HEADER keys as written (`{"gc_time$":"ms"}`) while data rows are keyed
  `gc_time`, so every lookup missed. Tables now show `gc_time (ms)`, `cpu (%)`,
  and byte units — the distinction v1.2.1's release notes were written about.

### Notes

- Reported by an engineer after upgrading to 1.4.1; `mxql/app/gc_oid` was already
  correct because it names its metrics directly. Urgency was low — the customer
  had switched to `gc_oid`.
- Verified live on pcode 5490 / 29763: the two reported paths return GC metrics,
  `$oid` filtering narrows 9 agents to 1, units render, and the 1.4.1 false-positive
  fix is unaffected. 126 unit tests, live MCP protocol suite 12/12.

## [1.4.1] - 2026-09-10

### Fixed

- **Regression from 1.3.0**: error statistics queries were reported as failed
  queries. `extractServerError()` treated a row containing a key named `msg` as
  a server error, but `mxql/app/stat_error_pcode` is a `FLEXLOAD` query with no
  `SELECT`, so it returns every field of the `stat_error` category — including
  `msg`, which holds a numeric error-message hash:

  ```json
  {"pcode":37751,"time":1789012800000,"oid":1343766450,"msg":-1233599648,"count":31}
  ```

  Every such row produced `Query failed on the WhaTap server. Server message:
  -1233599648 … Do NOT retry`, on a high-traffic path. Reported by an engineer
  against pcode 37751 and reproduced on 5490.

  A key name is not evidence of failure, and the same trap existed for the name
  `error` itself: 31 catalog paths `RENAME [[tx_error, error]]`. Detection now
  requires both discriminators that the real wire shapes satisfy and data rows do
  not — the value must be a **non-empty string** (these data columns hold
  numbers), and the row must carry **nothing but** the message (a result row
  identifies itself by having `time`/`pcode`/`oid`/`count` alongside).
  `msg`, `errorMessage` and `error_message` were dropped from the key list; only
  `error` and `err` remain, and `error` was the sole shape ever observed on the
  wire.

### Notes

- 1.3.0 shipped the `msg` key as a defensive guess. The analysis that preceded it
  listed exactly this risk as unverified and asked for a live response before
  merging; it was merged without that check. The regression tests now pin the
  reporter's row and a full `stat_error` response.
- Verified live: `mxql/app/stat_error_pcode` on pcode 5490 returns its 13 columns
  again, the real parse-error shape is still reported as an error, and all four
  response states plus `whatap_log_search` are unchanged. 115 unit tests, live MCP
  protocol suite 12/12.

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
