import { MODULE_ID, SETTINGS } from './constants';
import { TranslateBlacklistMenu } from './blacklist-menu';

/** Register this module's world settings and the blacklist submenu. */
export function registerSettings(): void {
  game.settings.register(MODULE_ID, SETTINGS.AUTO_REGISTER, {
    name: '激活DND babele汉化',
    hint: '',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.NAME_SETTING, {
    name: '名称双语转换器开关',
    hint: '',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.PACK_STATUS, {
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
}
