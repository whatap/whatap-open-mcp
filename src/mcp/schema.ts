// src/mcp/schema.ts
// Minimal Zod-compatible schema builder.
// Drop-in replacement: `import { z } from "../mcp/schema.js"` — same chainable API.
// Produces JSON Schema for MCP tools/list and validates incoming tool arguments.

// ── SchemaNode ───────────────────────────────────────────────────

type SchemaType = "string" | "number" | "boolean" | "enum" | "record";

interface SchemaOpts {
  type: SchemaType;
  isOptional: boolean;
  defaultValue: unknown;
  description: string | undefined;
  enumValues: string[] | undefined;
  recordValueType: SchemaType | undefined;
}

export class SchemaNode {
  private readonly _opts: SchemaOpts;

  constructor(opts: SchemaOpts) {
    this._opts = opts;
  }

  optional(): SchemaNode {
    return new SchemaNode({ ...this._opts, isOptional: true });
  }

  default(value: unknown): SchemaNode {
    return new SchemaNode({ ...this._opts, defaultValue: value });
  }

  describe(desc: string): SchemaNode {
    return new SchemaNode({ ...this._opts, description: desc });
  }

  /** Convert this node to a JSON Schema property definition. */
  toJsonSchema(): Record<string, unknown> {
    const schema: Record<string, unknown> = {};

    switch (this._opts.type) {
      case "string":
        schema.type = "string";
        break;
      case "number":
        schema.type = "number";
        break;
      case "boolean":
        schema.type = "boolean";
        break;
      case "enum":
        schema.type = "string";
        if (this._opts.enumValues) {
          schema.enum = this._opts.enumValues;
        }
        break;
      case "record":
        schema.type = "object";
        schema.additionalProperties = {
          type: this._opts.recordValueType ?? "string",
        };
        break;
    }

    if (this._opts.description) {
      schema.description = this._opts.description;
    }
    if (this._opts.defaultValue !== undefined) {
      schema.default = this._opts.defaultValue;
    }

    return schema;
  }

  /** Validate a single value against this schema. Returns the validated (possibly defaulted) value. */
  validate(value: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
    // Apply default
    if (value === undefined || value === null) {
      if (this._opts.defaultValue !== undefined) {
        return { ok: true, value: this._opts.defaultValue };
      }
      if (this._opts.isOptional) {
        return { ok: true, value: undefined };
      }
      return { ok: false, error: "required" };
    }

    // Type check
    switch (this._opts.type) {
      case "string":
        if (typeof value !== "string")
          return { ok: false, error: `expected string, got ${typeof value}` };
        break;
      case "number":
        if (typeof value !== "number")
          return { ok: false, error: `expected number, got ${typeof value}` };
        break;
      case "boolean":
        if (typeof value !== "boolean")
          return { ok: false, error: `expected boolean, got ${typeof value}` };
        break;
      case "enum":
        if (
          typeof value !== "string" ||
          !this._opts.enumValues?.includes(value)
        ) {
          return {
            ok: false,
            error: `expected one of [${this._opts.enumValues?.join(", ")}], got "${value}"`,
          };
        }
        break;
      case "record":
        if (typeof value !== "object" || value === null || Array.isArray(value))
          return { ok: false, error: `expected object, got ${typeof value}` };
        // Validate all values are strings
        for (const [k, v] of Object.entries(value)) {
          if (typeof v !== "string") {
            return {
              ok: false,
              error: `record value for key "${k}" expected string, got ${typeof v}`,
            };
          }
        }
        break;
    }

    return { ok: true, value };
  }

  /** Check if this field is required (not optional and no default). */
  isRequired(): boolean {
    return !this._opts.isOptional && this._opts.defaultValue === undefined;
  }
}

// ── Schema Builder (the `z` object) ──────────────────────────────

function createNode(type: SchemaType, extra?: Partial<SchemaOpts>): SchemaNode {
  return new SchemaNode({
    type,
    isOptional: false,
    defaultValue: undefined,
    description: undefined,
    enumValues: undefined,
    recordValueType: undefined,
    ...extra,
  });
}

export const z = {
  string: () => createNode("string"),
  number: () => createNode("number"),
  boolean: () => createNode("boolean"),
  enum: (values: readonly [string, ...string[]]) =>
    createNode("enum", { enumValues: values as unknown as string[] }),
  record: (_valueSchema: SchemaNode) =>
    createNode("record", { recordValueType: "string" }),
};

// ── Shape Utilities ──────────────────────────────────────────────

export type SchemaShape = Record<string, SchemaNode>;

/** Convert a shape to JSON Schema object definition. */
export function shapeToJsonSchema(shape: SchemaShape): {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
} {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, node] of Object.entries(shape)) {
    properties[key] = node.toJsonSchema();
    if (node.isRequired()) {
      required.push(key);
    }
  }

  const schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } = { type: "object", properties };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/** Validate an input object against a shape. Applies defaults. */
export function validateShape(
  shape: SchemaShape,
  input: unknown
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: string[] } {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const result: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, node] of Object.entries(shape)) {
    const validation = node.validate(raw[key]);
    if (validation.ok) {
      if (validation.value !== undefined) {
        result[key] = validation.value;
      }
    } else {
      errors.push(`${key}: ${validation.error}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: result };
}
