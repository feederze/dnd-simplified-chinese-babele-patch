/**
 * Minimal shapes of the D&D 5e / Babele translation data the converters touch.
 * These are intentionally partial — only the fields this module reads or writes
 * are described. They document intent; the converter functions themselves stay
 * permissive because Babele hands them dynamic data.
 */

/** A single translation record keyed by the original (English) name/title. */
export interface TranslationEntry {
  name?: string;
  title?: string;
  description?: string;
  hint?: string;
  condition?: string;
  affectsSpecial?: string;
  rangeSpecial?: string;
}

/** Map of original name/identifier -> translation record. */
export type TranslationTable = Record<string, TranslationEntry>;

/** A D&D 5e item's localizable system description. */
export interface ItemSystemDescription {
  description?: { value?: string };
}

/** The subset of an Active Effect the effects converter reads. */
export interface EffectLike {
  name?: string;
  description?: string;
}
