import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Builds lightweight `labels.json` / `titles.json` indexes from a directory of
 * Babele translation files, so the module can translate Compendium list labels
 * and index titles cheaply at startup.
 *
 * The pure helpers (argument parsing, title extraction, sorting) are exported
 * and unit-tested; `main()` is the impure I/O shell.
 */

export interface CliArgs {
  input?: string;
  labelsOutput?: string;
  titlesOutput?: string;
  recursive: boolean;
  pretty: boolean;
  includeFolders: boolean;
  dryRun: boolean;
  deep: boolean;
  help?: boolean;
}

export type TitleMap = Record<string, string>;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    recursive: true,
    pretty: true,
    includeFolders: false,
    dryRun: false,
    deep: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') args.input = argv[++i];
    else if (a === '--labels-output') args.labelsOutput = argv[++i];
    else if (a === '--titles-output') args.titlesOutput = argv[++i];
    else if (a === '--output' || a === '-o') args.labelsOutput = argv[++i];
    else if (a === '--no-recursive') args.recursive = false;
    else if (a === '--compact') args.pretty = false;
    else if (a === '--include-folders') args.includeFolders = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--deep') args.deep = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

export function usage(): string {
  return [
    '用法：node tools/generate-light-index.mjs --input <翻译目录> [--labels-output <labels.json>] [--titles-output <titles.json>] [--include-folders] [--compact] [--no-recursive] [--dry-run] [--deep]',
    '',
    '输出：',
    '- labels.json：{ "module.pack": "译名label", ... }',
    '- titles.json：{ "module.pack": { "titles": {"原名": "译名"}, "folders": {"原文件夹": "译名"} }, ... }',
    '',
    '说明：全量读取翻译文件并抽取“标题(name)”与 folders 映射，便于启动期轻量翻译 Compendium 列表与索引标题。',
    '默认只抽取 entries 顶层的标题（对应 compendium 索引条目）。如果你需要把嵌套结构里的 name 也索引出来，用 --deep。',
  ].join('\n');
}

async function* walk(dir: string, recursive: boolean): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!recursive) continue;
      yield* walk(full, recursive);
      continue;
    }
    yield full;
  }
}

export function isJsonFile(file: string): boolean {
  return file.toLowerCase().endsWith('.json');
}

export function baseNameNoExt(file: string): string {
  return path.basename(file, path.extname(file));
}

export function decodeCollectionKey(stem: string): string {
  try {
    return decodeURIComponent(stem);
  } catch {
    return stem;
  }
}

function upsertNested<T>(obj: Record<string, T>, key: string, factory: () => T): T {
  if (!obj[key]) obj[key] = factory();
  return obj[key];
}

export function sortObject<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

export function extractTitlesFromEntries(
  entries: unknown,
  { deep }: { deep: boolean } = { deep: false },
): TitleMap {
  const titles: TitleMap = {};
  if (!entries) return titles;

  const assignTitle = (key: unknown, value: unknown): void => {
    if (typeof key !== 'string' || !key.trim()) return;
    if (typeof value !== 'string' || !value.trim()) return;
    titles[key] = value;
  };

  const addIdAliases = (node: any, value: string, fallbackKey: string): void => {
    const idKey =
      typeof node?._id === 'string' ? node._id : typeof node?.id === 'string' ? node.id : null;
    if (idKey && idKey !== fallbackKey) assignTitle(idKey, value);
  };

  const scanNestedTitles = (node: any): void => {
    if (!deep) return;
    if (!node) return;
    if (Array.isArray(node)) {
      for (const v of node) scanNestedTitles(v);
      return;
    }
    if (typeof node !== 'object') return;

    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') {
        const name = (v as any).name;
        if (typeof name === 'string' && name.trim()) {
          assignTitle(k, name);
          addIdAliases(v, name, k);
        }
        scanNestedTitles(v);
      }
    }
  };

  if (Array.isArray(entries)) {
    for (const row of entries) {
      if (!row || typeof row !== 'object') continue;
      const translated = typeof row.name === 'string' ? row.name : null;
      if (translated && translated.trim()) {
        const idKey = typeof row.id === 'string' ? row.id : null;
        const underscoreIdKey = typeof row._id === 'string' ? row._id : null;
        if (idKey) assignTitle(idKey, translated);
        if (underscoreIdKey && underscoreIdKey !== idKey) assignTitle(underscoreIdKey, translated);
      }
      scanNestedTitles(row);
    }
    return titles;
  }

  if (typeof entries === 'object') {
    for (const [k, v] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof v === 'string') {
        assignTitle(k, v);
        continue;
      }
      if (v && typeof v === 'object') {
        const translated = typeof (v as any).name === 'string' ? (v as any).name : null;
        if (translated && translated.trim()) {
          assignTitle(k, translated);
          addIdAliases(v, translated, k);
        }
        scanNestedTitles(v);
      }
    }
  }

  return titles;
}

