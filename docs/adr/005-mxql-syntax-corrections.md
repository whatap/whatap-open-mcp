# ADR 005: MXQL Syntax Corrections

**Date:** 2026-02-25
**Status:** Accepted

## Context

During the second testing round, MXQL queries with FILTER and ORDER clauses were returning empty results or errors. Investigation revealed the syntax used was incorrect.

Syntax errors found:

| Clause | Wrong Syntax | Correct Syntax |
|--------|-------------|----------------|
| FILTER (exact match) | `FILTER {oid = '123'}` | `FILTER {key:oid, value:123}` |
| FILTER (pattern match) | `FILTER {content LIKE 'error'}` | `FILTER {key:content, like:error}` |
| ORDER | `ORDER {cpu desc}` | `ORDER {key:[cpu], sort:[desc]}` |

## Decision

Adopt colon-based key-value syntax for all MXQL clauses:

- **FILTER:** `{key:fieldName, value:fieldValue}` for exact match, `{key:fieldName, like:pattern}` for substring match
- **ORDER:** `{key:[fieldName], sort:[desc]}` — note the square brackets around field name and sort direction

Update all 23 query builders in `src/api/mxql.ts` and inline queries in tool files.

## Consequences

- **Positive:** All MXQL queries with FILTER/ORDER now return correct results
- **Positive:** Documented in `docs/mxql-reference.md` as critical gotchas
- **Negative:** MXQL syntax is non-standard and unintuitive — easy to get wrong
- **Lesson:** MXQL uses its own DSL conventions, not SQL-like syntax
