import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const MODULE_DIR = 'dnd-simplified-chinese-babele-patch';

/**
 * Two ESM bundles:
 *  1. The browser-context Foundry module (loaded via module.json `esmodules`).
 *  2. The Node CLI used by the release workflow to build labels/titles indexes.
 *
 * Both outputs are git-ignored; CI runs `npm run build` before packaging.
 */
export default [
  {
    input: 'src/module/init.ts',
    output: {
      file: `${MODULE_DIR}/scripts/init.js`,
      format: 'es',
      sourcemap: false,
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', noEmit: false, sourceMap: false }),
    ],
  },
  {
    input: 'src/tools/generate-light-index.ts',
    output: {
      file: 'tools/generate-light-index.mjs',
      format: 'es',
      banner: '#!/usr/bin/env node',
      sourcemap: false,
    },
    external: ['node:fs/promises', 'node:path', 'node:url'],
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', noEmit: false, sourceMap: false }),
    ],
  },
];