interface PackIndex {
  titles: TitleMap;
  folders: TitleMap;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const inputDir = path.resolve(args.input);
  const labelsOutput = path.resolve(args.labelsOutput ?? path.join(inputDir, 'labels.json'));
  const titlesOutput = path.resolve(args.titlesOutput ?? path.join(inputDir, 'titles.json'));

  const labels: TitleMap = {};
  const titlesIndex: Record<string, PackIndex> = {};

  const files: string[] = [];
  for await (const file of walk(inputDir, args.recursive)) files.push(file);
  files.sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (!isJsonFile(file)) continue;
    const name = path.basename(file).toLowerCase();
    if (name === 'labels.json') continue;
    if (name === 'titles.json') continue;
    if (name === 'mapping.json') continue;
    if (!args.includeFolders && name.endsWith('_packs-folders.json')) continue;

    let json: any;
    try {
      const raw = await fs.readFile(file, 'utf8');
      json = JSON.parse(raw);
    } catch {
      continue;
    }

    const stem = baseNameNoExt(file);
    const collection = decodeCollectionKey(stem);

    if (typeof json?.label === 'string' && json.label.trim()) {
      labels[collection] = json.label;
    }

    const packIndex = upsertNested(titlesIndex, collection, () => ({ titles: {}, folders: {} }));
    const extractedTitles = extractTitlesFromEntries(json?.entries, { deep: args.deep });
    Object.assign(packIndex.titles, extractedTitles);

    if (json?.folders && typeof json.folders === 'object' && !Array.isArray(json.folders)) {
      Object.assign(packIndex.folders, json.folders);
    }
  }

  const outLabels = JSON.stringify(sortObject(labels), null, args.pretty ? 2 : 0) + '\n';

  const normalizedTitlesIndex: Record<string, PackIndex> = {};
  let totalTitles = 0;
  let totalFolders = 0;
  for (const collection of Object.keys(titlesIndex).sort()) {
    const titles = sortObject(titlesIndex[collection].titles ?? {});
    const folders = sortObject(titlesIndex[collection].folders ?? {});
    const titleCount = Object.keys(titles).length;
    const folderCount = Object.keys(folders).length;
    if (titleCount === 0 && folderCount === 0) {
      continue;
    }

    totalTitles += titleCount;
    totalFolders += folderCount;
    normalizedTitlesIndex[collection] = { titles, folders };
  }
  const outTitles = JSON.stringify(normalizedTitlesIndex, null, args.pretty ? 2 : 0) + '\n';

  if (args.dryRun) {
    process.stdout.write(outLabels);
    process.stdout.write(outTitles);
    return;
  }

  await fs.mkdir(path.dirname(labelsOutput), { recursive: true });
  await fs.mkdir(path.dirname(titlesOutput), { recursive: true });
  await fs.writeFile(labelsOutput, outLabels, 'utf8');
  await fs.writeFile(titlesOutput, outTitles, 'utf8');

  console.log(`已生成：${labelsOutput}（${Object.keys(labels).length} 条）`);
  console.log(
    `已生成：${titlesOutput}（${Object.keys(normalizedTitlesIndex).length} 包，标题 ${totalTitles} 条，文件夹 ${totalFolders} 条）`,
  );
}

// Run as a CLI when invoked directly (not when imported by tests).
const invokedDirectly =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
