// Hilo principal del plugin: único lugar con la API de Figma. La interfaz vive en otro iframe.
import { APP_VERSION } from '../shared/constants';
import type { ToPlugin, ToUi } from '../shared/messages';
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
          await runReview(msg.scope, { post, settings }, signal);
        } finally {
          running = false;
        }
        break;
      case 'cancel':
        signal.cancelled = true;
        break;
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
      default:
        // Mensajes de correcciones (fase 3) y de IA (fase 4) se conectan aquí.
        break;
    }
  };
}

void main();
