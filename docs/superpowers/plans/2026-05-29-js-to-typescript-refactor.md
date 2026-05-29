# JS → TypeScript Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the Foundry VTT module + Node CLI from JS to TypeScript with no
behavior change, add Vitest unit tests for all pure logic, build JS in CI, and
ship a bilingual README.

**Architecture:** Pure decision logic (converters via DI, pack-status helpers,
CLI helpers) is extracted and unit-tested; thin Foundry "shell" files wire it to
globals. Rollup bundles `src/` into the two JS artifacts the module/CI expect.

**Tech Stack:** TypeScript, Rollup (`@rollup/plugin-typescript`), Vitest,
`@league-of-foundry-developers/foundry-vtt-types`, ESLint + typescript-eslint.

---

### Task 0: Project scaffolding (config files — no tests)

**Files:** Create `package.json`, `tsconfig.json`, `rollup.config.mjs`,
`vitest.config.ts`, `eslint.config.mjs`; update `.gitignore`.

- [ ] Install dev deps, write `package.json` scripts (build/test/typecheck/lint).
- [ ] `tsconfig.json`: `strict`, `skipLibCheck`, `moduleResolution: bundler`,
      `types: ["@league-of-foundry-developers/foundry-vtt-types", "node"]`,
      include `src`, `types`, `tests`.
- [ ] `rollup.config.mjs`: two ESM outputs →
      `dnd-simplified-chinese-babele-patch/scripts/init.js` and
      `tools/generate-light-index.mjs`.
- [ ] `.gitignore`: add `node_modules/`, build outputs.
- [ ] Verify `npm run typecheck` runs (empty src ok) and `npx vitest run` runs.

### Task 1: `src/module/constants.ts` (no tests — constants only)

- [ ] `export const MODULE_ID = 'dnd-simplified-chinese-babele-patch';`
- [ ] Export setting-key constants (`AUTO_REGISTER`, `NAME_SETTING`, `PACK_STATUS`).

### Task 2: `pack-status.ts` (TDD)

**Files:** Create `src/module/pack-status.ts`, Test `tests/pack-status.test.ts`.

- [ ] **Write failing tests** covering:

```ts
import { describe, expect, it } from 'vitest';
import { splitKey, formatPackStatusForDisplay, mergePackStatus,
  collectStatusFromCheckboxes } from '../src/module/pack-status';

describe('splitKey', () => {
  it('splits namespace and pack', () => {
    expect(splitKey('dnd5e.items')).toEqual(['dnd5e', 'items']);
  });
  it('joins multi-dot pack names', () => {
    expect(splitKey('a.b.c')).toEqual(['a', 'b.c']);
  });
});

describe('formatPackStatusForDisplay', () => {
  it('maps each key to a row with parsed namespace/pack/enabled', () => {
    expect(formatPackStatusForDisplay({ 'dnd5e.items': false })).toEqual([
      { namespace: 'dnd5e', pack: 'items', enabled: false, key: 'dnd5e.items' },
    ]);
  });
});

describe('mergePackStatus', () => {
  it('keeps saved values and defaults unseen keys to true', () => {
    expect(mergePackStatus(['a.x', 'b.y'], { 'a.x': false }))
      .toEqual({ 'a.x': false, 'b.y': true });
  });
});

describe('collectStatusFromCheckboxes', () => {
  it('enabled is the negation of checked (checked = blacklisted)', () => {
    expect(collectStatusFromCheckboxes([
      { value: 'a.x', checked: true },
      { value: 'b.y', checked: false },
    ])).toEqual({ 'a.x': false, 'b.y': true });
  });
});
```

- [ ] Run `npx vitest run tests/pack-status.test.ts` → FAIL (functions undefined).
- [ ] Implement the four pure functions (ported from `BlacklistMenu.js` +
      `init.js` merge loop). `mergePackStatus(keys, saved)` reproduces init.js
      lines 78-84; `collectStatusFromCheckboxes` reproduces lines 56-62.
- [ ] Run tests → PASS. Commit.

### Task 3: `converters.ts` (TDD)

**Files:** Create `src/module/converters.ts`, Test `tests/converters.test.ts`.

