# ADR 003: Project Token Caching

**Date:** 2026-02-25
**Status:** Accepted

## Context

WhaTap uses a two-tier authentication model:
- **Account token** — provided by the user, used for account-level operations
- **Project token** — returned in the project list response, required for all project-level data queries

Every tool call requires a project token, but tokens are only obtainable by calling the project list endpoint with the account token. Without caching, every tool invocation would require an extra API call.

## Decision

Cache project tokens in a `Map<number, string>` (keyed by project code) within the `WhatapApiClient` instance. The cache is populated when:

1. `listProjects()` is called explicitly
2. Any project-level operation triggers `getProjectToken()` on a cache miss, which calls `listProjects()` to populate the cache

The cache has no TTL — it persists for the lifetime of the process.

## Consequences

- **Positive:** Eliminates redundant API calls — project list is fetched at most once per session
- **Positive:** Transparent to tool implementations — they just pass `projectCode` and the client resolves the token
- **Positive:** Simple implementation — no TTL logic, no cache invalidation
- **Negative:** If a new project is added while the server is running, a restart is needed to see it (unless `whatap_list_projects` is called first, which refreshes the cache)
- **Negative:** Stale tokens are not detected until an API call fails
