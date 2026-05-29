import { describe, expect, it } from 'vitest';
import { createConverters } from '../src/module/converters';

/**
 * Faithful re-implementation of `foundry.utils.mergeObject(original, other)`
 * (recursive merge, insert-keys, arrays replaced wholesale). Injected into the
 * converters so we exercise real merge behaviour rather than a behaviour mock.
 */
function mergeObject<T>(original: T, other: Record<string, unknown>): T {
  const out: any = Array.isArray(original) ? [...(original as any)] : { ...original };
  for (const [k, v] of Object.entries(other ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = mergeObject(out[k] ?? {}, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const make = (bilingual = false) =>
  createConverters({ mergeObject, isBilingual: () => bilingual });

const ctx = {} as any;

describe('effects converter', () => {
  it('returns the original value untouched when there are no translations', () => {
    const c = make().effects;
    const value = [{ name: 'X' }];
    expect(c(value, null, ctx, ctx, ctx)).toBe(value);
  });

  it('leaves an entry unchanged when its name has no translation', () => {
    const c = make().effects;
    const out = c([{ name: 'Unknown', description: 'd' }], { Other: { name: 'y' } }, ctx, ctx, ctx);
    expect(out[0]).toEqual({ name: 'Unknown', description: 'd' });
  });

  it('translates name and description by matching the english name', () => {
    const c = make().effects;
    const out = c(
      [{ name: 'Blinded', description: 'd' }],
      { Blinded: { name: '目盲', description: '描述' } },
      ctx,
      ctx,
      ctx,
    );
    expect(out[0]).toMatchObject({ name: '目盲', description: '描述' });
  });
});

describe('advancement converter', () => {
  it('falls back to slugified title as identifier and translates title/hint', () => {
    const c = make().advancement;
    const out = c(
      [{ title: 'Hit Points', configuration: {}, description: 'orig' }],
      { 'Hit Points': { title: '生命值', hint: '提示' } },
      ctx,
      ctx,
      ctx,
    );
    expect(out[0].title).toBe('生命值');
    expect(out[0].hint).toBe('提示');
    expect(out[0].configuration.identifier).toBe('hit-points');
  });

  it('looks up translations by title in preference to identifier', () => {
    // The lookup order is [title, identifier, id, _id], so a present title
    // always wins. This preserves the original converter's behaviour.
    const c = make().advancement;
    const out = c(
      [{ title: 'Ability Score Improvement', configuration: { identifier: 'asi' } }],
      { 'Ability Score Improvement': { title: '属性提升' }, asi: { title: 'WRONG' } },
      ctx,
      ctx,
      ctx,
    );
    expect(out[0].title).toBe('属性提升');
  });
});

describe('activities converter', () => {
  it('returns original when given an array rather than an activity map', () => {
    const c = make().activities;
    const value: any = [];
    expect(c(value, { a: {} }, ctx, ctx, ctx)).toBe(value);
  });

  it('merges nested target.affects.special and range.special', () => {
    const c = make().activities;
    const out = c(
      {
        atk: {
          name: 'Attack',
          target: { affects: { special: 'en-special' } },
          range: { special: 'en-range' },
        },
      },
      { Attack: { name: '攻击', affectsSpecial: '特殊', rangeSpecial: '范围' } },
      ctx,
      ctx,
      ctx,
    );
    expect(out.atk.name).toBe('攻击');
    // NOTE (preserved quirk): the original converter merges the translated
    // affects-special onto the TOP level of `target` (target.special), not into
    // target.affects.special. Kept identical to avoid behaviour drift.
    expect(out.atk.target.special).toBe('特殊');
    expect(out.atk.target.affects.special).toBe('en-special');
    expect(out.atk.range.special).toBe('范围');
  });
});

describe('dynamicname converter', () => {
  it('prefixes the translation before the original when bilingual', () => {
    const c = make(true).dynamicname;
    expect(c('Longsword', '长剑', { name: 'Longsword' }, ctx, ctx)).toBe('长剑 Longsword');
  });

  it('returns only the translation when not bilingual', () => {
    const c = make(false).dynamicname;
    expect(c('Longsword', '长剑', ctx, ctx, ctx)).toBe('长剑');
  });

  it('returns the original name when there is no translation', () => {
    const c = make(true).dynamicname;
    expect(c('Longsword', null, { name: 'Longsword' }, ctx, ctx)).toBe('Longsword');
  });
});

describe('items converter', () => {
  it('appends the english name when bilingual and merges the description', () => {
    const c = make(true).itemsConverter;
    const out = c(
      [{ name: 'Longsword', system: { description: { value: 'en' } } }],
      { Longsword: { name: '长剑', description: '中文' } },
      ctx,
      ctx,
      ctx,
    );
    expect(out[0].name).toBe('长剑 Longsword');
    expect(out[0].system.description.value).toBe('中文');
  });

  it('uses only the translated name when not bilingual', () => {
    const c = make(false).itemsConverter;
    const out = c([{ name: 'Longsword' }], { Longsword: { name: '长剑' } }, ctx, ctx, ctx);
    expect(out[0].name).toBe('长剑');
  });
});

describe('advancementitemsConverter', () => {
  it('prefixes the translation before the original when bilingual', () => {
    const c = make(true).advancementitemsConverter;
    expect(c('Fighter', '战士', { name: 'Fighter' }, ctx, ctx)).toBe('战士 Fighter');
  });
});
