import { describe, it, expect } from 'vitest';

describe('Example tests', () => {
  it('basic math works', () => {
    expect(1 + 1).toBe(2);
  });

  it('string matching works', () => {
    expect('hello').toMatch(/ell/);
  });
});
