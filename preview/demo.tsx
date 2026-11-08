// Demo interactiva: la App REAL de la interfaz, conectada a un «plugin» simulado que usa el motor, la vista previa
// y los datos de ejemplo reales. Sirve para el video del caso de estudio y para probar el flujo sin abrir Figma.
import { render } from 'preact';
import archivoPrueba from '../fixtures/archivo-prueba.json';
import { buildPreview } from '../src/fixes';
import { runRules } from '../src/engine';
import { APP_VERSION, DEFAULT_SETTINGS } from '../src/shared/constants';
import type { FixKindGroup, ToPlugin, ToUi } from '../src/shared/messages';
import type { Finding, Scene, StyleCatalog } from '../src/shared/types';
import { App, type Bridge } from '../src/ui/App';
import '../src/ui/styles/base.css';
import '../src/ui/styles/app.css';
import './figma-theme.css';
import { aiFindings, renamePreview34 } from './fixtures/data';

const params = new URLSearchParams(location.search);
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const withAi = params.get('ai') === '1';
document.documentElement.classList.add(`figma-${theme}`);
document.body.classList.toggle('demo-dark', theme === 'dark');

const { scene, catalog } = archivoPrueba as unknown as { scene: Scene; catalog: StyleCatalog };

function demoBridge(): Bridge {
  let handler: (m: ToUi) => void = () => {};
  const post = (m: ToUi, ms = 0) => setTimeout(() => handler(m), ms);
  let findings: Finding[] = [];
  let ignored: string[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  const review = (scope: 'selection' | 'page') => {
    const t0 = Date.now();
    findings = withAi ? aiFindings : runRules(scene, catalog, { ...DEFAULT_SETTINGS }).findings;
    const total = 1240;
    [0, 0.25, 0.55, 0.8, 1].forEach((p, i) => timers.push(setTimeout(() => handler({ type: 'progress', phase: i < 2 ? 'reading' : 'checking', done: Math.round(total * p), total: i === 0 ? 0 : total }), 350 * i)));
    timers.push(setTimeout(() => handler({ type: 'result', payload: { findings, ignoredIds: ignored, meta: { scope, nodeCount: total, durationMs: Date.now() - t0, at: Date.now() }, ...(withAi ? { aiSummary: 'El archivo tiene una base sólida, pero conviene corregir primero el contraste y los nombres de capa.' } : {}) } }), 350 * 5));
  };

  return {
    listen: (h) => {
      handler = h;
      return () => {};
    },
    send(msg: ToPlugin) {
      switch (msg.type) {
        case 'ready':
          post({ type: 'init', payload: { settings: { ...DEFAULT_SETTINGS }, hasApiKey: false, firstRun: params.get('first') === '1', selectionCount: 1, last: null, ignoredCount: 0, size: { width: 360, height: 560 }, version: APP_VERSION } });
          break;
        case 'review':
          review(msg.scope);
          break;
        case 'cancel':
          timers.forEach(clearTimeout);
          post({ type: 'cancelled' });
          break;
        case 'ignore':
          ignored = [...new Set([...ignored, ...msg.ids])];
          post({ type: 'ignored', ids: ignored });
          break;
        case 'unignore':
          ignored = ignored.filter((i) => !msg.ids.includes(i));
          post({ type: 'ignored', ids: ignored });
          break;
        case 'request-fix-preview': {
          const chosen = findings.filter((f) => msg.findingIds.includes(f.id));
          const preview = buildPreview(msg.kind, chosen, scene, withAi ? { aiNames: { 'layer-default-name:e04-frame': 'Tarjeta / Producto', 'layer-default-name:e04-rect': 'Fondo / Gris' } } : {});
          // Para la demo del lote grande, se usa la vista previa de 34 capas cuando se pide «renombrar».
          post({ type: 'fix-preview', preview: msg.kind === 'rename' && params.get('big') === '1' ? renamePreview34 : preview }, 400);
          break;
        }
        case 'apply-fixes': {
          const ids = findings.filter((f) => msg.findingIds.includes(f.id) && f.fix?.kind === (msg.kind as FixKindGroup)).map((f) => f.id);
          findings = findings.filter((f) => !ids.includes(f.id));
          post({ type: 'fix-applied', kind: msg.kind, applied: ids.length, skipped: 0, fixedIds: ids }, 700);
          break;
        }
        case 'check-key':
          post({ type: 'key-check', ok: true }, 500);
          break;
        default:
          break;
      }
    },
  };
}

const bridge = demoBridge();
render(
  <div class="demo-stage">
    <div class={`demo-frame figma-${theme}`}>
      <App bridge={bridge} />
    </div>
  </div>,
  document.getElementById('app')!,
);
