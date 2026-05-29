import { describe, expect, it } from 'vitest';
import {
  parseArgs,
  sortObject,
  decodeCollectionKey,
  baseNameNoExt,
  extractTitlesFromEntries,
} from '../src/tools/generate-light-index';

describe('parseArgs', () => {
  it('parses --input and applies the documented defaults', () => {
    const a = parseArgs(['--input', 'dir']);
    expect(a.input).toBe('dir');
    expect(a.recursive).toBe(true);
    expect(a.pretty).toBe(true);
    expect(a.includeFolders).toBe(false);
    expect(a.deep).toBe(false);
  });

  it('honours flag overrides', () => {
    const a = parseArgs(['-i', 'dir', '--deep', '--compact', '--no-recursive', '--include-folders']);
    expect(a.deep).toBe(true);
    expect(a.pretty).toBe(false);
    expect(a.recursive).toBe(false);
    expect(a.includeFolders).toBe(true);
  });

  it('treats --output as an alias for --labels-output', () => {
    expect(parseArgs(['-o', 'out.json']).labelsOutput).toBe('out.json');
  });
});

describe('sortObject', () => {
  it('returns the entries with keys in sorted order', () => {
    expect(Object.keys(sortObject({ b: 1, a: 2, c: 3 }))).toEqual(['a', 'b', 'c']);
  });
});

describe('decodeCollectionKey', () => {
  it('decodes percent-encoding', () => {
    expect(decodeCollectionKey('dnd5e.items')).toBe('dnd5e.items');
    expect(decodeCollectionKey('a%20b')).toBe('a b');
  });

  it('falls back to the raw value on malformed input', () => {
    expect(decodeCollectionKey('%ZZ')).toBe('%ZZ');
  });
});

describe('baseNameNoExt', () => {
  it('strips the directory and extension', () => {
    expect(baseNameNoExt('/a/b/items.json')).toBe('items');
  });
});

describe('extractTitlesFromEntries', () => {
  it('indexes array entries by both id and _id', () => {
    expect(extractTitlesFromEntries([{ id: 'abc', _id: 'xyz', name: '长剑' }], { deep: false })).toEqual(
      { abc: '长剑', xyz: '长剑' },
    );
  });

  it('indexes a string-valued object map directly', () => {
    expect(extractTitlesFromEntries({ k: '译名' }, { deep: false })).toEqual({ k: '译名' });
  });

  it('indexes object-map entries by their key using the nested name', () => {
    expect(extractTitlesFromEntries({ k: { name: '译名' } }, { deep: false })).toEqual({ k: '译名' });
  });

  it('does not descend into nested nodes unless deep is set', () => {
    const out = extractTitlesFromEntries({ root: { child: { name: '子' } } }, { deep: false });
    expect(out.child).toBeUndefined();
  });

  it('descends into nested named nodes when deep is set', () => {
    const out = extractTitlesFromEntries({ root: { child: { name: '子' } } }, { deep: true });
    expect(out.child).toBe('子');
  });

  it('returns an empty object for nullish entries', () => {
    expect(extractTitlesFromEntries(undefined, { deep: false })).toEqual({});
  });
});
