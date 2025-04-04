
export async function registerAddons(babele) {
    // console.log("注册了effects转换器")
    // console.log("registerCustomConverters: ");
    babele.registerConverters({
        "effects": effectsConverter,
        "advancement": advancementConverter
    });
    await registerCustomMappings(babele)
    // console.log("registerCustomConverters: Done");
}

async function registerCustomMappings(babele) {
    const response = await fetch('/modules/dnd-simplified-chinese-babele-patch/rules/mapping.json');
    if (!response.ok) {
        throw new Error(`Failed to load JSON file: ${response.statusText}`);
    }
    const mappingFile = await response.json();
    babele.registerMapping(mappingFile)
}

function effectsConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    return originalValues.map(data => {
        if (!translations) return data;
        const translation = translations[data.name];
        if (!translation) return data;

        return foundry.utils.mergeObject(
            data,
            {
                name: translation.name ?? data.name,
                description: translation.description ?? data.description
            }
        );
    }
    );
}

function advancementConverter(originalValues, translations, data, translatedCompendium, allTranslations) {
    // console.log("advancementConverter: ", originalValues, translations, data, translatedCompendium, allTranslations);
    return originalValues.map(data => {
        if (!translations) return data;
        const translation = translations[data.title];
        if (!translation) return data;

        return foundry.utils.mergeObject(
            data,
            {
                configuration: foundry.utils.mergeObject(
                    data.configuration,
                    { identifier: data.configuration.identifier ?? data.configuration.title }
                ),
                title: translation.title ?? data.title,
                hint: translation.hint ?? data.description
            }
        );
    }
    );
}