import { describe, it, expect } from 'vitest';
import {
  formatMxqlResponse,
  formatProjectList,
  formatAgentList,
} from '../src/utils/format.ts';

describe('formatMxqlResponse', () => {
  it('empty array → contains "No data"', () => {
    const result = formatMxqlResponse([]);
    expect(result).toContain('No data');
  });

  it('sample data with _head_ → contains "cpu", "%", "test-agent"', () => {
    const data = [
      { _head_: { cpu: 'P' } },
      { time: 1700000000000, cpu: 45.2, oname: 'test-agent' },
    ];
    const result = formatMxqlResponse(data);
    expect(result).toContain('cpu');
    expect(result).toContain('%');
    expect(result).toContain('test-agent');
  });

  it('with title option → contains "## title"', () => {
    const data = [
      { _head_: { cpu: 'P' } },
      { time: 1700000000000, cpu: 45.2 },
    ];
    const result = formatMxqlResponse(data, { title: 'My Title' });
    expect(result).toContain('## My Title');
  });
});

describe('formatProjectList', () => {
  it('with projects → contains "123", "Test", "JAVA"', () => {
    const projects = [
      {
        projectCode: 123,
        projectName: 'Test',
        platform: 'JAVA',
        productType: 'APM',
      },
    ];
    const result = formatProjectList(projects);
    expect(result).toContain('123');
    expect(result).toContain('Test');
    expect(result).toContain('JAVA');
  });

  it('empty array → contains "No projects"', () => {
    const result = formatProjectList([]);
    expect(result).toContain('No projects');
  });
});

describe('formatAgentList', () => {
  it('with agents → contains "agent1", "active", "1.2.3.4"', () => {
    const agents = [
      { oname: 'agent1', active: true, host_ip: '1.2.3.4', oid: 999 },
    ];
    const result = formatAgentList(agents);
    expect(result).toContain('agent1');
    expect(result).toContain('active');
    expect(result).toContain('1.2.3.4');
  });
});
