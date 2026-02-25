# ADR 007: tsup ESM-Only Bundling

**Date:** 2026-02-25
**Status:** Accepted

## Context

The project is a CLI tool distributed via npm (`npx whatap-mcp`). We needed to choose a build tool and module format. Key constraints:

- Target: Node.js 18+ (has native `fetch`, ESM support)
- Dependencies: `@modelcontextprotocol/sdk` (ESM-only), `zod`
- Distribution: npm package with `bin` entry point

Options considered:
1. **tsup** — fast TypeScript bundler built on esbuild
2. **tsc** — TypeScript compiler (no bundling)
3. **esbuild** — direct esbuild usage
4. **rollup** — traditional JS bundler

## Decision

Use **tsup** with ESM-only output:

```typescript
{
  entry: ["src/index.ts"],
  format: ["esm"],          // ESM only — no CJS
  target: "node18",         // Node.js 18+ (native fetch)
  clean: true,              // Clean dist/ before build
  dts: true,                // Generate TypeScript declarations
  sourcemap: true,          // Source maps for debugging
}
```

## Consequences

- **Positive:** Single-file ESM bundle (33.86 KB) — fast startup, no module resolution overhead
- **Positive:** TypeScript declarations generated for potential library consumers
- **Positive:** Source maps enable debugging against original TypeScript source
- **Positive:** `clean: true` prevents stale build artifacts
- **Negative:** ESM-only means no CommonJS compatibility (acceptable since Node 18+ and MCP SDK are ESM)
- **Negative:** Requires `"type": "module"` in `package.json`
