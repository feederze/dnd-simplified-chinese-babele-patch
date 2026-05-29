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

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const BlacklistMenuBase = HandlebarsApplicationMixin(ApplicationV2);

// Derive the framework lifecycle types from the base class so our overrides stay
// in lock-step with whatever foundry-vtt-types declares for this Foundry version.
type BaseInstance = InstanceType<typeof BlacklistMenuBase>;
type PrepareOptions = Parameters<BaseInstance['_prepareContext']>[0];
type PrepareContext = Awaited<ReturnType<BaseInstance['_prepareContext']>>;
type RenderContext = Parameters<BaseInstance['_onRender']>[0];
// The exact handler type foundry-vtt-types expects for `form.handler`.
type FormHandler = NonNullable<
  NonNullable<(typeof BlacklistMenuBase)['DEFAULT_OPTIONS']['form']>['handler']
>;

/**
 * GM-only form for choosing which Compendium packs to exclude from translation.
 * A checked box means "blacklist this pack".
 *
 * Built on the modern ApplicationV2 framework (Foundry v13+); the legacy
 * FormApplication (appv1) it replaced is deprecated and slated for removal.
 */
export class TranslateBlacklistMenu extends BlacklistMenuBase {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-blacklist-menu`,
    tag: 'form',
    window: {
      title: 'Babele 屏蔽列表设置',
      icon: 'fa-solid fa-ban',
    },
    position: {
      width: 520,
      height: 'auto' as const,
    },
    form: {
      // foundry-vtt-types models the handler with a bound `this`; our static
      // handler is structurally compatible with how Foundry invokes it.
      handler: TranslateBlacklistMenu.#onSubmit as unknown as FormHandler,
      closeOnSubmit: true,
    },
    actions: {
      toggleGroup: TranslateBlacklistMenu.#onToggleGroup,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/blacklist-menu.hbs`,
    },
  };

  override async _prepareContext(
    options: PrepareOptions,
  ): Promise<PrepareContext & { groups: MenuGroup[] }> {
    const context = await super._prepareContext(options);
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
    return { ...context, groups };
  }

  override async _onRender(context: RenderContext, options: PrepareOptions): Promise<void> {
    await super._onRender(context, options);
    // 组全选/全不选（表示整组禁用/启用）
    this.element.querySelectorAll<HTMLInputElement>('.group-check').forEach((groupCheck) => {
      groupCheck.addEventListener('change', (ev) => {
        const groupEl = (ev.currentTarget as HTMLElement).closest('.group');
        const checked = (ev.currentTarget as HTMLInputElement).checked;
        groupEl
          ?.querySelectorAll<HTMLInputElement>('input[name="blacklist"]')
          .forEach((cb) => (cb.checked = checked));
      });
    });
  }

  /** Collapse/expand a namespace group (data-action="toggleGroup"). */
  static #onToggleGroup(_event: PointerEvent, target: HTMLElement): void {
    const body = target.closest('.group')?.querySelector<HTMLElement>('.items');
    if (!body) return;
    const isCollapsed = body.getAttribute('data-collapsed') === 'true';
    body.setAttribute('data-collapsed', String(!isCollapsed));
    body.style.display = isCollapsed ? '' : 'none';
  }

  /**
   * Persist the blacklist when the form is submitted. The framework closes the
   * window afterwards (`form.closeOnSubmit`).
   */
  static async #onSubmit(_event: Event, form: HTMLFormElement): Promise<void> {
    // 收集当前界面所有条目的勾选状态，生成 PackStatus: { key: enabled }
    const itemNodes = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="blacklist"]'));
    const status = collectStatusFromCheckboxes(
      itemNodes.map((node) => ({ value: node.value, checked: node.checked })),
    );

    await game.settings.set(MODULE_ID, SETTINGS.PACK_STATUS, status);
    console.log('PackStatus 保存为:', status);
    ui.notifications?.info('已保存屏蔽列表');
  }
}
