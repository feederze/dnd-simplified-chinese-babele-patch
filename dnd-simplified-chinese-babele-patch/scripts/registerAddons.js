export const MODULE_ID = 'dnd-simplified-chinese-babele-patch';
const DEBUG = true;


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
        "dynamicname": nameConverter,
        "itemsConverter": itemsConverter
    });
    await registerCustomMappings(babele);
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
    if (!translations) return originalValues;
    if (!Array.isArray(originalValues)) return originalValues;

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
    if (!translations) return originalValues;
    if (!Array.isArray(originalValues)) return originalValues;
    return originalValues.map(data => {
        const keyCandidates = [
            data?.title,
            data?.configuration?.identifier,
            data?.id,
            data?._id
        ].filter(v => typeof v === "string" && v.length);
        let translation = null;
        for (const key of keyCandidates) {
            translation = translations[key];
            if (translation) break;
        }
        if (!translation) return data;
        logDebug("advancementConverter: translation:", translation);

        return foundry.utils.mergeObject(
            data,
            {
                configuration: foundry.utils.mergeObject(
                    data.configuration,
                    { identifier: data.configuration.identifier ?? data.title.slugify() }
                ),
                title: translation.title ?? translation.name ?? data.title,
                hint: translation.hint ?? translation.condition ?? data.description
            }
        );
    });
}

function activitiesConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    logDebug("activitiesConverter: originalValues:", originalValues);
    logDebug("activitiesConverter: translations:", translations);
    if (!translations) return originalValues;
    if (!originalValues || typeof originalValues !== "object" || Array.isArray(originalValues)) {
        return originalValues;
    }
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
        return originalValues ?? data?.name;
    }
    const original = originalValues ?? data?.name;
    if (isActive) {
        return `${translations} ${original}`;
    } else {
        return translations;
    }
}
function itemsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    const babele = game.babele;
    if (!translations) return originalValues;
    if (!babele) return originalValues;
    if (!Array.isArray(originalValues)) return originalValues;

    // 打印快照，防止引用问题！！！！！！！
    const valuesToTranslate = JSON.parse(JSON.stringify(originalValues));
    let outputs = babele.converters["fromPack"](valuesToTranslate, translations);

    let isActive = game.settings.get(MODULE_ID, 'ActorItemsetting')
    if (!isActive) {
        return outputs;
    }
    return makeBilingualNames(outputs, originalValues);
}

function makeBilingualNames(outputs, originalValues) {
    if (!Array.isArray(outputs) || !Array.isArray(originalValues)) return outputs;

    // 建一个 _id → 原始英文名 的索引
    const originalNameById = {};
    for (const o of originalValues) {
        if (o && o._id) {
            originalNameById[o._id] = o.name;
        }
    }

    // 遍历 outputs，改成“中文 英文”形式
    return outputs.map(out => {
        if (!out || !out._id) return out;

        const originalName = originalNameById[out._id];
        // 没找到对应原文名就不改
        if (!originalName) return out;

        const translatedName = out.name ?? originalName;
        return foundry.utils.mergeObject(out, {
            name: `${translatedName} ${originalName}`
        });
    });
}
