import { MODULE_ID, SETTINGS } from './constants';
import {
  collectStatusFromCheckboxes,
  formatPackStatusForDisplay,
  type PackStatus,
} from './pack-status';

interface MenuItem {
  key: string;
  pack: string;
  enabled: boolean;
  checked: boolean;
}

interface MenuGroup {
  namespace: string;
  items: MenuItem[];
  collapsed: boolean;
  groupChecked: boolean;
}

/**
 * GM-only form for choosing which Compendium packs to exclude from translation.
 * A checked box means "blacklist this pack".
 */
export class TranslateBlacklistMenu extends FormApplication {
  static override get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-blacklist-menu`,
      title: 'Babele 屏蔽列表设置',
      template: `modules/${MODULE_ID}/templates/blacklist-menu.html`,
      width: 520,
      height: 'auto',
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    });
  }

  override getData(): { groups: MenuGroup[] } {
    const packStatus = (game.settings.get(MODULE_ID, SETTINGS.PACK_STATUS) ?? {}) as PackStatus;
    const displayRows = formatPackStatusForDisplay(packStatus);

    // 分组：按 namespace 聚合
    const groupMap = new Map<string, { namespace: string; items: MenuItem[] }>();
    for (const row of displayRows) {
      const ns = row.namespace || '';
      let group = groupMap.get(ns);
      if (!group) {
        group = { namespace: ns, items: [] };
        groupMap.set(ns, group);
      }
      // 勾选表示“屏蔽（禁用）”
      const checked = !row.enabled;
      group.items.push({ key: row.key, pack: row.pack, enabled: row.enabled, checked });
    }

    const groups: MenuGroup[] = Array.from(groupMap.values()).map((g) => ({
      namespace: g.namespace,
      items: g.items,
      collapsed: false, // 默认展开
      groupChecked: g.items.every((it) => it.checked), // 组选择：全禁用则视为选中
    }));
    return { groups };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    html.find('button.save').on('click', async (ev) => {
      ev.preventDefault();
      // 收集当前界面所有条目的勾选状态，生成 PackStatus: { key: enabled }
      const itemNodes = Array.from(
        html[0].querySelectorAll<HTMLInputElement>('input[name="blacklist"]'),
      );
      const status = collectStatusFromCheckboxes(
        itemNodes.map((node) => ({ value: node.value, checked: node.checked })),
      );

      await game.settings.set(MODULE_ID, SETTINGS.PACK_STATUS, status);
      console.log('PackStatus 保存为:', status);
      ui.notifications?.info('已保存屏蔽列表');
      this.close();
    });

    // 组收缩/展开
    html.on('click', '.group-toggle', (ev) => {
      ev.preventDefault();
      const groupEl = (ev.currentTarget as HTMLElement).closest('.group');
      const body = groupEl?.querySelector<HTMLElement>('.items');
      if (!body) return;
      const isCollapsed = body.getAttribute('data-collapsed') === 'true';
      body.setAttribute('data-collapsed', String(!isCollapsed));
      body.style.display = isCollapsed ? '' : 'none';
    });

    // 组全选/全不选（表示整组禁用/启用）
    html.on('change', '.group-check', (ev) => {
      const groupEl = (ev.currentTarget as HTMLElement).closest('.group');
      const checked = (ev.currentTarget as HTMLInputElement).checked;
      const itemCheckboxes = groupEl?.querySelectorAll<HTMLInputElement>('input[name="blacklist"]');
      itemCheckboxes?.forEach((cb) => {
        cb.checked = checked;
      });
    });
  }

  // FormApplication requires an _updateObject implementation; saving is handled
  // by the custom "save" button listener above, so this is intentionally a no-op.
  protected override async _updateObject(): Promise<void> {
    // no-op
  }
}
