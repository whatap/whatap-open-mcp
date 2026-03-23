// src/mcp/transport.ts
// Stdio transport for MCP: newline-delimited JSON-RPC over stdin/stdout.
// Modeled on @modelcontextprotocol/sdk's StdioServerTransport (~80 lines).

import process from "node:process";
import type { JsonRpcMessage } from "./types.js";

// ── ReadBuffer ───────────────────────────────────────────────────

/** Buffers stdin chunks and extracts newline-delimited JSON-RPC messages. */
export class ReadBuffer {
  private _buffer: Buffer | undefined;

  append(chunk: Buffer): void {
    this._buffer = this._buffer
      ? Buffer.concat([this._buffer, chunk])
      : chunk;
  }

  readMessage(): JsonRpcMessage | null {
    if (!this._buffer) return null;

    const index = this._buffer.indexOf("\n");
    if (index === -1) return null;

    const line = this._buffer
      .toString("utf8", 0, index)
      .replace(/\r$/, "");
    this._buffer = this._buffer.subarray(index + 1);
    if (this._buffer.length === 0) this._buffer = undefined;

    const parsed = JSON.parse(line);
    if (!parsed || parsed.jsonrpc !== "2.0") {
      throw new Error(`Invalid JSON-RPC message: missing jsonrpc "2.0"`);
    }
    return parsed as JsonRpcMessage;
  }

  clear(): void {
    this._buffer = undefined;
  }
}

// ── StdioTransport ───────────────────────────────────────────────

export class StdioTransport {
  private readonly _stdin: NodeJS.ReadableStream;
  private readonly _stdout: NodeJS.WritableStream;
  private readonly _readBuffer = new ReadBuffer();
  private _started = false;

  onmessage?: (msg: JsonRpcMessage) => void;
  onerror?: (err: Error) => void;
  onclose?: () => void;

  constructor(
    stdin: NodeJS.ReadableStream = process.stdin,
    stdout: NodeJS.WritableStream = process.stdout
  ) {
    this._stdin = stdin;
    this._stdout = stdout;
  }

  private readonly _onData = (chunk: Buffer): void => {
    this._readBuffer.append(chunk);
    this._processBuffer();
  };

  private readonly _onError = (err: Error): void => {
    this.onerror?.(err);
  };

  private _processBuffer(): void {
    while (true) {
      try {
        const msg = this._readBuffer.readMessage();
        if (msg === null) break;
        this.onmessage?.(msg);
      } catch (err) {
        this.onerror?.(err as Error);
      }
    }
  }

  async start(): Promise<void> {
    if (this._started) {
      throw new Error("StdioTransport already started");
    }
    this._started = true;
    this._stdin.on("data", this._onData);
    this._stdin.on("error", this._onError);
  }

  send(message: JsonRpcMessage): Promise<void> {
    return new Promise((resolve) => {
      const json = JSON.stringify(message) + "\n";
      if ((this._stdout as NodeJS.WriteStream).write(json)) {
        resolve();
      } else {
        this._stdout.once("drain", resolve);
      }
    });
  }

  async close(): Promise<void> {
    this._stdin.off("data", this._onData);
    this._stdin.off("error", this._onError);
    if ((this._stdin as NodeJS.ReadStream).listenerCount("data") === 0) {
      (this._stdin as NodeJS.ReadStream).pause();
    }
    this._readBuffer.clear();
    this.onclose?.();
  }
}