- [ ] Define `BabeleConverter` type and `ConverterDeps`
      (`mergeObject`, `isBilingual`). `createConverters(deps)` returns the map
      `{ effects, advancement, activities, dynamicname, itemsConverter,
      advancementitemsConverter }`.
- [ ] **Write failing tests** using a faithful local deep-merge as the injected
      `mergeObject` and a togglable `isBilingual`:

```ts
import { describe, expect, it } from 'vitest';
import { createConverters } from '../src/module/converters';

// faithful, recursive merge mirroring foundry.utils.mergeObject(original, other)
function mergeObject(original: any, other: any): any {
  const out = Array.isArray(original) ? [...original] : { ...original };
  for (const [k, v] of Object.entries(other ?? {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v)
      ? mergeObject(out[k] ?? {}, v) : v;
  }
  return out;
}
const make = (bilingual = false) =>
  createConverters({ mergeObject, isBilingual: () => bilingual });

describe('effects converter', () => {
  it('returns original when no translations', () => {
    const c = make().effects;
    const v = [{ name: 'X' }];
    expect(c(v, null as any, {} as any, {} as any, {} as any)).toBe(v);
  });
  it('translates name and description by matching name', () => {
    const c = make().effects;
    const out = c([{ name: 'Blinded', description: 'd' }],
      { Blinded: { name: '目盲', description: '描述' } } as any,
      {} as any, {} as any, {} as any);
    expect(out[0]).toMatchObject({ name: '目盲', description: '描述' });
  });
});

describe('dynamicname converter', () => {
  it('prefixes translation when bilingual', () => {
    const c = make(true).dynamicname;
    expect(c('Longsword', '长剑', { name: 'Longsword' } as any,
      {} as any, {} as any)).toBe('长剑 Longsword');
  });
  it('returns only translation when not bilingual', () => {
    const c = make(false).dynamicname;
    expect(c('Longsword', '长剑', {} as any, {} as any, {} as any)).toBe('长剑');
  });
});

describe('items converter', () => {
  it('appends english name when bilingual and merges description', () => {
    const c = make(true).itemsConverter;
    const out = c([{ name: 'Longsword', system: { description: { value: 'en' } } }],
      { Longsword: { name: '长剑', description: '中文' } } as any,
      {} as any, {} as any, {} as any);
    expect(out[0].name).toBe('长剑 Longsword');
    expect(out[0].system.description.value).toBe('中文');
  });
});
```
(plus advancement identifier-fallback, activities nested target/range merge,
array/object guard cases — one `it` each.)

- [ ] Run `npx vitest run tests/converters.test.ts` → FAIL.
- [ ] Port the six converter bodies verbatim from `registerAddons.js`, swapping
      `foundry.utils.mergeObject` → `deps.mergeObject` and
      `game.settings.get(MODULE_ID,'namesetting')` → `deps.isBilingual()`.
- [ ] Run tests → PASS. Commit.

### Task 4: `generate-light-index.ts` pure helpers (TDD)

**Files:** Create `src/tools/generate-light-index.ts`,
Test `tests/generate-light-index.test.ts`.

- [ ] Export pure helpers: `parseArgs`, `baseNameNoExt`, `decodeCollectionKey`,
      `sortObject`, `extractTitlesFromEntries`. Keep `main()` as the impure shell
      (file walk + write) guarded by an `import.meta`/run check.
- [ ] **Write failing tests**:

```ts
import { describe, expect, it } from 'vitest';
import { parseArgs, sortObject, decodeCollectionKey, extractTitlesFromEntries }
  from '../src/tools/generate-light-index';

describe('parseArgs', () => {
  it('parses input and flags with defaults', () => {
    const a = parseArgs(['--input', 'dir', '--deep', '--compact']);
    expect(a.input).toBe('dir');
    expect(a.deep).toBe(true);
    expect(a.pretty).toBe(false);
    expect(a.recursive).toBe(true);
  });
});
describe('sortObject', () => {
  it('returns keys in sorted order', () => {
    expect(Object.keys(sortObject({ b: 1, a: 2 }))).toEqual(['a', 'b']);
  });
});
describe('decodeCollectionKey', () => {
  it('decodes percent-encoding, falls back on bad input', () => {
    expect(decodeCollectionKey('dnd5e.items')).toBe('dnd5e.items');
    expect(decodeCollectionKey('%ZZ')).toBe('%ZZ');
  });
});
describe('extractTitlesFromEntries', () => {
  it('indexes array entries by id and _id', () => {
    expect(extractTitlesFromEntries(
      [{ id: 'abc', _id: 'xyz', name: '长剑' }], { deep: false }))
      .toEqual({ abc: '长剑', xyz: '长剑' });
  });
  it('indexes object map entries by key', () => {
    expect(extractTitlesFromEntries({ k: '译名' }, { deep: false }))
      .toEqual({ k: '译名' });
  });
  it('with deep, indexes nested named nodes', () => {
    const out = extractTitlesFromEntries(
      { root: { child: { name: '子' } } }, { deep: true });
    expect(out.child).toBe('子');
  });
});
```

