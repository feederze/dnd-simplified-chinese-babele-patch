/**
 * Pulls in the Foundry VTT global type definitions.
 *
 * We use the `/lenient` entry of `@league-of-foundry-developers/foundry-vtt-types`.
 * The strict entry requires configuring game-system data models and document
 * subtypes before it type-checks; the lenient entry exposes the same globals
 * (`game`, `Hooks`, `foundry`, `ui`, `FormApplication`, …) without that burden,
 * which is the right trade-off for a translation patch module.
 */
import '@league-of-foundry-developers/foundry-vtt-types/lenient';
