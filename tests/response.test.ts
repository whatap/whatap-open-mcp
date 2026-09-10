import { describe, it, expect } from 'vitest';
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
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

describe('buildNoDataResponse', () => {
  const echo = {
    endpoint: 'mxql/text' as const,
    sentMql: 'CATEGORY app_counter\nTAGLOAD\nSELECT [tps]',
    stime: 1789018714682,
    etime: 1789020514682,
    limit: 100,
    pageKey: 'mxql',
    rawRowCount: 0,
    dataRowCount: 0,
  };

  it('no longer asserts a cause it cannot know', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      timeRange: '6h',
    }).content[0].text;
    expect(text).not.toContain('Time range may be too narrow');
    expect(text).not.toContain('No active agents sending data');
    expect(text).toContain('Not known');
  });

  it('tells the caller not to report the result as "not measured"', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      echo,
    }).content[0].text;
    expect(text).toContain('not measured');
    expect(text).toContain('not evidence');
  });

  it('echoes the executed MXQL, the window in both zones, and row counts', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      timeRange: '6h',
      echo,
    }).content[0].text;
    expect(text).toContain('CATEGORY app_counter');
    expect(text).toContain('Endpoint: `mxql/text`');
    expect(text).toContain('UTC:');
    expect(text).toContain('KST:');
    expect(text).toContain('0 returned');
  });

  it('labels a path-endpoint query as server-expanded rather than claiming it is the executed text', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      echo: {
        ...echo,
        endpoint: 'mxql/path',
        sentMql: '/v2/container/kube_pod_stat',
        serverExpanded: true,
        catalogRawMxql: 'CATEGORY kube_pod_stat\nTAGLOAD',
      },
    }).content[0].text;
    expect(text).toContain('a path reference');
    expect(text).toContain('not the executed text');
    expect(text).not.toContain('sent verbatim');
  });

  it('flags leftover markers in the echoed MXQL as "not executed as intended"', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      echo: { ...echo, sentMql: 'CATEGORY db3_stat_tx\n<% AGENT %>\nFLEXLOAD' },
    }).content[0].text;
    expect(text).toContain('unresolved');
    expect(text).toContain('not executed as');
  });

  it('keeps the category hint but labels it a catalog convention, not a measurement', () => {
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      category: 'kube_pod_stat',
      echo,
    }).content[0].text;
    // kube_pod_stat is not in CATEGORY_PLATFORMS; app_counter is.
    const withKnown = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      category: 'app_counter',
      echo,
    }).content[0].text;
    expect(withKnown).toContain('catalog convention');
    expect(withKnown).not.toContain('Project type mismatch');
    expect(text).toBeTruthy();
  });

  it('truncates a very long MXQL echo instead of dumping it whole', () => {
    const huge = 'CATEGORY x\n' + 'SELECT [a]\n'.repeat(400);
    const text = buildNoDataResponse({
      toolName: 'whatap_query_data',
      projectCode: 5490,
      echo: { ...echo, sentMql: huge },
    }).content[0].text;
    expect(text).toContain('truncated');
    expect(text.length).toBeLessThan(huge.length);
  });
});

// ─── Regression: data columns named like errors (1.4.0 → 1.4.1) ────────────
//
// `mxql/app/stat_error_pcode` is FLEXLOAD with no SELECT, so it returns every
// field of the `stat_error` category — including `msg`, an error-message hash.
// 1.4.0 had "msg" in the error-key list and reported every such row as a failed
// query. Reported by an engineer against pcode 37751; the row below is theirs.

describe('extractServerError — must not fire on data rows', () => {
  const statErrorRow = {
    pcode: 37751,
    pname: 'HCMS',
    time: 1789012800000,
    oid: 1343766450,
    classHash: 354851430,
    serviceHash: 625921299,
    msg: -1233599648,
    errorSnapId: '8700176238577990796',
    count: 31,
    stime: 1789012800000,
    etime: 1789013099990,
  };

  it('does not treat a numeric `msg` hash as a server error', () => {
    expect(extractServerError([statErrorRow])).toBeNull();
  });

  it('does not fire on a full stat_error response with a _head_ row', () => {
    const wire = [{ _head_: { 'tx_error$': '#' } }, statErrorRow, { ...statErrorRow, msg: 226395946 }];
    expect(extractServerError(wire)).toBeNull();
  });

  it('does not treat a renamed `error` metric column as a server error', () => {
    // 31 catalog paths do RENAME [[tx_error, error]].
    const row = { time: 1789012800000, oid: 1343766450, count: 12, error: 3 };
    expect(extractServerError([row])).toBeNull();
  });

  it('does not fire when `error` holds a number even on its own', () => {
    expect(extractServerError([{ error: 226395946 }])).toBeNull();
  });

  it('does not fire on a log row carrying a string `msg`', () => {
    const logRow = { time: 1789012800000, level: 'ERROR', msg: 'connection refused', host: 'web-01' };
    expect(extractServerError([logRow])).toBeNull();
  });

  it('still detects the shapes the server actually sends', () => {
    expect(extractServerError([{ error: "A JSONObject text must begin with '{' at 1" }]))
      .toContain('JSONObject');
    expect(extractServerError([{ error: 'not found /v2/app/nope' }]))
      .toBe('not found /v2/app/nope');
    expect(extractServerError([{ _head_: { a: 'F' } }, { error: 'query breaker tripped' }]))
      .toBe('query breaker tripped');
    expect(extractServerError([{ error: 'boom', code: 400 }])).toBe('boom');
  });
});
