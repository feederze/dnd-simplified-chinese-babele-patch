/**
 * Babele converters.
 *
 * Babele invokes converters with a fixed signature, so the Foundry dependencies
 * the converters need (`foundry.utils.mergeObject` and the bilingual setting)
 * are supplied up front via {@link createConverters}. This keeps every converter
 * a pure function of its inputs + injected deps, which makes them unit-testable
 * with a real merge implementation instead of a behaviour mock.
 */

/** The arguments Babele passes to every converter. */
export type BabeleConverter = (
  originalValues: any,
  translations: any,
  data: any,
  translatedCompendium: any,
  allTranslations: any,
) => any;

/** Foundry/runtime dependencies the converters rely on. */
export interface ConverterDeps {
  /** `foundry.utils.mergeObject(original, other)` — recursive merge. */
  mergeObject: <T>(original: T, other: Record<string, unknown>) => T;
  /** Reads the "bilingual names" setting (`<translation> <original>`). */
  isBilingual: () => boolean;
}

/** The converter map registered with Babele. */
export interface ConverterMap {
  effects: BabeleConverter;
  advancement: BabeleConverter;
  activities: BabeleConverter;
  dynamicname: BabeleConverter;
  itemsConverter: BabeleConverter;
  advancementitemsConverter: BabeleConverter;
  /** Index signature so the map is assignable to `Babele.registerConverters`. */
  [name: string]: BabeleConverter;
}

/**
 * Minimal slug helper matching Foundry's `String.prototype.slugify` default
 * behaviour closely enough for advancement identifiers ("Hit Points" ->
 * "hit-points"). Implemented locally so converters don't depend on the Foundry
 * String prototype extension.
 */
function slugify(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function createConverters({ mergeObject, isBilingual }: ConverterDeps): ConverterMap {
  const effects: BabeleConverter = (originalValues, translations) => {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    return originalValues.map((entry: any) => {
      const translation = translations[entry.name];
      if (!translation) return entry;
      return mergeObject(entry, {
        name: translation.name ?? entry.name,
        description: translation.description ?? entry.description,
      });
    });
  };

  const advancement: BabeleConverter = (originalValues, translations) => {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    return originalValues.map((entry: any) => {
      const key = [entry?.title, entry?.configuration?.identifier, entry?.id, entry?._id].find(
        (v) => typeof v === 'string' && v.length,
      );
      const translation = key ? translations[key] : null;
      if (!translation) return entry;
      const configuration = entry.configuration ?? {};
      return mergeObject(entry, {
        configuration: mergeObject(configuration, {
          identifier: configuration.identifier ?? slugify(entry.title),
        }),
        title: translation.title ?? translation.name ?? entry.title,
        hint: translation.hint ?? translation.condition ?? entry.description,
      });
    });
  };

  const activities: BabeleConverter = (originalValues, translations) => {
    if (
      !translations ||
      !originalValues ||
      typeof originalValues !== 'object' ||
      Array.isArray(originalValues)
    ) {
      return originalValues;
    }
    return Object.fromEntries(
      Object.entries(originalValues).map(([key, activity]: [string, any]) => {
        const translation = translations[activity.name];
        if (!translation) return [key, activity];
        return [
          key,
          mergeObject(activity, {
            name: translation.name ?? activity.name,
            description: translation.description ?? activity.description,
            hint: translation.hint ?? activity.hint,
            condition: translation.condition ?? activity.condition,
            // NOTE: this merges the affects-special result onto the top level of
            // `target` (producing `target.special`) rather than into
            // `target.affects.special`. Preserved verbatim from the original JS;
            // see docs/superpowers/specs for the known-quirk note.
            target: mergeObject(
              activity.target,
              mergeObject(activity.target.affects, {
                special: translation.affectsSpecial ?? activity.target.affects.special,
              }),
            ),
            range: mergeObject(activity.range, {
              special: translation.rangeSpecial ?? activity.range.special,
            }),
          }),
        ];
      }),
    );
  };

  const dynamicname: BabeleConverter = (originalValues, translations, data) => {
    const original = originalValues ?? data?.name;
    if (!translations) return original;
    if (isBilingual()) {
      return `${translations} ${original}`;
    }
    return translations;
  };

  const itemsConverter: BabeleConverter = (originalValues, translations) => {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    const bilingual = isBilingual();

    return originalValues.map((item: any) => {
      const t = translations[item.name];
      if (!t) return item;

      const translatedName = t.name ?? item.name;
      const name = bilingual ? `${translatedName} ${item.name}` : translatedName;

      const updates: Record<string, unknown> = { name };
      if (t.description) {
        updates.system = mergeObject(item.system || {}, {
          description: { value: t.description },
        });
      }

      return mergeObject(item, updates);
    });
  };

  const advancementitemsConverter: BabeleConverter = (originalValues, translations, data) => {
    const original = originalValues ?? data?.name;
    if (!translations) return original;
    if (isBilingual()) {
      return `${translations} ${original}`;
    }
    return translations;
  };

  return {
    effects,
    advancement,
    activities,
    dynamicname,
    itemsConverter,
    advancementitemsConverter,
  };
}
