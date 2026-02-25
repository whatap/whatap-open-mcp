# Architecture

## Overview

whatap-mcp is an MCP (Model Context Protocol) server that bridges AI assistants to the WhaTap monitoring platform. It uses stdio transport, runs as a single Node.js process, and exposes 30 tools across 8 monitoring categories.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Assistant (Claude Desktop / Claude Code)                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MCP Client                                               │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ stdio (JSON-RPC)                    │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│  whatap-mcp server        │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Transport Layer (StdioServerTransport)                    │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │  MCP Server (McpServer from @modelcontextprotocol/sdk)     │ │
│  │  - Tool registration (30 tools)                            │ │
│  │  - Parameter validation (Zod schemas)                      │ │
│  └──────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──────────┘ │
│         │     │     │     │     │     │     │     │             │
│  ┌──────▼──┐ ┌▼───┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼────┐    │
│  │ project │ │srv │ │apm│ │k8s│ │ db│ │log│ │alt│ │mxql│    │
│  │ (3)     │ │(7) │ │(6)│ │(6)│ │(4)│ │(2)│ │(1)│ │(1) │    │
│  └──────┬──┘ └┬───┘ └┬──┘ └┬──┘ └┬──┘ └┬──┘ └┬──┘ └┬────┘    │
│         │     │      │     │     │     │     │     │           │
│  ┌──────▼─────▼──────▼─────▼─────▼─────▼─────▼─────▼────────┐ │
│  │  MXQL Query Builders (src/api/mxql.ts)                    │ │
│  │  - 23 query builder functions                             │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │  WhatapApiClient (src/api/client.ts)                      │ │
│  │  - Two-tier auth (account token → project token)          │ │
│  │  - Project token caching (Map<pcode, token>)              │ │
│  │  - 30s request timeout                                    │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │ HTTPS                               │
│  ┌────────────────────────┼──────────────────────────────────┐ │
│  │  Utilities                                                │ │
│  │  - Time parser (src/utils/time.ts)                        │ │
│  │  - Formatters (src/utils/format.ts)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  WhaTap API           │
                │  https://api.whatap.io│
                └───────────────────────┘
```

## Layers

### 1. Transport Layer
- **StdioServerTransport** from `@modelcontextprotocol/sdk`
- Communicates via stdin/stdout using JSON-RPC
- Single-process, synchronous message handling

### 2. MCP Server Layer
- **McpServer** registers tools with Zod schemas for parameter validation
- Each tool is a named function with typed parameters and a handler
- Entry point: `src/index.ts` → `registerAllTools()` in `src/tools/index.ts`

### 3. Tool Layer (8 modules)
Each module exports a `register*Tools(server, client)` function:

| Module | File | Tools | Domain |
|--------|------|-------|--------|
| Project | `src/tools/project.ts` | 3 | Project listing, info, agents |
| Server | `src/tools/server.ts` | 7 | CPU, memory, disk, network, process, load, top |
| APM | `src/tools/apm.ts` | 6 | TPS, response time, errors, APDEX, active tx |
| Kubernetes | `src/tools/kubernetes.ts` | 6 | Nodes, pods, containers, events |
| Database | `src/tools/database.ts` | 4 | Instance list, stats, sessions, wait analysis |
| Log | `src/tools/log.ts` | 2 | Search, stats |
| Alert | `src/tools/alert.ts` | 1 | Events with fallback strategy |
| MXQL | `src/tools/mxql.ts` | 1 | Raw MXQL query execution |

### 4. Query Layer
- **MXQL query builders** (`src/api/mxql.ts`) generate MXQL text strings
- 23 builder functions, one per monitoring query type
- Pattern: `CATEGORY {name}` → `TAGLOAD` → `[FILTER]` → `SELECT [fields]` → `[ORDER]`

### 5. API Client Layer
- **WhatapApiClient** (`src/api/client.ts`) handles all HTTP communication
- Two-tier authentication: account token for listing, project tokens for queries
- Project token caching via `Map<number, string>`
- 30-second request timeout via `AbortSignal.timeout()`

### 6. Utility Layer
- **Time parser** (`src/utils/time.ts`): converts "5m", "1h", "last 7 days" → `{stime, etime}`
- **Formatters** (`src/utils/format.ts`): MXQL results → Markdown tables

## Request Lifecycle

```
1. AI assistant calls tool (e.g., whatap_server_cpu)
   ↓
2. MCP SDK validates params via Zod schema
   ↓
3. Tool handler:
   a. parseTimeRange(timeRange) → {stime, etime}
   b. buildServerCpuQuery({oid}) → MXQL string
   ↓
4. client.executeMxqlText(pcode, {stime, etime, mql, limit})
   ↓
5. WhatapApiClient:
   a. getProjectToken(pcode) — cache hit or fetch all projects
   b. POST /open/api/flush/mxql/text with project auth headers
   ↓
6. WhaTap API returns flat array of row objects
   ↓
7. formatMxqlResponse(data) → Markdown table
   ↓
8. Return {content: [{type: "text", text}]}
```

## Authentication Model

```
Account Token (WHATAP_API_TOKEN env var)
  │
  ├── GET /open/api/json/projects → list of projects with apiToken fields
  │   │
  │   └── Cache: projectTokenCache.set(projectCode, apiToken) for each project
  │
  └── For any project-level operation:
      1. Check cache for project token
      2. If miss → call listProjects() to populate cache
      3. Use project token in x-whatap-token header
      4. Include x-whatap-pcode header
```

## Source Layout

```
src/
├── index.ts              # Entry point — creates server, client, transport
├── config.ts             # Loads WHATAP_API_TOKEN and WHATAP_API_URL from env
├── api/
│   ├── client.ts         # WhatapApiClient — HTTP, auth, caching
│   ├── types.ts          # TypeScript interfaces for API responses
│   └── mxql.ts           # 23 MXQL query builder functions
├── tools/
│   ├── index.ts          # registerAllTools() — calls 8 register functions
│   ├── project.ts        # 3 project management tools
│   ├── server.ts         # 7 server monitoring tools
│   ├── apm.ts            # 6 APM tools
│   ├── kubernetes.ts     # 6 Kubernetes tools
│   ├── database.ts       # 4 database tools
│   ├── log.ts            # 2 log tools
│   ├── alert.ts          # 1 alert tool (event + kube_event fallback)
│   └── mxql.ts           # 1 raw MXQL tool
└── utils/
    ├── time.ts           # parseTimeRange() — human string → timestamps
    └── format.ts         # formatMxqlResponse(), formatProjectList(), formatAgentList()
```
