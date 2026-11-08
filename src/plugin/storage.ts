// Almacenamiento: ajustes y clave en el equipo (clientStorage); ignorados y última revisión en el archivo (pluginData).
import { DEFAULT_SETTINGS } from '../shared/constants';
import type { LastSummary } from '../shared/messages';
import type { Settings } from '../shared/types';

const K = { settings: 'settings', apiKey: 'anthropicKey', size: 'size', welcomeSeen: 'welcomeSeen' } as const;
const D = { ignored: 'ignored', last: 'last' } as const;

export const DEFAULT_SIZE = { width: 360, height: 560 };

/** Mezcla lo guardado con los valores por defecto, para que ajustes nuevos aparezcan en versiones futuras. */
export function mergeSettings(stored: unknown): Settings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...s, rules: { ...DEFAULT_SETTINGS.rules, ...(s.rules ?? {}) } };
}

export async function loadSettings(): Promise<Settings> {
  return mergeSettings(await figma.clientStorage.getAsync(K.settings));
}
export const saveSettings = (s: Settings) => figma.clientStorage.setAsync(K.settings, s);

export async function loadKey(): Promise<string | null> {
  const k = await figma.clientStorage.getAsync(K.apiKey);
  return typeof k === 'string' && k ? k : null;
}
export const saveKey = (k: string) => figma.clientStorage.setAsync(K.apiKey, k);
export const clearKey = () => figma.clientStorage.deleteAsync(K.apiKey);
export const keyHint = (k: string | null) => (k ? k.slice(-4) : undefined);

export async function loadSize(): Promise<{ width: number; height: number }> {
  const s = await figma.clientStorage.getAsync(K.size);
  return s && typeof s.width === 'number' && typeof s.height === 'number' ? s : DEFAULT_SIZE;
}
export const saveSize = (s: { width: number; height: number }) => figma.clientStorage.setAsync(K.size, s);

export async function isFirstRun(): Promise<boolean> {
  return !(await figma.clientStorage.getAsync(K.welcomeSeen));
}
export const markWelcomeSeen = () => figma.clientStorage.setAsync(K.welcomeSeen, true);

const parse = <T,>(raw: string, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const getIgnored = (): string[] => parse<string[]>(figma.root.getPluginData(D.ignored), []);
export const setIgnored = (ids: string[]) => figma.root.setPluginData(D.ignored, JSON.stringify([...new Set(ids)]));
export const getLast = (): LastSummary | null => parse<LastSummary | null>(figma.root.getPluginData(D.last), null);
export const setLast = (l: LastSummary) => figma.root.setPluginData(D.last, JSON.stringify(l));
