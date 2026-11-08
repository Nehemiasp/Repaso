// Hilo principal del plugin: único lugar con la API de Figma. La interfaz vive en otro iframe.
import { APP_VERSION } from '../shared/constants';
import { AiError, checkKey, type FetchLike } from '../ai';
import { applyFixes, buildPreview } from '../fixes';
import { figmaPort } from '../fixes/figmaPort';
import { KEY_CHECK_MESSAGE } from '../shared/aiErrors';
import type { ToPlugin, ToUi } from '../shared/messages';
import type { Finding, Scene } from '../shared/types';
import { runReview } from './review';
import * as store from './storage';

async function main() {
  const size = await store.loadSize();
  figma.showUI(__html__, { width: size.width, height: size.height, themeColors: true, title: 'Repaso' });

  const post = (m: ToUi) => figma.ui.postMessage(m);
  let settings = await store.loadSettings();
  let signal = { cancelled: false };
  let running = false;
  let sizeTimer: ReturnType<typeof setTimeout> | undefined;
  /** Lo último que se revisó, en memoria: las correcciones se calculan sobre esto. */
  let pendingAi: ((run: boolean) => void) | null = null;
  let session: { scene: Scene; findings: Finding[]; aiNames: Record<string, string> } | null = null;

  figma.on('selectionchange', () => post({ type: 'selection', count: figma.currentPage.selection.length }));

  async function selectNode(nodeId: string) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || node.removed || !('visible' in node)) {
      figma.notify('Esa capa ya no existe. Vuelva a revisar.');
      return;
    }
    const scene = node as SceneNode;
    // La capa puede estar en otra página si el usuario cambió de página después de revisar.
    let page: BaseNode | null = scene;
    while (page && page.type !== 'PAGE') page = page.parent;
    if (page && page.type === 'PAGE' && page.id !== figma.currentPage.id) await figma.setCurrentPageAsync(page);
    figma.currentPage.selection = [scene];
    figma.viewport.scrollAndZoomIntoView([scene]);
  }

  figma.ui.onmessage = async (msg: ToPlugin) => {
    switch (msg.type) {
      case 'ready': {
        const key = await store.loadKey();
        post({
          type: 'init',
          payload: {
            settings,
            hasApiKey: !!key,
            ...(key ? { keyHint: store.keyHint(key) } : {}),
            firstRun: await store.isFirstRun(),
            selectionCount: figma.currentPage.selection.length,
            last: store.getLast(),
            ignoredCount: store.getIgnored().length,
            size,
            version: APP_VERSION,
          },
        });
        break;
      }
      case 'review':
        if (running) return;
        running = true;
        signal = { cancelled: false };
        try {
          const out = await runReview(
            msg.scope,
            { post, settings, noAi: msg.noAi, confirmAi: () => new Promise<boolean>((resolve) => (pendingAi = resolve)) },
            signal,
          );
          if (out.payload && out.scene) session = { scene: out.scene, findings: out.payload.findings, aiNames: out.aiNames ?? {} };
        } finally {
          running = false;
        }
        break;
      case 'cancel':
        signal.cancelled = true;
        pendingAi?.(false);
        pendingAi = null;
        break;
      case 'ai-decision':
        pendingAi?.(msg.run);
        pendingAi = null;
        break;
      case 'check-key': {
        const key = msg.key ?? (await store.loadKey());
        if (!key) {
          post({ type: 'key-check', ok: false, kind: 'ai-key-invalid', detail: 'Primero pegue una clave.' });
          break;
        }
        try {
          await checkKey(key, fetch as unknown as FetchLike);
          post({ type: 'key-check', ok: true });
        } catch (e) {
          const kind = e instanceof AiError ? e.kind : 'unknown';
          const base = KEY_CHECK_MESSAGE[kind] ?? 'No se pudo comprobar la clave.';
          post({ type: 'key-check', ok: false, kind, detail: `${base}${e instanceof AiError ? ` (${e.detail})` : ''}` });
        }
        break;
      }
      case 'select-node':
        await selectNode(msg.nodeId);
        break;
      case 'ignore': {
        const ids = [...store.getIgnored(), ...msg.ids];
        store.setIgnored(ids);
        post({ type: 'ignored', ids: store.getIgnored() });
        break;
      }
      case 'unignore': {
        store.setIgnored(store.getIgnored().filter((i) => !msg.ids.includes(i)));
        post({ type: 'ignored', ids: store.getIgnored() });
        break;
      }
      case 'clear-ignored':
        store.setIgnored([]);
        post({ type: 'ignored', ids: [] });
        break;
      case 'save-settings':
        settings = store.mergeSettings(msg.settings);
        await store.saveSettings(settings);
        break;
      case 'save-key': {
        await store.saveKey(msg.key);
        post({ type: 'settings', settings, hasApiKey: true, keyHint: store.keyHint(msg.key) });
        break;
      }
      case 'clear-key':
        await store.clearKey();
        post({ type: 'settings', settings, hasApiKey: false });
        break;
      case 'dismiss-welcome':
        await store.markWelcomeSeen();
        break;
      case 'resize':
        figma.ui.resize(msg.width, msg.height);
        clearTimeout(sizeTimer);
        sizeTimer = setTimeout(() => void store.saveSize({ width: msg.width, height: msg.height }), 400);
        break;
      case 'notify':
        figma.notify(msg.message);
        break;
      case 'request-fix-preview': {
        if (!session) return;
        const ids = new Set(msg.findingIds);
        const chosen = session.findings.filter((f) => ids.has(f.id));
        post({ type: 'fix-preview', preview: buildPreview(msg.kind, chosen, session.scene, { aiNames: session.aiNames }) });
        break;
      }
      case 'apply-fixes': {
        if (!session) return;
        const ids = new Set(msg.findingIds);
        const chosen = session.findings.filter((f) => ids.has(f.id));
        const res = await applyFixes(msg.kind, chosen, figmaPort, session.aiNames);
        const fixed = new Set(res.applied);
        session = { ...session, findings: session.findings.filter((f) => !fixed.has(f.id)) };
        post({ type: 'fix-applied', kind: msg.kind, applied: res.applied.length, skipped: res.skipped.length, fixedIds: res.applied });
        if (res.applied.length) figma.notify(`Repaso: ${res.applied.length} cambios aplicados. Ctrl+Z los deshace.`);
        break;
      }

    }
  };
}

void main();
