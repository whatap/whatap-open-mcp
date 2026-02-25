# ADR 004: API Field Name Corrections

**Date:** 2026-02-25
**Status:** Accepted

## Context

During initial implementation, we used field names based on documentation and common conventions. Live API testing revealed that the actual WhaTap API uses different field names than expected.

Discrepancies discovered:

| Expected | Actual | Location |
|----------|--------|----------|
| `pcode` / `pname` | `projectCode` / `projectName` | Project list response |
| `ip` | `host_ip` | Agent response |
| `mxql` | `mql` | MXQL request body |
| `params` | `param` | MXQL request body |
| *(missing)* | `pageKey: "mxql"` | MXQL request body (required) |

## Decision

Adopt the actual API field names discovered through live testing. Update all type definitions (`src/api/types.ts`), the API client (`src/api/client.ts`), formatters (`src/utils/format.ts`), and tool files to use the correct field names.

## Consequences

- **Positive:** All API calls work correctly against the live WhaTap API
- **Positive:** Type definitions now serve as accurate documentation of the API contract
- **Negative:** Cannot rely solely on WhaTap documentation — live testing is essential for verifying field names
- **Lesson:** Always test against the real API before assuming documentation is accurate
