import { registerAddons } from './registerAddons.js';

export const MODULE_ID = 'dnd-simplified-chinese-babele-patch';

Hooks.on('init', () => {
    game.settings.register(MODULE_ID, 'autoRegisterBabel', {
        name: '激活DND babele汉化',
        hint: '',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
        onChange: async value => {
            if (value) {
                await autoRegisterBabel();
            }

            window.location.reload();
        },
    });

<<<<<<< HEAD
    game.settings.register(MODULE_ID, 'namesetting', {
        name: '名称双语转换器开关',
=======
    game.settings.register(MODULE_ID, 'makeTitleWithEnglish', {
        name: '在标题中拼接英文原文',
>>>>>>> upstream/main
        hint: '',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
<<<<<<< HEAD
    });

=======
        onChange: async value => {
            await autoRegisterBabel();
            window.location.reload();
        },
    });
>>>>>>> upstream/main
    if (game.settings.get(MODULE_ID, 'autoRegisterBabel')) {
        autoRegisterBabel();
    }
});

async function autoRegisterBabel() {
    // console.log("5r汉化被加载哩")
    if (typeof Babele !== 'undefined') {
        // console.log("有babele!")
        //load the json file into a variable
        await registerAddons(game.babele);
        let translate_dir = "translation/cn";
        if (game.settings.get(MODULE_ID, 'makeTitleWithEnglish')) {
            translate_dir = "translation/cn-with-english";
        }
        game.babele.register({
            module: MODULE_ID,
            dir: translate_dir,
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



