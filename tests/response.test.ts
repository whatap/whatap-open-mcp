import { describe, it, expect } from 'vitest';
import {
  classifyAndBuildError,
  appendNextSteps,
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
