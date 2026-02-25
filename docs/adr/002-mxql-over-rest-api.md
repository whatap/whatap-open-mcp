# ADR 002: MXQL over REST API for All Metrics

**Date:** 2026-02-25
**Status:** Accepted

## Context

WhaTap provides two ways to query monitoring data:

1. **Individual REST endpoints** — specific URLs per metric type (e.g., `/open/api/json/spot/{metric}`)
2. **MXQL (Monitoring Query Language)** — a unified query language via `/open/api/flush/mxql/text`

We needed a consistent approach for querying server, APM, Kubernetes, database, and log metrics.

## Decision

Use MXQL text queries via `POST /open/api/flush/mxql/text` as the primary data retrieval method for all monitoring categories.

Individual REST endpoints are only used for:
- `GET /open/api/json/projects` — project listing (no MXQL equivalent)
- `GET /open/api/json/project` — project info
- `GET /open/json/agents` — agent listing

## Consequences

- **Positive:** Single query interface for all monitoring data types (server, APM, K8s, DB, log)
- **Positive:** Flexible field selection and filtering via MXQL syntax
- **Positive:** Centralized query builder pattern (`src/api/mxql.ts`) keeps tool implementations consistent
- **Positive:** Raw MXQL tool (`whatap_mxql_query`) enables arbitrary queries beyond built-in tools
- **Negative:** MXQL syntax is underdocumented and was discovered via trial-and-error
- **Negative:** Some MXQL categories may not exist for all project types
- **Negative:** MXQL errors are sometimes silent (empty results instead of error messages)
