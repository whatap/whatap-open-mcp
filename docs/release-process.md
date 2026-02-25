# Release Process

## Version Strategy

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes to tool names, parameters, or behavior
- **MINOR** (0.x.0): New tools or non-breaking feature additions
- **PATCH** (0.0.x): Bug fixes, documentation updates, internal refactoring

## Build

### Prerequisites

- Node.js >= 18.0.0
- npm

### Build Steps

```bash
# Install dependencies
npm install

# Build (ESM bundle via tsup)
npm run build
```

**Build output:** `dist/` directory containing:
- `index.js` — ESM bundle (single file)
- `index.d.ts` — TypeScript declarations
- `index.js.map` — Source map

### Build Configuration

**File:** `tsup.config.ts`

```typescript
{
  entry: ["src/index.ts"],
  format: ["esm"],         // ESM-only
  target: "node18",        // Node.js 18+
  outDir: "dist",
  clean: true,             // Clean dist/ before build
  dts: true,               // Generate .d.ts
  sourcemap: true,         // Generate source maps
}
```

## Test

```bash
# Build first
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

See [Testing](testing.md) for detailed test procedures.

## Publish to npm

### Pre-Publish Checklist

1. [ ] All tools tested and working
2. [ ] `CHANGELOG.md` updated with new version section
3. [ ] Version bumped in `package.json`
4. [ ] Build succeeds cleanly
5. [ ] README.md tool count is accurate

### Publish Steps

```bash
# Bump version
npm version patch  # or minor, major

# Build
npm run build

# Verify package contents
npm pack --dry-run

# Publish
npm publish
```

### Package Contents

The published npm package includes only:
- `dist/` — compiled ESM bundle + types + source maps
- `bin/whatap-mcp.js` — CLI entry point
- `package.json`
- `README.md`
- `LICENSE`

This is controlled by the `files` field in `package.json`:
```json
{
  "files": ["dist", "bin"]
}
```

### CLI Entry Point

**File:** `bin/whatap-mcp.js`

```javascript
#!/usr/bin/env node
import "../dist/index.js";
```

This enables `npx whatap-mcp` to start the MCP server.

## Usage After Install

### Claude Desktop

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "<your-token>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add whatap -- npx whatap-mcp \
  --env WHATAP_API_TOKEN=<your-token>
```
