import { registerAddons } from './registerAddons.js';
import { TranslateBlacklistMenu } from './BlacklistMenu.js';
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

    game.settings.register(MODULE_ID, 'PackStatus', {
        name: '汉化状态',
        hint: '',
        scope: 'world',
        config: false,
        default: {},
        type: Object,
    });

    // 注册子菜单入口（仅 GM 可见）
    game.settings.registerMenu(MODULE_ID, 'translateBlacklistMenu', {
        name: 'Babele 屏蔽列表子菜单',
        label: '打开屏蔽列表设置',
        hint: '选择需要从翻译中屏蔽的 Compendium 集合。',
        icon: 'fa-solid fa-ban',
        type: TranslateBlacklistMenu,
        restricted: true,
    });

    if (game.settings.get(MODULE_ID, 'autoRegisterBabel')) {
        registerSelectiveBrowse();
        autoRegisterBabel();
    }
    console.log(`${MODULE_ID} | 初始化完成`);
});

const TRANSLATION_DIR = `modules/${MODULE_ID}/translation/cn`;

function registerSelectiveBrowse() {
    if (typeof libWrapper !== 'function') {
        console.warn(`${MODULE_ID} | libWrapper 不可用，回退为全量加载翻译文件`);
        return;
    }
    try {
        libWrapper.register(MODULE_ID, 'foundry.applications.apps.FilePicker.browse', async function (wrapped, source, target, ...args) {
            const result = await wrapped(source, target, ...args);
            const normalized = String(target ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
            if (source === 'data' && normalized === TRANSLATION_DIR) {
                result.files = (result.files ?? []).filter((file) => shouldLoadTranslationFile(file));
            }
            return result;
        }, 'WRAPPER');
    } catch (error) {
        console.warn(`${MODULE_ID} | 注册选择性加载失败，回退为全量加载翻译文件`, error);
    }
}

function shouldLoadTranslationFile(file) {
    const baseName = String(file).split('/').pop().split('\\').pop();
    if (baseName === 'mapping.json' || baseName === 'mappings.json') return true;
    const prefix = baseName.split('.')[0];
    if (!prefix) return false;
    return [...game.packs.keys()].some((key) => key.startsWith(`${prefix}.`));
}

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



Hooks.on('babele.dataLoaded', () => {
    if (!game.babele?.initialized) return;
    const packs = game.babele.packs;
    if (!packs) return;

    const saved = game.settings.get(MODULE_ID, 'PackStatus') || {};
    const packStatus = {};

    // 合并：当前 packs 的键，若已有保存则用保存值，否则默认 true
    for (const key of packs.keys()) {
        if (Object.prototype.hasOwnProperty.call(saved, key)) {
            packStatus[key] = saved[key];
        } else {
            packStatus[key] = true;
        }
    }

    // 准备一个保存函数，确保只在 Game ready 后写入 world 设置
    const savePackStatus = () => game.settings.set(MODULE_ID, 'PackStatus', packStatus);

    // 应用禁用：删除为 false 的 pack
    for (const [key, enabled] of Object.entries(packStatus)) {
        if (!enabled && packs.has(key)) {
        packs.delete(key);
        }
    }
    
    if(!game.user.isGM) return;
    // 在 ready 阶段统一保存 PackStatus，避免在 init 阶段写 world 设置导致错误
    if (game.ready) {
        savePackStatus();
    } else {
        Hooks.once('game.ready', savePackStatus);
    } 
});






