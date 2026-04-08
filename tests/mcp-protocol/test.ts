import { McpTestClient } from "./client.js";
import { resolve } from "path";

const SERVER_PATH = resolve(process.cwd(), "dist/index.js");
const WHATAP_TOKEN = process.env.WHATAP_API_TOKEN;

if (!WHATAP_TOKEN) {
  console.error("WHATAP_API_TOKEN required");
  process.exit(2);
}

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: (client: McpTestClient) => Promise<string>): Promise<void> {
  // Each test gets a fresh client (fresh server process)
  const client = new McpTestClient(SERVER_PATH, { WHATAP_API_TOKEN: WHATAP_TOKEN! });
  const start = Date.now();
  try {
    await client.initialize();
    const detail = await fn(client);
    results.push({ name, status: "PASS", detail, durationMs: Date.now() - start });
    console.log(`  PASS: ${name} (${Date.now() - start}ms)`);
  } catch (err) {
    const msg = (err as Error).message;
    results.push({ name, status: "FAIL", detail: msg, durationMs: Date.now() - start });
    console.log(`  FAIL: ${name} — ${msg}`);
  } finally {
    await client.close();
  }
}

async function main() {
  console.log("MCP Protocol Tests\n");

  // Test 1: tools/list returns 10 tools
  await runTest("tools/list returns 10 tools", async (c) => {
    const tools = await c.listTools();
    if (tools.length < 10) throw new Error(`Expected >= 10 tools, got ${tools.length}`);
    const names = tools.map((t: any) => t.name).sort();
    return `${tools.length} tools: ${names.join(", ")}`;
  });

  // Test 2: whatap_list_projects
  await runTest("whatap_list_projects returns projects", async (c) => {
    const result = await c.callTool("whatap_list_projects");
    const text = result.content[0]?.text ?? "";
    if (!text.includes("pcode")) throw new Error("Response missing 'pcode'");
    if (text.length < 100) throw new Error(`Response too short: ${text.length} chars`);
    const match = text.match(/(\d+) total/);
    return `${match ? match[1] : "?"} projects returned`;
  });

  // Test 3: whatap_project_info
  await runTest("whatap_project_info(29763) returns INFRA", async (c) => {
    const result = await c.callTool("whatap_project_info", { projectCode: 29763 });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("29763")) throw new Error("Response missing project code");
    return `Got project info (${text.length} chars)`;
  });

  // Test 4: whatap_list_agents
  await runTest("whatap_list_agents(5490) returns agents", async (c) => {
    const result = await c.callTool("whatap_list_agents", { projectCode: 5490 });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("Agents") && !text.includes("agent")) throw new Error("Response missing agent info");
    return `Got agents (${text.length} chars)`;
  });

  // Test 5: whatap_data_availability with projectCode
  await runTest("whatap_data_availability(29763) shows categories", async (c) => {
    const result = await c.callTool("whatap_data_availability", { projectCode: 29763 });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("Available") && !text.includes("active") && !text.includes("category")) {
      throw new Error("Response missing availability info");
    }
    return `Got availability (${text.length} chars)`;
  });

  // Test 6: whatap_describe_query
  await runTest("whatap_describe_query(v2/app/tps_pcode) describes query", async (c) => {
    const result = await c.callTool("whatap_describe_query", { path: "v2/app/tps_pcode" });
    const text = result.content[0]?.text ?? "";
    if (!text.toLowerCase().includes("tps")) throw new Error("Response missing TPS info");
    return `Got description (${text.length} chars)`;
  });

  // Test 7: whatap_query_data — server CPU
  await runTest("whatap_query_data(29763, server_base) returns data", async (c) => {
    const result = await c.callTool("whatap_query_data", {
      projectCode: 29763,
      path: "v2/sys/server_base",
      timeRange: "5m",
    });
    const text = result.content[0]?.text ?? "";
    if (text.includes("No data") || text.length < 50) throw new Error("No data returned");
    return `Got server data (${text.length} chars)`;
  });

  // Test 8: whatap_query_data — APM TPS
  await runTest("whatap_query_data(5490, tps_pcode) returns data", async (c) => {
    const result = await c.callTool("whatap_query_data", {
      projectCode: 5490,
      path: "v2/app/tps_pcode",
      timeRange: "5m",
    });
    const text = result.content[0]?.text ?? "";
    // APM may or may not have data — check it's not an error
    if (result.isError) throw new Error(`Tool error: ${text}`);
    return `Got APM data (${text.length} chars)`;
  });

  // Test 9: whatap_apm_anomaly
  await runTest("whatap_apm_anomaly(5490) returns analysis", async (c) => {
    const result = await c.callTool("whatap_apm_anomaly", {
      projectCode: 5490,
      timeRange: "5m",
      sensitivity: "medium",
    });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("Anomaly") && !text.includes("anomaly") && !text.includes("APM")) {
      throw new Error("Response missing anomaly analysis");
    }
    return `Got anomaly analysis (${text.length} chars)`;
  });

  // Test 10: whatap_install_agent
  await runTest("whatap_install_agent(29763) returns commands", async (c) => {
    const result = await c.callTool("whatap_install_agent", { projectCode: 29763 });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("accesskey") && !text.includes("install") && !text.includes("Install")) {
      throw new Error("Response missing install info");
    }
    return `Got install guide (${text.length} chars)`;
  });

  // Test 11: whatap_data_availability — DB project
  await runTest("whatap_data_availability(28458) shows DB categories", async (c) => {
    const result = await c.callTool("whatap_data_availability", { projectCode: 28458 });
    const text = result.content[0]?.text ?? "";
    if (text.length < 50) throw new Error("Response too short");
    return `Got DB availability (${text.length} chars)`;
  });

  // Test 12: Error handling — invalid project
  await runTest("Invalid projectCode returns actionable error", async (c) => {
    const result = await c.callTool("whatap_query_data", {
      projectCode: 999999,
      path: "v2/sys/server_base",
      timeRange: "5m",
    });
    const text = result.content[0]?.text ?? "";
    if (!text.includes("Error") && !text.includes("error") && !text.includes("not found")) {
      throw new Error("Expected error response for invalid project");
    }
    if (!text.includes("list_projects")) {
      throw new Error("Error response should suggest list_projects");
    }
    return `Got actionable error (${text.length} chars)`;
  });

  // Summary
  console.log("\n---");
  const passed = results.filter(r => r.status === "PASS").length;
  const total = results.length;
  const totalTime = results.reduce((a, r) => a + r.durationMs, 0);
  console.log(`Result: ${passed}/${total} passed (${Math.round(totalTime / 1000)}s total)\n`);

  // Output JSON report
  const report = { total, passed, failed: total - passed, results };
  console.log(JSON.stringify(report));

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(2);
});
