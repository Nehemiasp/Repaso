import { AiError, checkKey, type FetchLike } from '../ai';
import { KEY_CHECK_MESSAGE } from '../shared/aiErrors';
import type { ToUi } from '../shared/messages';
import { loadKey } from './storage';

/** «Probar clave»: valida con GET /v1/models (no gasta tokens) y explica cada fallo en español. */
export async function doCheckKey(typed: string | undefined, post: (m: ToUi) => void): Promise<void> {
  const key = typed ?? (await loadKey());
  if (!key) {
    post({ type: 'key-check', ok: false, kind: 'ai-key-invalid', detail: 'Primero pegue una clave.' });
    return;
  }
  try {
    await checkKey(key, fetch as unknown as FetchLike);
    post({ type: 'key-check', ok: true });
  } catch (e) {
    const kind = e instanceof AiError ? e.kind : 'unknown';
    const base = KEY_CHECK_MESSAGE[kind] ?? 'No se pudo comprobar la clave.';
    post({ type: 'key-check', ok: false, kind, detail: `${base}${e instanceof AiError ? ` (${e.detail})` : ''}` });
  }
}
