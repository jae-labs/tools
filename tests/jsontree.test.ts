import { describe, expect, it } from 'vitest';
import { analyzeJsonTree, formatJsonPath, searchJsonTree } from '../src/shared/jsontree.ts';

describe('JSON Browser helpers', () => {
  it('formats JSONPath segments for simple keys, indices, and special keys', () => {
    expect(formatJsonPath([])).toBe('$');
    expect(formatJsonPath(['services', 0, 'host'])).toBe('$.services[0].host');
    expect(formatJsonPath(['headers', 'content-type'])).toBe('$.headers["content-type"]');
  });

  it('analyzes nested JSON tree stats accurately', () => {
    const sample = {
      name: 'tools',
      regions: ['eu-central-1', 'us-east-1'],
      meta: { active: true, count: 2 },
    };
    const stats = analyzeJsonTree(sample);
    expect(stats.objects).toBe(2);
    expect(stats.arrays).toBe(1);
    expect(stats.primitives).toBe(5);
    expect(stats.totalNodes).toBe(8);
    expect(stats.maxDepth).toBe(2);
  });

  it('finds matching key/value paths and marks ancestor branches', () => {
    const sample = {
      service: {
        name: 'jae-tools',
        nodes: [{ region: 'eu-central-1', healthy: true }],
      },
      other: { flag: false },
    };
    const res = searchJsonTree(sample, 'eu-central');
    expect(res.matchedPaths.has('$.service.nodes[0].region')).toBe(true);
    expect(res.ancestorPaths.has('$')).toBe(true);
    expect(res.ancestorPaths.has('$.service')).toBe(true);
    expect(res.ancestorPaths.has('$.service.nodes')).toBe(true);
    expect(res.ancestorPaths.has('$.service.nodes[0]')).toBe(true);
    expect(res.ancestorPaths.has('$.other')).toBe(false);
  });
});
