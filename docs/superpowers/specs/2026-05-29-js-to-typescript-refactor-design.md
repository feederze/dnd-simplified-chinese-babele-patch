# JS → TypeScript Refactor Design

**Date:** 2026-05-29
**Status:** Proposed (awaiting approval)
**Branch:** `claude/js-to-typescript-refactor-ckO7u`

## Goal

Refactor the existing JavaScript codebase of `dnd-simplified-chinese-babele-patch`
(a Foundry VTT module that layers Simplified-Chinese Babele translations onto the
D&D 5e system) into TypeScript, add a Vitest unit-test suite, and write a rich
bilingual (English + 简体中文) README. Built JS is produced in CI before packaging.

## Non-Goals

- No behavior changes to the module. The runtime output must be functionally
  identical to today's JS. This is a refactor, not a feature change.
- No translation-content changes.
- No new Foundry features, settings, or UI beyond what exists.

## Current State

| File | Role | Runtime |
| --- | --- | --- |
| `scripts/init.js` | `init` hook, settings registration, Babele auto-register, `babele.dataLoaded` pack-status handling | Browser (Foundry) |
| `scripts/registerAddons.js` | Registers 6 Babele converters + custom mapping | Browser (Foundry) |
| `scripts/BlacklistMenu.js` | `TranslateBlacklistMenu` (`FormApplication`) + `formatPackStatusForDisplay` | Browser (Foundry) |
| `tools/generate-light-index.mjs` | Node CLI: walks translation JSON, emits `labels.json` / `titles.json` | Node |
| `module.json` | `esmodules: ["scripts/init.js"]` | — |
| `.github/workflows/CreateRelease.yml` | Zips the module folder (`scripts/*.js`) into a release | CI |

The browser scripts depend on Foundry globals: `game`, `Hooks`, `Babele`,
`foundry.utils.mergeObject`, `ui`, `FormApplication`.

## Decisions (confirmed with user)

| Topic | Choice |
| --- | --- |
| Build tool | **Rollup** + `@rollup/plugin-typescript` |
| Foundry typings | **`@league-of-foundry-developers/foundry-vtt-types`** (v13 line) + small local `.d.ts` for Babele / dnd5e shapes |
| Tests | **Vitest** |
| Build output | **Built in CI** before zipping; built JS is git-ignored |

## Target Architecture

### Key idea: separate pure logic from the Foundry shell

The converters and pack-status logic currently read Foundry globals directly,
which makes them untestable. We refactor so that **all decision logic is pure
and dependency-injected**, while a thin "shell" wires it to Foundry globals.

```
src/
├── module/
│   ├── constants.ts          # MODULE_ID, setting keys (pure)
│   ├── pack-status.ts        # splitKey, formatPackStatusForDisplay,
│   │                         #   mergePackStatus, collectStatusFromCheckboxes (pure)
│   ├── converters.ts         # createConverters(deps) -> 6 converters (pure via DI)
│   ├── settings.ts           # registerSettings(game) (shell)
│   ├── babele-registration.ts# registerAddons / autoRegisterBabel / dataLoaded (shell)
│   ├── blacklist-menu.ts     # TranslateBlacklistMenu extends FormApplication (shell)
│   └── init.ts               # entry: Hooks wiring only (shell)
└── tools/
    └── generate-light-index.ts  # exports pure helpers + main() shell
```

```
types/
├── babele.d.ts               # `Babele` global, `game.babele`, converter signature
├── dnd5e.d.ts                # minimal Item/Activity/Effect/Advancement shapes used
└── module.d.ts               # augment settings keys, declare module globals

tests/
├── converters.test.ts
├── pack-status.test.ts
└── generate-light-index.test.ts
```

#### Dependency injection for converters

Babele calls converters with a fixed signature
`(originalValues, translations, data, translatedCompendium, allTranslations)`,
so we cannot add parameters. Instead `converters.ts` exposes a factory:

```ts
interface ConverterDeps {
  mergeObject: <T>(original: T, other: object) => T; // foundry.utils.mergeObject
  isBilingual: () => boolean;                          // game.settings.get(..., 'namesetting')
}
export function createConverters(deps: ConverterDeps): Record<string, BabeleConverter>;
```

`babele-registration.ts` builds the real deps from Foundry globals; tests build
deps from a faithful local `mergeObject` implementation and a controllable flag.
This makes every converter unit-testable with **real** merge behavior — no global
stubbing, no behavior mocks.

`pack-status.ts` is fully pure (no Foundry dependency at all) and directly tested.

### Build & packaging

- `rollup.config.mjs` produces **two** ESM bundles, both git-ignored:
  1. `dnd-simplified-chinese-babele-patch/scripts/init.js` (browser, Foundry) —
     bundles `src/module/init.ts` and everything it imports.
  2. `tools/generate-light-index.mjs` (Node CLI) — bundles `src/tools/generate-light-index.ts`.
- `module.json` keeps `esmodules: ["scripts/init.js"]` — unchanged.
- The committed JS in `scripts/` and the current `tools/*.mjs` are **deleted**;
  `.gitignore` ignores the build outputs.

### CI changes

- `CreateRelease.yml`: add `npm ci` + `npm run build` (+ `npm test`) before the
  zip step so the release contains freshly built JS.
- New `.github/workflows/ci.yml`: on push / PR, run `npm ci`, `npm run typecheck`,
  `npm test`, `npm run build`.

### Tooling / scripts (`package.json`)

```jsonc
"scripts": {
  "build": "rollup -c",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit",
  "lint": "eslint ."
}
```

Dev deps: `typescript`, `rollup`, `@rollup/plugin-typescript`,
`@rollup/plugin-node-resolve`, `tslib`, `vitest`,
`@league-of-foundry-developers/foundry-vtt-types`, `@types/node`,
`eslint`, `typescript-eslint`.

`tsconfig.json`: `strict: true`, `skipLibCheck: true` (so foundry-vtt-types'
internal strictness can't block our build), `moduleResolution: bundler`,
foundry-vtt-types referenced via `compilerOptions.types`.

## Testing Strategy (TDD)

Each unit of pure logic gets tests written **first**, watched fail, then the
implementation is ported from the old JS to make them pass:

- **converters.test.ts** — for each converter: passthrough when no translation,
  bilingual vs. non-bilingual naming, nested merge for effects/activities/
  advancement/items, identifier fallback, array vs. object guards.
- **pack-status.test.ts** — `splitKey`, `formatPackStatusForDisplay`,
  `mergePackStatus` (saved vs. default true), checkbox collection (`enabled = !checked`).
- **generate-light-index.test.ts** — `parseArgs`, `extractTitlesFromEntries`
  (array form, object form, `--deep` nesting, id aliases), `sortObject`,
  `decodeCollectionKey`.

Foundry-shell files (`init.ts`, `settings.ts`, `blacklist-menu.ts`,
`babele-registration.ts`) are thin wiring and are validated by `typecheck` +
the build, not unit tests (mocking the entire Foundry runtime would test mocks,
not behavior).

## README

Single `README.md`, bilingual. Top language switch (`English | 简体中文`), then two
full sections each covering: overview, screenshots, features, install (manifest
URL), settings, blacklist menu, how Babele translation works here, development
(build / test / typecheck), the index-generator CLI, the release workflow,
contributing, and credits.

## Risks

- **foundry-vtt-types v13 strictness.** Mitigated by `skipLibCheck` and pragmatic
  casts in shell files where the upstream types are stricter than the runtime
  contract. If it proves unworkable, the local `.d.ts` fallback is already in place.
- **Behavior drift.** Mitigated by porting logic verbatim under tests that encode
  the current behavior.
