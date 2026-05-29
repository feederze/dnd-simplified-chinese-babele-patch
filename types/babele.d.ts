/**
 * Type declarations for the Babele module (https://github.com/Federkun/babele),
 * which is a peer dependency of this patch but ships no published types.
 *
 * Only the API surface this module uses is declared.
 */
import type { BabeleConverter } from '../src/module/converters';

declare global {
  /** Babele's per-Compendium translation registry. */
  interface Babele {
    /** Whether Babele has finished initialising. */
    initialized: boolean;
    /** Registered Compendium packs, keyed by `"<namespace>.<pack>"`. */
    packs: Map<string, unknown>;
    /** Register a translation directory for a module/language. */
    register(config: { module: string; dir: string; lang: string }): void;
    /** Register named converters usable from mapping rules. */
    registerConverters(converters: Record<string, BabeleConverter>): void;
    /** Register a custom field-mapping document. */
    registerMapping(mapping: unknown): void;
  }

  /** The global `Babele` constructor (present when the module is active). */
  var Babele: { new (): Babele } | undefined;

  /** The Babele instance, attached to `game` when the module is active. */
  interface BabeleGame {
    babele?: Babele;
  }
}

export {};
