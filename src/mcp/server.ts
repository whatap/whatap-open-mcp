// src/mcp/server.ts
// Public McpServer class — same API as @modelcontextprotocol/sdk.
// Registers tools, handles tools/list and tools/call via the protocol layer.

import type { McpToolDefinition, McpToolResult } from "./types.js";
import { ErrorCode } from "./types.js";
import type { SchemaShape } from "./schema.js";
import { shapeToJsonSchema, validateShape } from "./schema.js";
import { McpProtocol } from "./protocol.js";
import type { StdioTransport } from "./transport.js";

// ── Types ────────────────────────────────────────────────────────

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: SchemaShape | undefined;
  callback: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolCallback = (args: any) => Promise<McpToolResult>;

// ── McpServer ────────────────────────────────────────────────────

export class McpServer {
  private readonly _protocol: McpProtocol;
  private readonly _tools = new Map<string, RegisteredTool>();

  constructor(info: { name: string; version: string }) {
    this._protocol = new McpProtocol(info);
  }

  /**
   * Register a tool. Matches the SDK's overloaded signature:
   *   server.tool(name, description, schema, callback)
   *   server.tool(name, description, callback)   // no params
   */
  tool(
    name: string,
    description: string,
    schemaOrCallback: SchemaShape | ToolCallback,
    maybeCallback?: ToolCallback
  ): void {
    let schema: SchemaShape | undefined;
    let callback: ToolCallback;

    if (typeof schemaOrCallback === "function") {
      // tool(name, desc, callback) — no schema
      schema = undefined;
      callback = schemaOrCallback;
    } else {
      // tool(name, desc, schema, callback)
      schema = schemaOrCallback;
      callback = maybeCallback!;
    }

    this._tools.set(name, { name, description, inputSchema: schema, callback });
  }

  /** Connect to a transport and start serving. */
  async connect(transport: StdioTransport): Promise<void> {
    // Register tools/list handler
    this._protocol.setRequestHandler("tools/list", async () => {
      const tools: McpToolDefinition[] = [];
      for (const t of this._tools.values()) {
        tools.push({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
            ? shapeToJsonSchema(t.inputSchema)
            : { type: "object", properties: {} },
        });
      }
      return { tools };
    });

    // Register tools/call handler
    this._protocol.setRequestHandler("tools/call", async (params) => {
      const p = params as { name?: string; arguments?: unknown } | undefined;
      const toolName = p?.name;
      if (!toolName) {
        throw new McpError(ErrorCode.InvalidParams, "Missing tool name");
      }

      const tool = this._tools.get(toolName);
      if (!tool) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: "${toolName}". Available: ${[...this._tools.keys()].join(", ")}`
        );
      }

      // Validate arguments against schema
      let args: Record<string, unknown> = {};
      if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
        const validation = validateShape(tool.inputSchema, p?.arguments);
        if (!validation.ok) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid arguments for "${toolName}": ${validation.errors.join("; ")}`
          );
        }
        args = validation.value;
      }

      // Execute tool callback — errors become isError responses, not JSON-RPC errors
      try {
        return await tool.callback(args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Tool error: ${message}` }],
          isError: true,
        };
      }
    });

    await this._protocol.connect(transport);
  }
}

// ── McpError ─────────────────────────────────────────────────────

class McpError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "McpError";
  }
}
