// src/yard/parser.ts
// Pure function to parse .mql file content into structured metadata.

import type { MqlMetadata } from "./types.js";

export function parseMqlFile(content: string): MqlMetadata {
  const lines = content.split("\n");

  const categories: string[] = [];
  const parameters = new Set<string>();
  const headerTypes: Record<string, string> = {};
  const selectFields: string[] = [];
  const joins: string[] = [];
  const comments: string[] = [];
  let loadType: MqlMetadata["loadType"] = "unknown";

  let inHeader = false;
  let headerBuffer = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith("--")) {
      const comment = trimmed.slice(2).trim();
      if (comment) comments.push(comment);
      continue;
    }

    // Skip empty lines
    if (!trimmed) continue;

    // CATEGORY — simple or JSON object notation
    if (trimmed.startsWith("CATEGORY")) {
      const rest = trimmed.slice("CATEGORY".length).trim();
      if (rest.startsWith("{")) {
        // JSON object: {"server_base":1h, "server_base{m5}":3d, ...}
        const matches = rest.matchAll(/"([^"]+)"/g);
        for (const m of matches) {
          categories.push(m[1]);
        }
      } else {
        // Simple: CATEGORY server_base
        const name = rest.replace(/\s.*$/, "");
        if (name) categories.push(name);
      }
    }

    // HEADER — may span multiple lines
    if (trimmed.startsWith("HEADER")) {
      const rest = trimmed.slice("HEADER".length).trim();
      if (rest.includes("{")) {
        headerBuffer = rest;
        inHeader = !rest.includes("}");
        if (!inHeader) parseHeader(headerBuffer, headerTypes);
      }
      continue;
    }
    if (inHeader) {
      headerBuffer += " " + trimmed;
      if (trimmed.includes("}")) {
        inHeader = false;
        parseHeader(headerBuffer, headerTypes);
      }
      continue;
    }

    // SELECT — extract field list
    if (trimmed.startsWith("SELECT")) {
      const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        const fields = bracketMatch[1].split(",").map((f) => f.trim()).filter(Boolean);
        for (const f of fields) {
          if (!selectFields.includes(f)) selectFields.push(f);
        }
      }
    }

    // JOIN — extract query path
    if (trimmed.startsWith("JOIN")) {
      const queryMatch = trimmed.match(/query\s*:\s*'([^']+)'/);
      if (queryMatch) {
        joins.push(queryMatch[1]);
      }
    }

    // Detect load type
    if (trimmed === "TAGLOAD" || trimmed.startsWith("TAGLOAD ")) {
      loadType = "TAGLOAD";
    } else if (trimmed === "FLEXLOAD" || trimmed.startsWith("FLEXLOAD ")) {
      loadType = "FLEXLOAD";
    } else if (trimmed.startsWith("LogCountLoad") || trimmed.startsWith("LOGCOUNTLOAD")) {
      loadType = "LogCountLoad";
    }

    // Scan for $parameters in non-comment lines
    const paramMatches = trimmed.matchAll(/\$(\w+)/g);
    for (const m of paramMatches) {
      parameters.add(`$${m[1]}`);
    }
  }

  return {
    raw: content,
    categories,
    parameters: Array.from(parameters),
    headerTypes,
    selectFields,
    joins,
    comments,
    loadType,
  };
}

function parseHeader(
  text: string,
  target: Record<string, string>
): void {
  // Matches patterns like: cpu$:'P'  or  memory_pused$: 'P'  or cpu$:"F"
  const re = /(\w+)\$\s*:\s*['"](\w+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    target[m[1]] = m[2];
  }
}
