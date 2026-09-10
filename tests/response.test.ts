import { describe, it, expect } from 'vitest';
import {
  classifyAndBuildError,
  appendNextSteps,
  buildServerErrorResponse,
  extractServerError,
} from '../src/utils/response.ts';

describe('classifyAndBuildError', () => {
  it('No API token → text contains "list_projects"', () => {
    const err = new Error('No API token found for project 999');
    const result = classifyAndBuildError(err, {
      toolName: 'whatap_query_data',
      projectCode: 999,
    });
    const text = result.content[0].text;
    expect(text).toContain('list_projects');
  });

  it('429 Too Many Requests → text contains "rate limit", retryable', () => {
    const err = new Error('429 Too Many Requests');
    const result = classifyAndBuildError(err, {
      toolName: 'whatap_query_data',
    });
    const text = result.content[0].text;
    expect(text.toLowerCase()).toContain('rate limit');
    expect(text).toContain('retry');
  });

  it('401 Unauthorized → text contains "Authentication"', () => {
    const err = new Error('401 Unauthorized');
    const result = classifyAndBuildError(err, {
      toolName: 'whatap_query_data',
    });
    const text = result.content[0].text;
    expect(text).toContain('Authentication');
  });

  it('timeout → text contains "timed out"', () => {
    const err = new Error('timeout');
    const result = classifyAndBuildError(err, {
      toolName: 'whatap_query_data',
    });
    const text = result.content[0].text;
    expect(text).toContain('timed out');
  });
});

describe('appendNextSteps', () => {
  it('whatap_list_projects → contains "data_availability"', () => {
    const result = appendNextSteps('hello', 'whatap_list_projects');
    expect(result).toContain('data_availability');
  });

  it('whatap_query_data → contains "data_availability"', () => {
    const result = appendNextSteps('hello', 'whatap_query_data');
    expect(result).toContain('data_availability');
  });
});

// ─── Server error rows (ticket: "No data found" vs query failure) ──────────

describe('extractServerError', () => {
  it('finds the error row shape the server actually returns (verified live 2026-09-10)', () => {
    const wire = [{ error: "A JSONObject text must begin with '{' at 1 [character 2 line 1]" }];
    expect(extractServerError(wire)).toContain('JSONObject text must begin');
  });

  it('does not gate on the message content — no "not found" required', () => {
    expect(extractServerError([{ error: 'anything at all' }])).toBe('anything at all');
  });

  it('finds an error row that is not the only row', () => {
    const wire = [{ _head_: ['a'] }, { a: 1 }, { error: 'boom' }];
    expect(extractServerError(wire)).toBe('boom');
  });

  it('returns null for a clean result, an empty array and a non-array', () => {
    expect(extractServerError([{ tps: 40.1 }, { tps: 0 }])).toBeNull();
    expect(extractServerError([])).toBeNull();
    expect(extractServerError(null)).toBeNull();
    expect(extractServerError({ error: 'not an array' })).toBeNull();
  });

  it('ignores empty error values so a blank column is not an error', () => {
    expect(extractServerError([{ error: '' }, { error: null }])).toBeNull();
  });
});

describe('buildServerErrorResponse', () => {
  it('sets isError, shows the server message verbatim, and forbids retry', () => {
    const r = buildServerErrorResponse({
      toolName: 'whatap_query_data',
      serverMessage: "A JSONObject text must begin with '{'",
      projectCode: 5490,
      path: 'apm/stat/transaction_diff',
      timeRange: '6h',
    });
    expect(r.isError).toBe(true);
    const text = r.content[0].text;
    expect(text).toContain("A JSONObject text must begin with '{'");
    expect(text).toContain('not** an absence of data');
    expect(text).toContain('Do NOT retry');
    // The whole point of the ticket: this must not read as missing data.
    expect(text).not.toContain('No data found');
  });
});
