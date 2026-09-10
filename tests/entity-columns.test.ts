import { describe, it, expect } from 'vitest';
import { formatMxqlResponse } from '../src/utils/format.ts';

// Rows below are verbatim server responses captured on 2026-09-10 (pcode 5490 /
// 29763 / 33194). Many catalog queries move the entity identity into `_id_` and
// `_name_` — `CREATE {key:_name_, from:oname}` + `DELETE [oid,oname]`, or
// `RENAME {dst:_name_, src:oname}` which consumes `oname` outright — and the
// formatter used to strip both as internal metadata. 362 catalog paths carry no
// other human-readable identity, so their rows arrived unattributable.

const gcOid = [
  { _head_: { 'gc_time$': 'ms', 'gc_count$': 'I' } },
  { rownum: 1, time: 1789029205000, gc_time: 17.375, gc_count: 8, gc_oldgen: 0, _id_: -1128904592, _name_: 'demo-8100' },
  { rownum: 2, time: 1789029205000, gc_time: 17.77, gc_count: 9, gc_oldgen: 0, _id_: -877561626, _name_: 'demo-8101' },
  { rownum: 3, time: 1789029205000, gc_time: 31.14, gc_count: 7, gc_oldgen: 0, _id_: 633280970, _name_: 'demo-8103' },
];

const tpsOid = [
  { _head_: { 'tps$': 'F' } },
  { time: 1789028655000, pcode: 5490, tps: 0, _id_: '5490_correlations-mysql', _name_: 'correlations-mysql' },
  { time: 1789028655000, pcode: 5490, tps: 32.83, _id_: '5490_demo-8103', _name_: 'demo-8103' },
];

// process_oid keeps `name` (the process) and `hash`; `_name_`/`_id_` merely copy them.
const processOid = [
  { oid: -1187373871, time: 1789029332000, name: 'whatap_dotnet.exe', hash: -19050580, cpu: 0.53, _id_: -19050580, _name_: 'whatap_dotnet.exe' },
  { oid: -1187373871, time: 1789029332000, name: 'zabbix_agentd.exe', hash: -295201833, cpu: 1.23, _id_: -295201833, _name_: 'zabbix_agentd.exe' },
];

// kube_pod_stat has a real `name` column that differs from `_name_` on some rows.
const kubePodStat = [
  { rownum: 1, time: 1789029260000, kind: 'cluster', available_pod: 57, name: null, _id_: null, _name_: null },
  { rownum: 2, time: 1789029260000, kind: 'DaemonSet', available_pod: 0, name: 'ebs-csi-node-windows', _id_: 'ebs-csi-node-windows', _name_: 'ebs-csi-node-windows' },
];

describe('entity columns (_id_ / _name_)', () => {
  it('shows both when they are the only identity in the response', () => {
    const out = formatMxqlResponse(gcOid);
    expect(out).toContain('_name_');
    expect(out).toContain('demo-8100');
    expect(out).toContain('_id_');
    expect(out).toContain('-1128904592');
  });

  it('explains what the entity columns mean', () => {
    const out = formatMxqlResponse(gcOid);
    expect(out).toContain('*Entity columns*');
    expect(out).toContain('entity display name');
    // _id_ is a per-query series key, not a stable global id — say so.
    expect(out).toContain('series key');
  });

  it('places identity next to time rather than after the metrics', () => {
    const header = formatMxqlResponse(gcOid).split('\n').find((l) => l.startsWith('| rownum'))!;
    expect(header.indexOf('_name_')).toBeLessThan(header.indexOf('gc_time'));
  });

  it('keeps a composite _id_ (pcode_oname) distinct from _name_', () => {
    const out = formatMxqlResponse(tpsOid);
    expect(out).toContain('5490_demo-8103');
    expect(out).toContain('correlations-mysql');
  });

  it('suppresses an entity column that only duplicates an existing one', () => {
    const out = formatMxqlResponse(processOid);
    expect(out).toContain('whatap_dotnet.exe'); // still identified, via `name`
    expect(out).not.toContain('_name_');        // no duplicate column
    expect(out).not.toContain('_id_');          // duplicates `hash`
    expect(out).not.toContain('*Entity columns*'); // nothing to explain
  });

  it('never overwrites a real `name` column — both are rendered', () => {
    const out = formatMxqlResponse(kubePodStat);
    const header = out.split('\n').find((l) => l.startsWith('|'))!;
    // `_name_` differs from `name` on the cluster row (null vs null) but the
    // point is that renaming would have collapsed two distinct columns into one.
    expect(header).toContain('name');
    expect(out).toContain('ebs-csi-node-windows');
  });

  it('does not treat identity as a metric in the summary', () => {
    const out = formatMxqlResponse(gcOid);
    const summary = out.split('\n').find((l) => l.startsWith('**Summary**')) ?? '';
    expect(summary).not.toContain('_id_');
    expect(summary).not.toContain('_name_');
    expect(summary).toContain('gc_time');
  });

  it('still hides pure bookkeeping columns', () => {
    const out = formatMxqlResponse([
      { time: 1, cpu: 1, _type_: 'x', _rows_: 3, _name_: 'host-1' },
    ]);
    expect(out).not.toContain('_type_');
    expect(out).not.toContain('_rows_');
    expect(out).toContain('host-1');
  });
});
