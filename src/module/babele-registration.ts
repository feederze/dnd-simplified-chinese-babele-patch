import { MODULE_ID, SETTINGS } from './constants';
import { createConverters, type ConverterDeps } from './converters';
import { mergePackStatus, type PackStatus } from './pack-status';

/**
 * Read the Babele instance off `game`. Babele ships no types and attaches
 * itself dynamically, so this is the single typed access point.
 */
function getBabele(): Babele | undefined {
  return (game as unknown as BabeleGame).babele;
}

/** Build the converter dependencies from live Foundry globals. */
function buildConverterDeps(): ConverterDeps {
  return {
    mergeObject: <T>(original: T, other: Record<string, unknown>): T =>
      foundry.utils.mergeObject(original as object, other) as T,
    isBilingual: () => game.settings.get(MODULE_ID, SETTINGS.NAME_SETTING) as boolean,
  };
}

/** Register this module's converters and custom mapping with Babele. */
export async function registerAddons(babele: Babele): Promise<void> {
  babele.registerConverters(createConverters(buildConverterDeps()));
  await registerCustomMappings(babele);
}

async function registerCustomMappings(babele: Babele): Promise<void> {
  const response = await fetch(`/modules/${MODULE_ID}/rules/mapping.json`);
  if (!response.ok) {
    throw new Error(`Failed to load JSON file: ${response.statusText}`);
  }
  babele.registerMapping(await response.json());
}

/** Auto-register the translation directory with Babele when it is available. */
export async function autoRegisterBabel(): Promise<void> {
  const babele = getBabele();
  if (typeof Babele !== 'undefined' && babele) {
    await registerAddons(babele);
    const translateDir = 'translation/cn';
    babele.register({ module: MODULE_ID, dir: translateDir, lang: 'cn' });
  }
}

/**
 * Reconcile and apply the per-pack blacklist once Babele has loaded its data.
 * Disabled packs are removed; the reconciled status is persisted (GM only).
 */
export function handleBabeleDataLoaded(): void {
  const babele = getBabele();
  if (!babele?.initialized) return;
  const packs = babele.packs;
  if (!packs) return;

  const saved = (game.settings.get(MODULE_ID, SETTINGS.PACK_STATUS) ?? {}) as PackStatus;
  const packStatus = mergePackStatus(packs.keys(), saved);

  const savePackStatus = (): unknown =>
    game.settings.set(MODULE_ID, SETTINGS.PACK_STATUS, packStatus);

  // 应用禁用：删除为 false 的 pack
  for (const [key, enabled] of Object.entries(packStatus)) {
    if (!enabled && packs.has(key)) {
      packs.delete(key);
    }
  }

  if (!game.user?.isGM) return;
  // 在 ready 阶段统一保存 PackStatus，避免在 init 阶段写 world 设置导致错误
  if (game.ready) {
    savePackStatus();
  } else {
    Hooks.once('ready', savePackStatus);
  }
}
