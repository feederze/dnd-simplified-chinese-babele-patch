/** The module id, matching `module.json` `id` and the on-disk folder name. */
export const MODULE_ID = 'dnd-simplified-chinese-babele-patch';

/** Setting keys registered by this module. */
export const SETTINGS = {
  /** Whether Babele translation is auto-registered on init. */
  AUTO_REGISTER: 'autoRegisterBabel',
  /** Whether names are rendered bilingually (`<translation> <original>`). */
  NAME_SETTING: 'namesetting',
  /** Persisted per-pack enabled/disabled blacklist state. */
  PACK_STATUS: 'PackStatus',
} as const;
