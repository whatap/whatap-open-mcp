#!/usr/bin/env npx tsx
/**
 * whatap-open-mcp acceptance test validator
 *
 * Validates Codex CLI JSONL output (from --json flag) against expected
 * patterns defined in prompts.json.
 *
 * Usage:
 *   npx tsx validate.ts --output <file> --prompt-id <id> --prompts-file <path>
 *
 * Output: JSON object with validation result
 * Exit code: 0 = PASS, 1 = FAIL
 */

import { readFileSync } from "fs";
import { argv, exit } from "process";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface Args {
  output: string;
  promptId: number;
  promptsFile: string;
}

function parseArgs(): Args {
  const args = argv.slice(2);
  let output = "";
  let promptId = 0;
  let promptsFile = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output":
        output = args[++i];
        break;
      case "--prompt-id":
        promptId = parseInt(args[++i], 10);
        break;
      case "--prompts-file":
        promptsFile = args[++i];
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        exit(2);
    }
  }

  if (!output || !promptId || !promptsFile) {
    console.error(
      "Usage: npx tsx validate.ts --output <file> --prompt-id <id> --prompts-file <path>"
    );
    exit(2);
  }

  return { output, promptId, promptsFile };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptDef {
  id: number;
  category: string;
  prompt: string;
  expected_tools: string[];
  required_patterns: string[];
  forbidden_patterns: string[];
  min_length: number;
  max_tool_calls?: number;
}

interface CheckResult {
  passed: boolean;
  detail: string;
}

interface ValidationResult {
  id: number;
  status: "PASS" | "FAIL";
  checks: {
    min_length: CheckResult;
    expected_tools: CheckResult;
    required_patterns: CheckResult;
    forbidden_patterns: CheckResult;
    tool_call_count: CheckResult;
  };
  reason: string;
}

// ---------------------------------------------------------------------------
// JSONL parsing — extract text content and tool call names from Codex --json
// ---------------------------------------------------------------------------

interface ParsedOutput {
  /** All text content (agent messages + tool results) concatenated */
  fullText: string;
  /** Unique tool names that were called */
  uniqueTools: string[];
  /** Total invocation count (each call counted once) */
  totalInvocations: number;
  /** Ordered list of each invocation's tool name */
  invocationSequence: string[];
}

function parseCodexJsonl(raw: string): ParsedOutput {
  const lines = raw.split("\n").filter((l) => l.trim());
  const textParts: string[] = [];
  const uniqueTools = new Set<string>();
  const invocationSequence: string[] = [];

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      // Not JSON — treat as plain text (fallback for non-JSONL output)
      textParts.push(line);
      continue;
    }

    const eventType = event.type as string | undefined;
    const item = event.item as Record<string, unknown> | undefined;
    if (!item) continue;

    // Only count completed tool calls (avoid double-counting started+completed)
    if (
      item.type === "mcp_tool_call" &&
      typeof item.tool === "string" &&
      eventType === "item.completed"
    ) {
      uniqueTools.add(item.tool);
      invocationSequence.push(item.tool);

      // Extract text from tool result
      const result = item.result as Record<string, unknown> | undefined;
      if (result?.content && Array.isArray(result.content)) {
        for (const c of result.content) {
          if (c && typeof c === "object" && "text" in c) {
            textParts.push(String(c.text));
          }
        }
      }
    }

    // Extract agent message text
    if (item.type === "agent_message" && typeof item.text === "string") {
      textParts.push(item.text);
    }
  }

  return {
    fullText: textParts.join("\n"),
    uniqueTools: [...uniqueTools],
    totalInvocations: invocationSequence.length,
    invocationSequence,
  };
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

function checkMinLength(content: string, minLength: number): CheckResult {
  const actualLength = content.length;
  const passed = actualLength >= minLength;
  return {
    passed,
    detail: passed
      ? `length ${actualLength} >= ${minLength}`
      : `length ${actualLength} < ${minLength}`,
  };
}

function checkExpectedTools(
  parsed: ParsedOutput,
  expectedTools: string[]
): CheckResult {
  const found: string[] = [];

  for (const expected of expectedTools) {
    const expectedLower = expected.toLowerCase();
    // Check in tool call names from JSONL trace
    const inTrace = parsed.uniqueTools.some(
      (t) => t.toLowerCase() === expectedLower ||
             t.toLowerCase().endsWith(expectedLower)
    );
    // Also check if tool name appears in text content (fallback)
    const inText = parsed.fullText.toLowerCase().includes(expectedLower);

    if (inTrace || inText) {
      found.push(expected);
    }
  }

  const passed = found.length > 0;
  return {
    passed,
    detail: passed
      ? `found tools: [${found.join(", ")}] (called: [${parsed.uniqueTools.join(", ")}])`
      : `no expected tools found (expected: [${expectedTools.join(", ")}], called: [${parsed.uniqueTools.join(", ")}])`,
  };
}

