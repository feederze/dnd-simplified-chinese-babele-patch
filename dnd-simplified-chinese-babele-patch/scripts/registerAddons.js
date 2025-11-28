import { MODULE_ID } from "./init.js";
const DEBUG = false;


function logDebug(...args) {
    if (!DEBUG) return;
    console.debug("[Babele汉化]", ...args);
}

export async function registerAddons(babele) {
    logDebug("registerCustomConverters: ");
    babele.registerConverters({
        "effects": effectsConverter,
        "advancement": advancementConverter,
        "activities": activitiesConverter,
        "dynamicname": nameConverter
    });
    await registerCustomMappings(babele)
    logDebug("registerCustomConverters: Done");
}

async function registerCustomMappings(babele) {
    const response = await fetch(`/modules/${MODULE_ID}/rules/mapping.json`);
    if (!response.ok) {
        throw new Error(`Failed to load JSON file: ${response.statusText}`);
    }
    const mappingFile = await response.json();
    babele.registerMapping(mappingFile)
}

function effectsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    logDebug("advancementConverter: originalValues:", originalValues);
    logDebug("advancementConverter: translations:", translations);
    if (!translations) return data;

    return originalValues.map(data => {
        const translation = translations[data.name];
        if (!translation) return data;
        logDebug("advancementConverter: translation:", translation);

        return foundry.utils.mergeObject(
            data,
            {
                name: translation.name ?? data.name,
                description: translation.description ?? data.description
            }
        );
    });
}

function advancementConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    logDebug("advancementConverter: originalValues:", originalValues);
    logDebug("advancementConverter: translations:", translations);
    if (!translations) return data;
    return originalValues.map(data => {
        const translation = translations[data.title];
        if (!translation) return data;
        logDebug("advancementConverter: translation:", translation);

        return foundry.utils.mergeObject(
            data,
            {
                configuration: foundry.utils.mergeObject(
                    data.configuration,
                    { identifier: data.configuration.identifier ?? data.title.slugify() }
                ),
                title: translation.title ?? data.title,
                hint: translation.hint ?? data.description
            }
        );
    });
}

function activitiesConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    logDebug("activitiesConverter: originalValues:", originalValues);
    logDebug("activitiesConverter: translations:", translations);
    if (!translations) return data;
    return Object.fromEntries(
        Object.entries(originalValues).map(([key, activity]) => {
            const translation = translations[activity.name];
            if (!translation) return [key, activity];
            logDebug("advancementConverter: translation:", translation);

            return [key, foundry.utils.mergeObject(
                activity,
                {
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
                }
            )];
        })
    );
}

function nameConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    let isActive = game.settings.get(MODULE_ID, 'namesetting')
    if (!translations) 
    {
        return data;
    }
    const original = originalValues ?? data?.name;
    if (isActive) {
        return `${translations} ${original}`;
    } else {
        return translations;
    }
}