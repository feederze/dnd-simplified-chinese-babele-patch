const MODULE_ID = 'dnd-simplified-chinese-babele-patch';

Hooks.on('init', () => {
    game.settings.register(MODULE_ID, 'autoRegisterBabel', {
        name: '激活DND babele汉化',
        hint: '',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
        onChange: value => {
            if (value) {
                autoRegisterBabel();
            }

            window.location.reload();
        },
    });

    if (game.settings.get(MODULE_ID, 'autoRegisterBabel')) {
        autoRegisterBabel();
    }
});

function autoRegisterBabel() {
    // console.log("5r汉化被加载哩")
    if (typeof Babele !== 'undefined') {
        // console.log("有babele!")
        game.babele.register({
            module: MODULE_ID,
            dir: "translation/cn",
            lang: 'cn'
        });
    }
}


Hooks.on('babele.ready', () => {
    console.log("Reindexing All Compendiums!")
    game.packs.forEach(element => {
        element.clear();
        element.getIndex();
    });
});
