// src/mcp/protocol.ts
// JSON-RPC 2.0 dispatch and MCP initialize handshake.

import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcErrorResponse,
  McpServerInfo,
} from "./types.js";
import { ErrorCode, isRequest, isNotification } from "./types.js";
import type { StdioTransport } from "./transport.js";

type RequestHandler = (params: unknown) => Promise<unknown>;

// Known MCP protocol versions (newest first)
const SUPPORTED_VERSIONS = [
  "2025-03-26",
  "2025-01-15",
  "2024-11-05",
  "2024-10-07",
];

export class McpProtocol {
  private readonly _serverInfo: McpServerInfo;
  private readonly _handlers = new Map<string, RequestHandler>();
  private _transport: StdioTransport | null = null;

  constructor(serverInfo: McpServerInfo) {
    this._serverInfo = serverInfo;

    // Built-in handlers
    this._handlers.set("initialize", async (params) => {
      const p = params as Record<string, unknown> | undefined;
      const clientVersion = String(p?.protocolVersion ?? "");
      // Negotiate: use client's version if we support it, otherwise our default
      const protocolVersion = SUPPORTED_VERSIONS.includes(clientVersion)
        ? clientVersion
        : SUPPORTED_VERSIONS[0];

      return {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: this._serverInfo,
      };
    });

    this._handlers.set("ping", async () => ({}));
  }

  /** Register a request handler for a method. */
  setRequestHandler(method: string, handler: RequestHandler): void {
    this._handlers.set(method, handler);
  }

  /** Connect to a transport and start processing messages. */
  async connect(transport: StdioTransport): Promise<void> {
    this._transport = transport;

    transport.onmessage = (msg: JsonRpcMessage) => {
      this._dispatch(msg).catch((err) => {
        transport.onerror?.(err as Error);
      });
    };

    transport.onerror = (err: Error) => {
      // Log to stderr (not stdout — that's the JSON-RPC channel)
      process.stderr.write(`MCP protocol error: ${err.message}\n`);
    };

    await transport.start();
  }

  private async _dispatch(msg: JsonRpcMessage): Promise<void> {
    if (isRequest(msg)) {
      await this._handleRequest(msg);
    } else if (isNotification(msg)) {
      // notifications/initialized → no-op (expected after initialize)
      // Unknown notifications → silently ignore per spec
    }
    // Responses (from client) → ignore (we don't send requests to clients)
  }

  private async _handleRequest(req: JsonRpcRequest): Promise<void> {
    const handler = this._handlers.get(req.method);

    if (!handler) {
      await this._sendError(req.id, ErrorCode.MethodNotFound, `Method not found: ${req.method}`);
      return;
    }

    try {
      const result = await handler(req.params);
      await this._transport!.send({
        jsonrpc: "2.0",
        id: req.id,
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this._sendError(req.id, ErrorCode.InternalError, message);
    }
  }

  private async _sendError(
    id: number | string,
    code: ErrorCode,
    message: string
  ): Promise<void> {
    const errorResponse: JsonRpcErrorResponse = {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    };
    await this._transport!.send(errorResponse);
  }
}
