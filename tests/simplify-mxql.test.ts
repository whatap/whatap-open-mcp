// tests/simplify-mxql.test.ts
// describe_query hides some directives from the displayed MXQL. That stripping
// used to be line-based, so a multi-line RENAME lost its first line and left the
// continuation lines and closing bracket behind — 39 of 815 paths rendered as
// syntactically broken MXQL, and readers concluded the collector's .mql was
// malformed when the display had invented the defect.

import { describe, it, expect } from "vitest";
import { CATALOG_RAW } from "../src/data/mxql-catalog.js";
import { simplifyRawMxql } from "../src/utils/simplify-mxql.js";
import { translateMxqlComments } from "../src/utils/mxql-comments.js";

/** Net bracket/brace balance, ignoring quoted text. */
function balance(s: string): { brackets: number; braces: number } {
  let brackets = 0, braces = 0, quote: string | null = null;
  for (const c of s) {
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === "[") brackets++;
    else if (c === "]") brackets--;
    else if (c === "{") braces++;
    else if (c === "}") braces--;
  }
  return { brackets, braces };
}

describe("simplifyRawMxql", () => {
  it("removes a multi-line RENAME whole, brackets included", () => {
    const raw = [
      "CATEGORY db3_stat_tx",
      "GROUP { timeunit:5m, pk:[oid] }",
      "RENAME [[tx_time_sum, timeSum]",
      "       ,[tx_count, count]",
      "       ,[tx_error, error]",
      "]",
      "SELECT [oid, count]",
    ].join("\n");

    const out = simplifyRawMxql(raw);
    expect(out).not.toContain("RENAME");
    expect(out).not.toContain("timeSum");
    expect(out).not.toContain("tx_count, count");
    expect(out).toContain("SELECT [oid, count]");
    expect(balance(out)).toEqual({ brackets: 0, braces: 0 });
  });

  it("removes a single-line directive without eating the next line", () => {
    const raw = "CATEGORY x\nRENAME {src:a, dst:b}\nSELECT [b]";
    expect(simplifyRawMxql(raw)).toBe("CATEGORY x\nSELECT [b]");
  });

  it("keeps CREATE — derived fields are part of the output contract", () => {
    const raw = 'CATEGORY x\nCREATE { key: timeAvg, expr: "a/b" }\nSELECT [timeAvg]';
    expect(simplifyRawMxql(raw)).toContain("timeAvg");
  });

  it("does not mistake a bracket inside a quoted string for structure", () => {
    const raw = `CATEGORY x\nRENAME {src:'a[', dst:b}\nSELECT [b]`;
    expect(simplifyRawMxql(raw)).toBe("CATEGORY x\nSELECT [b]");
  });

  it("terminates on an unbalanced directive at end of input", () => {
    expect(simplifyRawMxql("CATEGORY x\nRENAME [[a, b]")).toBe("CATEGORY x");
  });
});

describe("every displayed MXQL body stays syntactically intact", () => {
  // The guard that would have caught the original bug.
  it("never turns a balanced source body into an unbalanced displayed body", () => {
    const broken: string[] = [];
    for (const [path, raw] of Object.entries(CATALOG_RAW)) {
      const src = balance(raw);
      if (src.brackets !== 0 || src.braces !== 0) continue; // source already odd
      const shown = balance(simplifyRawMxql(translateMxqlComments(raw)));
      if (shown.brackets !== 0 || shown.braces !== 0) {
        broken.push(`${path} (brackets ${shown.brackets}, braces ${shown.braces})`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("never closes a bracket that was never opened", () => {
    // A lone `]` on its own line is legitimate — it closes a multi-line PART-BY
    // or HEADER. What is never legitimate is the running depth going negative,
    // which is exactly what stripping a directive's first line but not its
    // continuation produced.
    const negative: string[] = [];
    for (const [path, raw] of Object.entries(CATALOG_RAW)) {
      if (balance(raw).brackets !== 0 || balance(raw).braces !== 0) continue;
      const shown = simplifyRawMxql(translateMxqlComments(raw));
      let depth = 0;
      for (const line of shown.split("\n")) {
        depth += balance(line).brackets + balance(line).braces;
        if (depth < 0) {
          negative.push(`${path}: ${line.trim()}`);
          break;
        }
      }
    }
    expect(negative).toEqual([]);
  });

  it("the reported path renders clean and keeps its derived field", () => {
    const shown = simplifyRawMxql(
      translateMxqlComments(CATALOG_RAW["mxql/apm/stat/transaction_diff"])
    );
    expect(balance(shown)).toEqual({ brackets: 0, braces: 0 });
    expect(shown).toContain("timeAvg");
    expect(shown).not.toMatch(/^\s*,\[/m);
  });
});
