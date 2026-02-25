# Testing

## Test Environment

### MCP Inspector

The primary testing tool is the MCP Inspector, which allows interactive tool invocation against a live WhaTap API:

```bash
# Build first
npm run build

# Launch inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

Set environment variables before launching:
```bash
export WHATAP_API_TOKEN=your_account_token
export WHATAP_API_URL=https://api.whatap.io
```

### Development Mode

For development with hot reload:

```bash
WHATAP_API_TOKEN=your_token npx tsx src/index.ts
```

## Test Procedure

### Pre-Test Checklist

1. Valid `WHATAP_API_TOKEN` is set
2. At least one project is accessible with the token
3. Project has active agents sending data
4. Build is clean (`npm run build` succeeds)

### Test Order

1. **Project tools first** — `whatap_list_projects` to get valid project codes
2. **Agent list** — `whatap_list_agents` to get valid OIDs for filtering
3. **Server tools** — Test each with a known server project code
4. **APM tools** — Test with an APM project code
5. **Kubernetes tools** — Test with a K8s project code (if available)
6. **Database tools** — Test with a DB project code (if available)
7. **Log tools** — Test with a project that has log monitoring enabled
8. **Alert tool** — Test with various project types
9. **MXQL raw query** — Test with a known-working query

### Known-Working Test Queries

| Tool | Parameters | Notes |
|------|-----------|-------|
| `whatap_list_projects` | *(none)* | Should return all accessible projects |
| `whatap_server_cpu` | `projectCode: {server_pcode}, timeRange: "5m"` | Returns CPU data for all agents |
| `whatap_server_top` | `projectCode: {server_pcode}, metric: "cpu", limit: 5` | Top 5 by CPU |
| `whatap_apm_tps` | `projectCode: {apm_pcode}, timeRange: "5m"` | TPS data |
| `whatap_k8s_pod_status` | `projectCode: {k8s_pcode}, timeRange: "5m"` | Pod listing |
| `whatap_log_search` | `projectCode: {pcode}, keyword: "error", timeRange: "1h"` | Log search |
| `whatap_mxql_query` | `projectCode: {pcode}, mxql: "CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu]"` | Raw query |

## Issues Found and Resolved

### Session 1: Initial Development

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Used `mxql` as JSON field name | Changed to `mql` — WhaTap API uses `mql` not `mxql` |
| 2 | Used `params` (plural) in payload | Changed to `param` (singular) |
| 3 | Missing `pageKey` in MXQL requests | Added auto-set `pageKey: "mxql"` in client |
| 4 | Wrong field names in Project interface | Updated to match actual API: `projectCode`, `projectName` |
| 5 | Wrong field names in Agent interface | Updated to match actual API: `oname`, `active`, `host_ip` |
| 6 | MXQL FILTER syntax wrong (used `=`) | Changed to `{key:field, value:val}` colon syntax |
| 7 | MXQL ORDER syntax wrong | Changed to `{key:[field], sort:[desc]}` bracket syntax |

### Session 2: Testing and Bug Fixes

| # | Issue | Resolution |
|---|-------|------------|
| 8 | Empty results for server queries | MXQL categories confirmed: `server_base`, not `server_stat` |
| 9 | Kubernetes node queries returning empty | Use `server_base` with `onodeName` field for K8s nodes |
| 10 | Alert tool returning empty for all projects | Added fallback: try `event` first, then `kube_event` |
| 11 | Database instance list not working via MXQL | Use `getAgents()` REST API instead of MXQL for instance listing |
| 12 | Log search FILTER not matching | Use `like:` instead of `value:` for substring matching |
| 13 | Container top not sorting correctly | Fixed ORDER syntax: `{key:[field], sort:[desc]}` |
| 14 | Time range parser not handling "last X" format | Added long-form parsing: "last 30 minutes", "last 1 hour" |

## Limitations

- **No unit tests** — Testing relies on live API with MCP Inspector
- **No mock data** — All tests require a valid WhaTap account and active projects
- **Category availability varies** — Not all MXQL categories exist for all project types (e.g., `kube_*` only for K8s projects)
- **Rate limits** — WhaTap API may rate-limit rapid successive calls
