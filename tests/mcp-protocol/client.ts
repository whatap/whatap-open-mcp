import { spawn } from "child_process";
import type { ChildProcess } from "child_process";

export class McpTestClient {
  private proc: ChildProcess;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, { resolve: Function; reject: Function }>();

  constructor(serverPath: string, env?: Record<string, string>) {
    this.proc = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });

    this.proc.stdout!.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString();
      // Parse newline-delimited JSON
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop()!; // keep incomplete last line
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const p = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message));
            else p.resolve(msg.result);
          }
        } catch {
          // ignore non-JSON lines (e.g. stderr leak)
        }
      }
    });
  }

  async request(method: string, params?: unknown): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 30000);

      this.pending.set(id, {
        resolve: (v: any) => { clearTimeout(timer); resolve(v); },
        reject: (e: any) => { clearTimeout(timer); reject(e); },
      });

      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      this.proc.stdin!.write(msg + "\n");
    });
  }

  async initialize(): Promise<any> {
    return this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "mcp-test", version: "1.0" },
    });
  }

  async listTools(): Promise<any[]> {
    const result = await this.request("tools/list");
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
    return this.request("tools/call", { name, arguments: args });
  }

  async close(): Promise<void> {
    // End stdin and terminate the server process
    this.proc.stdin!.end();
    this.proc.kill("SIGTERM");
    return new Promise<void>(resolve => {
      this.proc.on("close", () => resolve());
      setTimeout(() => { this.proc.kill("SIGKILL"); resolve(); }, 5000);
    });
  }
}
