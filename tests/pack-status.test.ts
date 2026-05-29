import { describe, expect, it } from 'vitest';
import {
  splitKey,
  formatPackStatusForDisplay,
  mergePackStatus,
  collectStatusFromCheckboxes,
} from '../src/module/pack-status';

describe('splitKey', () => {
  it('splits namespace and pack', () => {
    expect(splitKey('dnd5e.items')).toEqual(['dnd5e', 'items']);
  });

  it('joins multi-dot pack names back together', () => {
    expect(splitKey('a.b.c')).toEqual(['a', 'b.c']);
  });

  it('returns empty pack when there is no dot', () => {
    expect(splitKey('solo')).toEqual(['solo', '']);
  });
});

describe('formatPackStatusForDisplay', () => {
  it('maps each key to a row with parsed namespace, pack and enabled flag', () => {
    expect(formatPackStatusForDisplay({ 'dnd5e.items': false })).toEqual([
      { namespace: 'dnd5e', pack: 'items', enabled: false, key: 'dnd5e.items' },
    ]);
  });

  it('coerces truthy values to a boolean enabled flag', () => {
    expect(formatPackStatusForDisplay({ 'a.x': true })[0].enabled).toBe(true);
  });
});

describe('mergePackStatus', () => {
  it('keeps saved values and defaults unseen keys to true', () => {
    expect(mergePackStatus(['a.x', 'b.y'], { 'a.x': false })).toEqual({
      'a.x': false,
      'b.y': true,
    });
  });

  it('ignores saved keys that are no longer present', () => {
    expect(mergePackStatus(['a.x'], { 'a.x': false, 'gone.z': false })).toEqual({
      'a.x': false,
    });
  });
});

describe('collectStatusFromCheckboxes', () => {
  it('treats a checked box as blacklisted (enabled = !checked)', () => {
    expect(
      collectStatusFromCheckboxes([
        { value: 'a.x', checked: true },
        { value: 'b.y', checked: false },
      ]),
    ).toEqual({ 'a.x': false, 'b.y': true });
  });
});