- [ ] Run `npx vitest run tests/generate-light-index.test.ts` → FAIL.
- [ ] Port helpers verbatim from `tools/generate-light-index.mjs`, typed.
- [ ] Run tests → PASS. Commit.

### Task 5: `types/*.d.ts`

**Files:** Create `types/babele.d.ts`, `types/dnd5e.d.ts`, `types/module.d.ts`.

- [ ] `babele.d.ts`: declare `class Babele` (`register`, `registerConverters`,
      `registerMapping`, `initialized`, `packs: Map<string, unknown>`), augment
      `game.babele`, declare global `Babele`.
- [ ] `dnd5e.d.ts`: minimal interfaces for the item/activity/effect/advancement
      shapes the converters touch.
- [ ] `module.d.ts`: declare the module's setting keys / value types.
- [ ] `npm run typecheck` → clean.

### Task 6: Foundry shell files (build-validated, no unit tests)

**Files:** Create `src/module/settings.ts`, `src/module/babele-registration.ts`,
`src/module/blacklist-menu.ts`, `src/module/init.ts`.

- [ ] `settings.ts`: `registerSettings()` ported from init.js settings block.
- [ ] `babele-registration.ts`: `registerAddons(babele)` (builds real
      `ConverterDeps`, fetches mapping), `autoRegisterBabel()`, and the
      `babele.dataLoaded` handler using `mergePackStatus`.
- [ ] `blacklist-menu.ts`: `TranslateBlacklistMenu extends FormApplication`,
      `getData` using `formatPackStatusForDisplay`, `activateListeners` using
      `collectStatusFromCheckboxes`.
- [ ] `init.ts`: import the above, wire `Hooks.on('init', ...)` and
      `Hooks.on('babele.dataLoaded', ...)`. This is the rollup entry.
- [ ] `npm run typecheck` → clean.

### Task 7: Build wiring + remove old JS

- [ ] `npm run build` → produces `scripts/init.js` and `tools/generate-light-index.mjs`.
- [ ] Sanity-check `scripts/init.js` is valid ESM and references the template path.
- [ ] `git rm` the old `scripts/*.js` and old `tools/generate-light-index.mjs`
      (now build outputs, git-ignored). Keep `templates/`, `rules/`, `module.json`.
- [ ] Smoke-run the built CLI on a tiny fixture dir → emits labels/titles.
- [ ] Commit.

### Task 8: CI workflows

**Files:** Modify `.github/workflows/CreateRelease.yml`; create `.github/workflows/ci.yml`.

- [ ] `CreateRelease.yml`: after `setup-node`, add `npm ci`, `npm test`,
      `npm run build` before the existing index-generation/zip steps. Index
      generation now calls the built `tools/generate-light-index.mjs` (unchanged path).
- [ ] `ci.yml`: on push + pull_request → `npm ci` → `npm run typecheck` →
      `npm test` → `npm run build`.
- [ ] Commit.

### Task 9: Bilingual README

**Files:** Modify `README.md`.

- [ ] Rewrite as one file: `English | 简体中文` switch, then two full sections
      (overview, screenshots, features, install via manifest URL, settings,
      blacklist menu, how translation works, development build/test/typecheck,
      the index-generator CLI usage, release workflow, contributing, credits).
- [ ] Keep existing screenshot references (`img/preview.png`, `img/preview2.png`).
- [ ] Commit.

### Task 10: Finish

- [ ] `npm run typecheck && npm test && npm run build && npm run lint` all green.
- [ ] Follow superpowers:finishing-a-development-branch: verify, push branch.
