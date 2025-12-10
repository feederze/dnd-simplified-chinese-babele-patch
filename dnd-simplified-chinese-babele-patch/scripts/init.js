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
        requiresReload: true
    });

    game.settings.register(MODULE_ID, 'namesetting', {
        name: '名称双语转换器开关',
        hint: '',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true
    });

    game.settings.register(MODULE_ID, 'ActorItemsetting', {
        name: '角色物品名称双语转换器开关',
        hint: '',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true
    });

    game.settings.register(MODULE_ID, 'TranslateBlackList', {
        name: '屏蔽列表',
        hint: '',
        scope: 'world',
        config: true,
        default: [],
        type: Array,
        requiresReload: true
    });

    if (game.settings.get(MODULE_ID, 'autoRegisterBabel')) {
        autoRegisterBabel();
    }
    console.log(`${MODULE_ID} | 初始化完成`);
});

async function autoRegisterBabel() {
    // console.log("5r汉化被加载哩")
    if (typeof Babele !== 'undefined') {
        // console.log("有babele!")
        //load the json file into a variable
        await registerAddons(game.babele);
        let translate_dir = "translation/cn";
        game.babele.register({
            module: MODULE_ID,
            dir: translate_dir,
            lang: 'cn'
        });
    }
}


// Hooks.on('babele.ready', () => {
//     console.log("Reindexing All Compendiums!")
//     game.packs.forEach(element => {
//         element.clear();
//         element.getIndex();
//     });
// });

Hooks.on('babele.dataLoaded', () => {
    if(game.babele.initialized)
    {
        const packs = game.babele.packs;
        if (packs?.has('dnd5e.actors24')) {
            packs.delete('dnd5e.actors24');
            console.log('已从 babele.packs 删除: dnd5e.actors24');
        }
        console.log("测试", packs);
    }
});





