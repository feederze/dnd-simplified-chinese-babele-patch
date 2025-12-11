import { MODULE_ID } from './init.js';

export class TranslateBlacklistMenu extends FormApplication {
  static get defaultOptions() {
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

  getData(options) {
    const packStatus = game.settings.get(MODULE_ID, 'PackStatus') || {};
    const displayRows = formatPackStatusForDisplay(packStatus);

    // 分组：按 namespace 聚合
    const groupMap = new Map();
    for (let i = 0; i < displayRows.length; i++) {
      const row = displayRows[i];
      const ns = row.namespace || '';
      let group = groupMap.get(ns);
      if (!group) {
        group = { namespace: ns, items: [] };
        groupMap.set(ns, group);
      }
      // 勾选表示“屏蔽（禁用）”
      const checked = (!row.enabled);
      group.items.push({
        key: row.key,
        pack: row.pack,
        enabled: row.enabled,
        checked,
      });
    }

    const groups = Array.from(groupMap.values()).map(g => ({
      namespace: g.namespace,
      items: g.items,
      collapsed: false, // 默认展开
      groupChecked: g.items.every(it => it.checked), // 组选择：全禁用则视为选中
    }));
    return { groups };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('button.save').on('click', async (ev) => {
      ev.preventDefault();
      // 收集当前界面所有条目的勾选状态，生成 PackStatus: { key: enabled }
      const itemNodes = Array.from(html[0].querySelectorAll('input[name="blacklist"]'));
      const status = {};
      for (let i = 0; i < itemNodes.length; i++) {
        const node = itemNodes[i];
        const key = node.value;
        const checked = node.checked; // 勾选表示“屏蔽/禁用”
        status[key] = !checked;       // enabled = !checked
      }

      await game.settings.set(MODULE_ID, 'PackStatus', status);
      console.log('PackStatus 保存为:', status);
      ui.notifications?.info('已保存屏蔽列表');
      this.close();
    });

    // 组收缩/展开
    html.on('click', '.group-toggle', (ev) => {
      ev.preventDefault();
      const groupEl = ev.currentTarget.closest('.group');
      const body = groupEl.querySelector('.items');
      const isCollapsed = body.getAttribute('data-collapsed') === 'true';
      body.setAttribute('data-collapsed', String(!isCollapsed));
      body.style.display = isCollapsed ? '' : 'none';
    });

    // 组全选/全不选（表示整组禁用/启用）
    html.on('change', '.group-check', (ev) => {
      const groupEl = ev.currentTarget.closest('.group');
      const checked = ev.currentTarget.checked;
      const itemCheckboxes = groupEl.querySelectorAll('input[name="blacklist"]');
      itemCheckboxes.forEach(cb => {
        cb.checked = checked;
      });
    });
  }
}

// 将 PackStatus（字典：key -> bool）转换为可显示的三维结构
export function formatPackStatusForDisplay(statusObj) {
  const rows = [];
  for (const key in statusObj) {
    if (!Object.prototype.hasOwnProperty.call(statusObj, key)) continue;
    const enabled = !!statusObj[key];
    const [namespace, pack] = splitKey(key);
    rows.push({ namespace, pack, enabled, key });
  }
  return rows;
}

function splitKey(key) {
  const parts = String(key).split('.');
  const namespace = parts[0] ?? '';
  const pack = parts.slice(1).join('.') || '';
  return [namespace, pack];
}
