/**
 * Declaration merging for this module's world settings, so `game.settings`
 * `register` / `get` / `set` are typed against the keys defined in
 * `src/module/constants.ts`. foundry-vtt-types derives the valid namespace and
 * key unions from the global `SettingConfig` interface.
 */
import type { PackStatus } from '../src/module/pack-status';

declare global {
  interface SettingConfig {
    'dnd-simplified-chinese-babele-patch.autoRegisterBabel': boolean;
    'dnd-simplified-chinese-babele-patch.namesetting': boolean;
    'dnd-simplified-chinese-babele-patch.PackStatus': PackStatus;
  }
}

export {};
