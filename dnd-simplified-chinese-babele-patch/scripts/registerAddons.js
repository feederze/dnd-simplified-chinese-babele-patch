export const MODULE_ID = 'dnd-simplified-chinese-babele-patch';

export async function registerAddons(babele) {
    babele.registerConverters({
        "effects": effectsConverter,
        "advancement": advancementConverter,
        "activities": activitiesConverter,
        "dynamicname": nameConverter,
        "itemsConverter": itemsConverter,
        "advancementitemsConverter":advancementitemsConverter
    });
    await registerCustomMappings(babele);
}

async function registerCustomMappings(babele) {
    const response = await fetch(`/modules/${MODULE_ID}/rules/mapping.json`);
    if (!response.ok) {
        throw new Error(`Failed to load JSON file: ${response.statusText}`);
    }
    babele.registerMapping(await response.json())
}

function effectsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    return originalValues.map(data => {
        const translation = translations[data.name];
        if (!translation) return data;
        return foundry.utils.mergeObject(data, {
            name: translation.name ?? data.name,
            description: translation.description ?? data.description
        });
    });
}

function advancementConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    return originalValues.map(data => {
        const key = [data?.title, data?.configuration?.identifier, data?.id, data?._id]
            .find(v => typeof v === "string" && v.length);
        const translation = key ? translations[key] : null;
        if (!translation) return data;
        return foundry.utils.mergeObject(data, {
            configuration: foundry.utils.mergeObject(
                data.configuration,
                { identifier: data.configuration.identifier ?? data.title.slugify() }
            ),
            title: translation.title ?? translation.name ?? data.title,
            hint: translation.hint ?? translation.condition ?? data.description
        });
    });
}

function activitiesConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    if (!translations || !originalValues || typeof originalValues !== "object" || Array.isArray(originalValues)) {
        return originalValues;
    }
    return Object.fromEntries(
        Object.entries(originalValues).map(([key, activity]) => {
            const translation = translations[activity.name];
            if (!translation) return [key, activity];
            return [key, foundry.utils.mergeObject(activity, {
                name: translation.name ?? activity.name,
                description: translation.description ?? activity.description,
                hint: translation.hint ?? activity.hint,
                condition: translation.condition ?? activity.condition,
                target: foundry.utils.mergeObject(
                    activity.target,
                    foundry.utils.mergeObject(
                        activity.target.affects,
                        { special: translation.affectsSpecial ?? activity.target.affects.special }
                    )
                ),
                range: foundry.utils.mergeObject(
                    activity.range,
                    { special: translation.rangeSpecial ?? activity.range.special }
                ),
            })];
        })
    );
}

function nameConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    const original = originalValues ?? data?.name;
    if (!translations) return original;
    if (game.settings.get(MODULE_ID, 'namesetting')) {
        return `${translations} ${original}`;
    }
    return translations;
}

function itemsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    if (!translations || !Array.isArray(originalValues)) return originalValues;
    const bilingual = game.settings.get(MODULE_ID, 'namesetting');

    return originalValues.map(item => {
        const t = translations[item.name];
        if (!t) return item;

        const translatedName = t.name ?? item.name;
        const name = bilingual ? `${translatedName} ${item.name}` : translatedName;

        const updates = { name };
        if (t.description) {
            updates.system = foundry.utils.mergeObject(item.system || {}, {
                description: { value: t.description }
            });
        }

        return foundry.utils.mergeObject(item, updates);
    });
}

function advancementitemsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    const original = originalValues ?? data?.name;
    if (!translations) return original;
    if (game.settings.get(MODULE_ID, 'namesetting')) {
        return `${translations} ${original}`;
    }
    return translations;
}
