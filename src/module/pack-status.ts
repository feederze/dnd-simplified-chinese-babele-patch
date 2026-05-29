/**
 * Pure helpers for the per-Compendium translation blacklist.
 *
 * A "pack status" is a map of `"<namespace>.<pack>"` keys to a boolean: `true`
 * means the pack is translated (enabled), `false` means it is blacklisted.
 * None of these functions touch Foundry globals, so they are unit-tested directly.
 */

/** Map of pack key -> enabled flag. */
export type PackStatus = Record<string, boolean>;

/** A row prepared for display in the blacklist menu. */
export interface PackStatusRow {
  namespace: string;
  pack: string;
  enabled: boolean;
  key: string;
}

/** A checkbox state captured from the blacklist menu form. */
export interface CheckboxState {
  value: string;
  checked: boolean;
}

/**
 * Split a pack key into its namespace and pack parts. The namespace is the text
 * before the first dot; the pack is everything after (dots preserved).
 */
export function splitKey(key: string): [string, string] {
  const parts = String(key).split('.');
  const namespace = parts[0] ?? '';
  const pack = parts.slice(1).join('.') || '';
  return [namespace, pack];
}

/** Turn a pack-status map into display rows with parsed namespace/pack. */
export function formatPackStatusForDisplay(statusObj: PackStatus): PackStatusRow[] {
  const rows: PackStatusRow[] = [];
  for (const key in statusObj) {
    if (!Object.prototype.hasOwnProperty.call(statusObj, key)) continue;
    const enabled = !!statusObj[key];
    const [namespace, pack] = splitKey(key);
    rows.push({ namespace, pack, enabled, key });
  }
  return rows;
}

/**
 * Reconcile the currently-available pack keys against previously-saved status.
 * Saved values are kept; keys never seen before default to enabled (`true`);
 * saved keys that are no longer present are dropped.
 */
export function mergePackStatus(keys: Iterable<string>, saved: PackStatus): PackStatus {
  const merged: PackStatus = {};
  for (const key of keys) {
    merged[key] = Object.prototype.hasOwnProperty.call(saved, key) ? !!saved[key] : true;
  }
  return merged;
}

/**
 * Build a pack-status map from blacklist-menu checkbox states. A checked box
 * means "blacklist this pack", so `enabled` is the negation of `checked`.
 */
export function collectStatusFromCheckboxes(checkboxes: Iterable<CheckboxState>): PackStatus {
  const status: PackStatus = {};
  for (const { value, checked } of checkboxes) {
    status[value] = !checked;
  }
  return status;
}
