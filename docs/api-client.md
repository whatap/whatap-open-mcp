# API Client Reference

## WhatapApiClient

**Source:** `src/api/client.ts`

The central class for all WhaTap API communication. Manages authentication, project token caching, and HTTP requests.

## Constructor

```typescript
constructor(config: Config)
```

- `config.apiToken` — account-level API token (from `WHATAP_API_TOKEN` env var)
- `config.apiUrl` — base URL (default: `https://api.whatap.io`)

## Two-Tier Authentication

WhaTap uses a two-tier token system:

| Level | Token Source | Header | Scope |
|-------|-------------|--------|-------|
| Account | `WHATAP_API_TOKEN` env var | `x-whatap-token` | List projects, get project info |
| Project | Extracted from project list response | `x-whatap-token` + `x-whatap-pcode` | All monitoring data queries |

### Token Flow

1. User provides account token via environment variable
2. First project-level request triggers `listProjects()` call
3. Each project in the response includes its `apiToken`
4. Tokens are cached in `Map<number, string>` keyed by `projectCode`
5. Subsequent requests use cached tokens (no TTL — cache lives for process lifetime)

## Public Methods

### Account-Level

#### `listProjects(): Promise<Project[]>`
Lists all monitoring projects accessible with the account token. Side effect: populates the project token cache.

- **Endpoint:** `GET /open/api/json/projects`
- **Auth:** Account token

#### `getProjectInfo(pcode: number): Promise<ProjectInfo>`
Gets detailed project information.

- **Endpoint:** `GET /open/api/json/project`
- **Auth:** Project token

### Project-Level

#### `getAgents(pcode: number): Promise<Agent[]>`
Lists agents (servers/instances) in a project with their status.

- **Endpoint:** `GET /open/json/agents`
- **Auth:** Project token

#### `executeMxqlText(pcode: number, params: MxqlTextParams): Promise<MxqlResult>`
Executes an MXQL text query. This is the primary data retrieval method used by most tools.

- **Endpoint:** `POST /open/api/flush/mxql/text`
- **Auth:** Project token
- **Body:** `{pageKey, stime, etime, mql, limit?, param?, inject?}`
- **Returns:** Flat array of row objects

#### `executeMxqlPath(pcode: number, params: MxqlPathParams): Promise<MxqlResult>`
Executes a pre-defined MXQL path query.

- **Endpoint:** `POST /open/api/flush/mxql/path`
- **Auth:** Project token
- **Body:** `{pageKey, stime, etime, mxqlPath, limit?, param?}`

#### `getOpenApi(path: string, pcode: number, queryParams?: Record<string, string | number>): Promise<unknown>`
Generic Open API endpoint handler for stat endpoints.

- **Endpoint:** Dynamic (specified by `path`)
- **Auth:** Project token

### Internal

#### `getProjectToken(pcode: number): Promise<string>`
Resolves a project code to its API token. Checks cache first; on miss, calls `listProjects()` to populate cache. Throws if the project is not accessible.

## API Endpoints Used

| Endpoint | Method | Auth | Used By |
|----------|--------|------|---------|
| `/open/api/json/projects` | GET | Account | `listProjects()` |
| `/open/api/json/project` | GET | Project | `getProjectInfo()` |
| `/open/json/agents` | GET | Project | `getAgents()` |
| `/open/api/flush/mxql/text` | POST | Project | `executeMxqlText()` — most tools |
| `/open/api/flush/mxql/path` | POST | Project | `executeMxqlPath()` |

## Error Handling

- All requests use `AbortSignal.timeout(30_000)` (30-second timeout)
- Non-OK HTTP responses throw `Error` with status code and response body
- Account-level errors: `WhaTap API error ({status}): {body}`
- Project-level errors: `WhaTap API error ({status}) for project {pcode}: {body}`
- Missing project token: `No API token found for project {pcode}`

## Type Definitions

**Source:** `src/api/types.ts`

### Key Types

```typescript
interface MxqlTextParams {
  stime: number;      // Start time (Unix ms)
  etime: number;      // End time (Unix ms)
  mql: string;        // MXQL query text — NOTE: field is "mql" not "mxql"
  limit?: number;     // Max rows
  pageKey?: string;   // Required by API — auto-set to "mxql"
  param?: Record<string, string>;
  inject?: Record<string, string>;
}

type MxqlResult = MxqlRow[];        // Flat array of row objects
interface MxqlRow { [key: string]: unknown; }

interface Project {
  projectCode: number;
  projectName: string;
  platform: string;
  productType: string;
  apiToken: string;
}

interface Agent {
  oname: string;
  active: boolean;
  host_ip?: string;
  oid?: number;
}
```
