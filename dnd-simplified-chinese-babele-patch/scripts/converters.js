
export function registerCustomConverters(babele) {
    // console.log("注册了effects转换器")
    // console.log("registerCustomConverters: ");
    game.babele.registerConverters({
        "effects": effectsConverter,
        "advancement": advancementConverter
    });
    // console.log("registerCustomConverters: Done");
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