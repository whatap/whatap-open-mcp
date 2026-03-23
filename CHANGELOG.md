# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
