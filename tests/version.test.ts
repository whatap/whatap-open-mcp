import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/version.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('version', () => {
  it('VERSION matches package.json version', () => {
    const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(VERSION).toBe(pkg.version);
  });
});