function checkRequiredPatterns(
  content: string,
  patterns: string[]
): CheckResult {
  const failures: string[] = [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, "i");
      if (!regex.test(content)) {
        failures.push(pattern);
      }
    } catch {
      if (!content.toLowerCase().includes(pattern.toLowerCase())) {
        failures.push(pattern);
      }
    }
  }

  const passed = failures.length === 0;
  return {
    passed,
    detail: passed
      ? `all ${patterns.length} required patterns matched`
      : `missing patterns: [${failures.join(", ")}]`,
  };
}

function checkForbiddenPatterns(
  content: string,
  patterns: string[]
): CheckResult {
  const violations: string[] = [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(content)) {
        violations.push(pattern);
      }
    } catch {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        violations.push(pattern);
      }
    }
  }

  const passed = violations.length === 0;
  return {
    passed,
    detail: passed
      ? `no forbidden patterns found`
      : `forbidden patterns matched: [${violations.join(", ")}]`,
  };
}

function checkToolCallCount(
  parsed: ParsedOutput,
  maxToolCalls: number | undefined
): CheckResult {
  const count = parsed.totalInvocations;
  if (maxToolCalls === undefined) {
    return { passed: true, detail: `${count} invocations (no limit set)` };
  }
  const passed = count <= maxToolCalls;
  return {
    passed,
    detail: passed
      ? `${count} invocations <= ${maxToolCalls} max`
      : `${count} invocations exceeds limit of ${maxToolCalls} (sequence: ${parsed.invocationSequence.join(" → ")})`,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs();

  // Load prompts file
  let prompts: PromptDef[];
  try {
    const raw = readFileSync(args.promptsFile, "utf-8");
    prompts = JSON.parse(raw);
  } catch {
    console.error(`Failed to read prompts file: ${args.promptsFile}`);
    exit(2);
  }

  // Find the prompt definition
  const promptDef = prompts.find((p) => p.id === args.promptId);
  if (!promptDef) {
    console.error(`Prompt ID ${args.promptId} not found in ${args.promptsFile}`);
    exit(2);
  }

  // Read output file
  let rawContent: string;
  try {
    rawContent = readFileSync(args.output, "utf-8");
  } catch {
    const result: ValidationResult = {
      id: args.promptId,
      status: "FAIL",
      checks: {
        min_length: { passed: false, detail: "output file not readable" },
        expected_tools: { passed: false, detail: "output file not readable" },
        required_patterns: { passed: false, detail: "output file not readable" },
        forbidden_patterns: { passed: true, detail: "n/a" },
        tool_call_count: { passed: false, detail: "output file not readable" },
      },
      reason: "output file not readable",
    };
    console.log(JSON.stringify(result));
    exit(1);
  }

  // Parse JSONL output from Codex --json
  const parsed = parseCodexJsonl(rawContent);

  // Run all checks against the full text content
  const minLengthCheck = checkMinLength(parsed.fullText, promptDef.min_length);
  const toolsCheck = checkExpectedTools(parsed, promptDef.expected_tools);
  const requiredCheck = checkRequiredPatterns(
    parsed.fullText,
    promptDef.required_patterns
  );
  const forbiddenCheck = checkForbiddenPatterns(
    parsed.fullText,
    promptDef.forbidden_patterns
  );
  const toolCountCheck = checkToolCallCount(
    parsed,
    promptDef.max_tool_calls
  );

  const allPassed =
    minLengthCheck.passed &&
    toolsCheck.passed &&
    requiredCheck.passed &&
    forbiddenCheck.passed &&
    toolCountCheck.passed;

  const failReasons: string[] = [];
  if (!minLengthCheck.passed)
    failReasons.push(`min_length: ${minLengthCheck.detail}`);
  if (!toolsCheck.passed) failReasons.push(`tools: ${toolsCheck.detail}`);
  if (!requiredCheck.passed)
    failReasons.push(`patterns: ${requiredCheck.detail}`);
  if (!forbiddenCheck.passed)
    failReasons.push(`forbidden: ${forbiddenCheck.detail}`);
  if (!toolCountCheck.passed)
    failReasons.push(`efficiency: ${toolCountCheck.detail}`);

  const result: ValidationResult = {
    id: args.promptId,
    status: allPassed ? "PASS" : "FAIL",
    checks: {
      min_length: minLengthCheck,
      expected_tools: toolsCheck,
      required_patterns: requiredCheck,
      forbidden_patterns: forbiddenCheck,
      tool_call_count: toolCountCheck,
    },
    reason: allPassed ? "all checks passed" : failReasons.join("; "),
  };

  console.log(JSON.stringify(result));
  exit(allPassed ? 0 : 1);
}

main();
