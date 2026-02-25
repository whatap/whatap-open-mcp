# Contributing

## Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd whatap-mcp

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your WhaTap API token

# Run in development mode
WHATAP_API_TOKEN=your_token npm run dev

# Build
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## How to Add a New Tool

Follow this 5-step checklist:

### Step 1: Add the MXQL Query Builder

**File:** `src/api/mxql.ts`

```typescript
export function buildMyNewQuery(opts?: { oid?: string }): string {
  return [
    `CATEGORY my_category`,
    `TAGLOAD`,
    ...oidFilter(opts?.oid),
    `SELECT [field1, field2, field3]`,
  ].join("\n");
}
```

> Refer to [MXQL Reference](mxql-reference.md) for syntax rules and known categories.

### Step 2: Register the Tool

**File:** `src/tools/<category>.ts` (existing or new)

```typescript
server.tool(
  "whatap_my_tool",
  "Description of what the tool does",
  {
    projectCode: z.number().describe("Project code (pcode)"),
    timeRange: z.string().optional().default("5m")
      .describe('Time range (e.g., "5m", "1h", "1d")'),
  },
  async ({ projectCode, timeRange }) => {
    try {
      const { stime, etime } = parseTimeRange(timeRange ?? "5m");
      const mql = buildMyNewQuery();
      const data = await client.executeMxqlText(projectCode, {
        stime, etime, mql, limit: 100,
      });
      const text = formatMxqlResponse(data, { title: "My Tool Results" });
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);
```

### Step 3: Register the Module (if creating a new category file)

**File:** `src/tools/index.ts`

```typescript
import { registerMyTools } from "./my-category.js";
// ...
registerMyTools(server, client);
```

### Step 4: Test with MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Verify:
- Tool appears in the tool list
- Tool returns data for a valid project
- Error handling works for invalid project codes

### Step 5: Update Documentation

- [ ] `docs/tool-catalog.md` — add tool entry
- [ ] `docs/mxql-reference.md` — add category/fields if new
- [ ] `CLAUDE.md` — update tool count
- [ ] `README.md` — add tool to the list, update count

## Code Style

- **TypeScript strict mode** — no `any` types, proper null checks
- **ESM imports** — use `.js` extension in import paths (TypeScript ESM requirement)
- **Zod schemas** — all tool parameters validated via Zod
- **Error handling** — every tool handler wrapped in try/catch, returns `isError: true` on failure
- **Formatting** — responses use `formatMxqlResponse()` for consistent Markdown output

## Project Structure Conventions

- One file per tool category in `src/tools/`
- Each tool file exports a single `register*Tools(server, client)` function
- MXQL query builders centralized in `src/api/mxql.ts`
- Type definitions centralized in `src/api/types.ts`
- Utilities in `src/utils/`

## Commit Guidelines

- Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Keep commits focused — one logical change per commit
- Include the tool name in commit messages when tool-specific: `feat: add whatap_server_top tool`
