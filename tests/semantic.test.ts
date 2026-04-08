import { describe, it, expect } from 'vitest';
import { classifyResultType } from '../src/utils/semantic.ts';

describe('classifyResultType', () => {
  it('path "v2/app/tps_oid" → entityLevel "agent"', () => {
    const result = classifyResultType('v2/app/tps_oid');
    expect(result.entityLevel).toBe('agent');
  });

  it('path "v2/app/tps_pcode" → entityLevel "project"', () => {
    const result = classifyResultType('v2/app/tps_pcode');
    expect(result.entityLevel).toBe('project');
  });

  it('path "v2/app/tps_okind" → entityLevel "kind"', () => {
    const result = classifyResultType('v2/app/tps_okind');
    expect(result.entityLevel).toBe('kind');
  });

  it('path "v2/sys/top5_cpu" → resultType "ranking"', () => {
    const result = classifyResultType('v2/sys/top5_cpu');
    expect(result.resultType).toBe('ranking');
  });

  it('path "v2/db/agent_list" → resultType "inventory"', () => {
    const result = classifyResultType('v2/db/agent_list');
    expect(result.resultType).toBe('inventory');
  });

  it('path "v2/container/kube_event" → resultType "events"', () => {
    const result = classifyResultType('v2/container/kube_event');
    expect(result.resultType).toBe('events');
  });

  it('path "v2/app/tps_oid" with selectFields: ["time", "oid", "tps"] → resultType "timeseries"', () => {
    const result = classifyResultType('v2/app/tps_oid', {
      selectFields: ['time', 'oid', 'tps'],
    });
    expect(result.resultType).toBe('timeseries');
  });
});
