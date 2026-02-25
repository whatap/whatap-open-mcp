# ADR 001: MCP SDK with stdio Transport

**Date:** 2026-02-25
**Status:** Accepted

## Context

We needed to expose WhaTap monitoring data to AI assistants (Claude Desktop, Claude Code). The Model Context Protocol (MCP) is the standard protocol for tool integration with Claude. We needed to choose a transport mechanism and SDK.

Options considered:
1. `@modelcontextprotocol/sdk` with stdio transport
2. `@modelcontextprotocol/sdk` with SSE (Server-Sent Events) transport
3. Custom JSON-RPC implementation over HTTP

## Decision

Use `@modelcontextprotocol/sdk` with `StdioServerTransport`.

- stdio is the default and best-supported transport for Claude Desktop and Claude Code
- The official SDK handles JSON-RPC framing, tool registration, and parameter validation
- Single-process model keeps deployment simple (`npx whatap-mcp`)

## Consequences

- **Positive:** Zero-config integration with Claude Desktop (`mcpServers` in config) and Claude Code (`claude mcp add`)
- **Positive:** SDK handles protocol negotiation, capability advertisement, and error formatting
- **Positive:** Zod schema integration provides automatic parameter validation
- **Negative:** stdio transport means one server instance per client connection
- **Negative:** No HTTP endpoint for health checks or monitoring
