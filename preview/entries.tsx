import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../src/shared/constants';
import type { ErrorKind, FixKindGroup, FixPreview } from '../src/shared/messages';
import { SEVERITIES, type Finding, type Settings as SettingsT } from '../src/shared/types';
import {
  Button, Checkbox, Cuadros, Disclosure, EmptyState, Field, FindingRow, Header, ICON_NAMES, Icon, IconButton, Notice, NumberField,
  ProgressBar, ScoreRing, Segmented, Select, SeverityBadge, Switch, Tabs, Toast,
} from '../src/ui/components';
import { About, ErrorScreen, Export, Home, Results, Reviewing, Settings, Welcome, type BatchState, type KeyCheckState } from '../src/ui/screens';
import { MODELS } from '../src/ui/screens/Settings';
import * as D from './fixtures/data';

export interface Entry {
  id: string;
  group: string;
  title: string;
  note?: string;
  wide?: boolean;
  render: () => ComponentChildren;
}

export const GROUPS = [
  { id: 'welcome', title: '1 · Bienvenida', note: 'La primera vez: qué hace en tres líneas, «Revisar selección» y enlace a ajustes.' },
  { id: 'home', title: '2 · Inicio', note: 'Alcance, botón Revisar y resumen de la última revisión.' },
  { id: 'reviewing', title: '3 · Revisando', note: 'Progreso con conteo de capas y botón Cancelar.' },
  { id: 'results', title: '4 · Resultados', note: 'Puntaje, severidades, pestañas por categoría, filas de hallazgo y corrección en lote con vista previa. Incluye casos difíciles.' },
  { id: 'clean', title: '5 · Sin problemas', note: 'Estado vacío positivo con el motivo de cuadros completo.' },
  { id: 'errors', title: '6 · Errores', note: 'Sin selección, selección vacía, errores de la IA (clave, saldo, conexión, límite) y archivo demasiado grande.' },
  { id: 'settings', title: '7 · Ajustes', note: 'Reglas, umbrales, trato del texto, IA y privacidad.' },
  { id: 'export', title: '8 · Exportar', note: 'Reporte en Markdown para pegar en una tarea o en Notion.' },
  { id: 'about', title: '9 · Acerca de', note: 'Versión, autor y motivo de marca.' },
  { id: 'components', title: 'Componentes', note: 'Cada pieza reutilizable con sus variantes. Viven en src/ui/components.' },
] as const;

const noop = () => {};

/** Envuelve Results con estado local para que las pestañas, «Ignorar» y la vista previa funcionen en la galería. */
function ResultsDemo({ findings, aiSummary, aiNotice, initialBatch, applied, ignored = [], scope = 'selection' }: {
  findings: Finding[]; aiSummary?: string; aiNotice?: string; initialBatch?: BatchState; applied?: string; ignored?: string[]; scope?: 'selection' | 'page';
}) {
  const [ignoredIds, setIgnoredIds] = useState<string[]>(ignored);
  const [batch, setBatch] = useState<BatchState | null>(initialBatch ?? null);
  const previews: Record<FixKindGroup, FixPreview> = { rename: D.renamePreview34, 'apply-color': D.colorPreview, 'apply-text-style': D.textPreview, 'snap-spacing': D.spacingPreview };
  return (
    <Results
      findings={findings}
      ignoredIds={ignoredIds}
      meta={D.meta({ scope })}
      aiSummary={aiSummary}
      aiNotice={aiNotice}
      now={D.NOW}
      batch={batch}
      appliedMessage={applied}
      onSelect={noop}
      onIgnore={(ids) => setIgnoredIds([...new Set([...ignoredIds, ...ids])])}
      onUnignore={(ids) => setIgnoredIds(ignoredIds.filter((i) => !ids.includes(i)))}
      onRequestBatch={(kind) => setBatch({ kind, preview: previews[kind], applying: false })}
      onApplyBatch={() => setBatch(null)}
      onCloseBatch={() => setBatch(null)}
      onExport={noop}
      onAgain={noop}
      onHome={noop}
      onSettings={noop}
    />
  );
}

/** Ajustes con estado local. */
function SettingsDemo({ hasKey = false, keyCheck = { status: 'idle' } as KeyCheckState, aiEnabled = false }: { hasKey?: boolean; keyCheck?: KeyCheckState; aiEnabled?: boolean }) {
  const [s, setS] = useState<SettingsT>({ ...DEFAULT_SETTINGS, aiEnabled });
  return (
    <Settings settings={s} onChange={setS} hasKey={hasKey} keyHint={hasKey ? '3fA9' : undefined} keyCheck={keyCheck} ignoredCount={3} saved={false}
      onSaveKey={noop} onClearKey={noop} onCheckKey={noop} onClearIgnored={noop} onBack={noop} onAbout={noop} />
  );
}

function HomeDemo(props: Partial<Parameters<typeof Home>[0]>) {
  const [scope, setScope] = useState<'selection' | 'page'>(props.scope ?? 'selection');
  return (
    <Home scope={scope} onScope={setScope} selectionCount={3} last={null} rulesOn={9} rulesTotal={9} ai="off" now={D.NOW}
      onReview={noop} onViewResults={noop} onSettings={noop} onAbout={noop} {...props} />
  );
}

const lastSummary = { score: 74, total: 61, critical: 3, high: 12, medium: 28, low: 18, scope: 'selection' as const, nodeCount: 1240, at: D.NOW - 12 * 60_000 };
const ERROR_KINDS: ErrorKind[] = ['no-selection', 'empty-selection', 'ai-key-invalid', 'ai-no-credit', 'ai-offline', 'ai-rate-limit', 'too-large', 'unknown'];
const ERROR_TITLES: Record<ErrorKind, string> = {
  'no-selection': 'Sin selección', 'empty-selection': 'Selección vacía', 'ai-key-invalid': 'IA · clave inválida', 'ai-no-credit': 'IA · sin saldo',
  'ai-offline': 'IA · sin conexión', 'ai-rate-limit': 'IA · demasiadas solicitudes', 'too-large': 'Archivo demasiado grande', unknown: 'Error inesperado',
};

function ComponentsSheet() {
  const [on, setOn] = useState(true);
  const [tab, setTab] = useState('all');
  const [txt, setTxt] = useState('');
  const [n, setN] = useState(12);
  const [seg, setSeg] = useState<'AA' | 'AAA'>('AA');
  const [model, setModel] = useState(MODELS[0]!.value);
  const [checked, setChecked] = useState(true);
  const f: Finding = D.testFileFindings[0]!;
  return (
    <div class="pv-wide">
      <h3>Botones</h3>
      <div class="pv-row">
        <Button variant="primary">Revisar</Button><Button>Secundario</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Borrar clave</Button>
        <Button variant="primary" icon="search">Con ícono</Button><Button variant="primary" loading>Cargando</Button><Button disabled>Deshabilitado</Button>
        <Button size="sm" icon="wand">Corregir</Button><Button size="lg" variant="primary">Grande</Button>
        <IconButton icon="sliders" label="Ajustes" /><IconButton icon="eye-off" label="Ignorar" size="sm" /><IconButton icon="copy" label="Copiar" variant="secondary" />
      </div>
      <h3>Etiqueta de severidad (ícono + palabra, nunca solo color)</h3>
      <div class="pv-row">
        {SEVERITIES.map((s) => <SeverityBadge key={s} severity={s} />)}
        <SeverityBadge severity="low" unverified />
        {SEVERITIES.map((s) => <SeverityBadge key={`c${s}`} severity={s} count={12} />)}
      </div>
      <h3>Interruptor, casilla, segmentado</h3>
      <div class="pv-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: '280px' }}><Switch label="Contraste del texto" description="Accesibilidad · WCAG AA o AAA" checked={on} onChange={setOn} /></div>
        <Checkbox label="Incluir detalles" checked={checked} onChange={setChecked} />
        <Checkbox label="Parcial" checked={false} indeterminate onChange={noop} />
        <div style={{ width: '200px' }}><Segmented label="Nivel de contraste" value={seg} onChange={setSeg} options={[{ value: 'AA', label: 'AA' }, { value: 'AAA', label: 'AAA' }]} /></div>
      </div>
      <h3>Campos</h3>
      <div class="pv-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: '220px' }}><Field label="Clave de Anthropic" value={txt} onInput={setTxt} type="password" reveal mono placeholder="sk-ant-…" hint="Se guarda solo en este equipo." /></div>
        <div style={{ width: '220px' }}><Field label="Con error" value="abc" onInput={noop} error="Las claves empiezan con «sk-ant-»." /></div>
        <div style={{ width: '220px' }}><NumberField label="Tamaño mínimo de texto" value={n} min={8} max={24} unit="px" onChange={setN} /></div>
        <div style={{ width: '280px' }}><Select label="Modelo" value={model} options={MODELS} onChange={setModel} hint="El predeterminado es el más económico." /></div>
      </div>
      <h3>Avisos</h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        <Notice tone="info" title="Información">Texto de apoyo con un enlace o instrucción.</Notice>
        <Notice tone="success">La clave funciona.</Notice>
        <Notice tone="warning" title="Atención" action={<Button size="sm">Acción</Button>}>La IA revisó solo una parte por el tope de costo.</Notice>
        <Notice tone="error" onDismiss={noop}>No se pudo validar la clave.</Notice>
      </div>
      <h3>Pestañas</h3>
      <Tabs ariaLabel="Ejemplo" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'Todas', count: 61 }, { id: 'a', label: 'Accesibilidad', count: 15 }, { id: 'b', label: 'Orden', count: 0 }, { id: 'c', label: 'Estilos', count: 28 }]} />
      <h3>Fila de hallazgo</h3>
      <ul style={{ margin: 0, padding: 0, width: '360px', border: '1px solid var(--rp-border)' }}>
        <FindingRow finding={f} showCategory onSelect={noop} onIgnore={noop} />
        <FindingRow finding={D.testFileFindings.find((x) => x.fix) ?? f} showCategory onSelect={noop} onFix={noop} onIgnore={noop} />
        <FindingRow finding={D.unverifiedFindings.find((x) => x.status === 'unverifiable') ?? f} onSelect={noop} onIgnore={noop} />
      </ul>
      <h3>Progreso, puntaje, plegable, vacío, aviso breve</h3>
      <div class="pv-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: '200px' }}><ProgressBar value={0.42} label="Avance" /><br /><ProgressBar label="Indeterminada" /></div>
        <ScoreRing score={100} /><ScoreRing score={74} /><ScoreRing score={31} />
        <Disclosure summary="¿Por qué este puntaje?" defaultOpen><p style={{ fontSize: '12px', maxWidth: '220px' }}>Contenido plegable.</p></Disclosure>
      </div>
      <div style={{ position: 'relative', height: '220px', margin: '16px 0', border: '1px dashed var(--rp-border-strong)' }}>
        <EmptyState tone="positive" art={<Cuadros variant="mini" size={40} />} title="Estado vacío" actions={<Button>Acción</Button>}>Texto explicativo corto.</EmptyState>
        <Toast message="Copiado" />
      </div>
      <h3>Encabezado</h3>
      <div style={{ width: '360px', border: '1px solid var(--rp-border)' }}>
        <Header brand title="Repaso" actions={<IconButton icon="sliders" label="Ajustes" />} />
        <Header title="Resultados" onBack={noop} />
      </div>
      <h3>Motivo de cuadros</h3>
      <div class="pv-row"><Cuadros variant="mini" size={18} /><Cuadros variant="mini" size={36} /><Cuadros variant="full" size={112} /><Cuadros variant="full" size={200} /></div>
      <h3>Íconos ({ICON_NAMES.length})</h3>
      <div class="pv-icons">{ICON_NAMES.map((name) => <div key={name}><Icon name={name} size={20} />{name}</div>)}</div>
      <h3>Tokens de color (siguen el tema de Figma)</h3>
      <div class="pv-swatches">
        {['--rp-accent', '--rp-bg', '--rp-bg-raised', '--rp-bg-sunken', '--rp-text', '--rp-text-secondary', '--rp-border', '--rp-sev-critical', '--rp-sev-high', '--rp-sev-medium', '--rp-sev-low', '--rp-success', '--rp-danger'].map((v) => (
          <div key={v} class="pv-swatch" style={{ background: `var(${v})`, color: v === '--rp-text' || v === '--rp-accent' || v.includes('sev') || v === '--rp-success' || v === '--rp-danger' ? 'var(--rp-bg)' : 'var(--rp-text)' }}><b>{v}</b></div>
        ))}
      </div>
    </div>
  );
}

export const entries: Entry[] = [
  { id: 'welcome', group: 'welcome', title: 'Bienvenida', render: () => <Welcome onStart={noop} onSettings={noop} onAbout={noop} /> },

  { id: 'home-last', group: 'home', title: 'Con selección y última revisión', render: () => <HomeDemo last={lastSummary} /> },
  { id: 'home-new', group: 'home', title: 'Sin selección, sin revisiones', note: 'Aviso al no haber capas seleccionadas.', render: () => <HomeDemo selectionCount={0} /> },
  { id: 'home-page', group: 'home', title: 'Página actual, IA activada', render: () => <HomeDemo scope="page" ai="on" last={{ ...lastSummary, total: 0, score: 100, critical: 0, high: 0, medium: 0, low: 0 }} /> },
  { id: 'home-nokey', group: 'home', title: 'IA activada sin clave', render: () => <HomeDemo ai="no-key" rulesOn={6} last={lastSummary} /> },

  { id: 'reviewing-start', group: 'reviewing', title: 'Preparando (total desconocido)', render: () => <Reviewing phase="reading" done={0} total={0} cancelling={false} onCancel={noop} /> },
  { id: 'reviewing-checking', group: 'reviewing', title: 'Aplicando reglas', render: () => <Reviewing phase="checking" done={1240} total={3800} cancelling={false} onCancel={noop} /> },
  { id: 'reviewing-ai', group: 'reviewing', title: 'Consultando a la IA', render: () => <Reviewing phase="ai" done={90} total={200} cancelling={false} onCancel={noop} /> },
  { id: 'reviewing-cancelling', group: 'reviewing', title: 'Cancelando', render: () => <Reviewing phase="checking" done={2100} total={3800} cancelling onCancel={noop} /> },

  { id: 'results-testfile', group: 'results', title: 'Archivo de prueba (motor real)', note: 'Hallazgos reales del archivo con errores a propósito.', render: () => <ResultsDemo findings={D.testFileFindings} /> },
  { id: 'results-200', group: 'results', title: '200 hallazgos', note: 'Se muestran de 50 en 50 con «Mostrar más».', render: () => <ResultsDemo findings={D.findings200} scope="page" /> },
  { id: 'results-long', group: 'results', title: 'Nombres de capa muy largos', render: () => <ResultsDemo findings={D.longNameFindings} /> },
  { id: 'results-single', group: 'results', title: 'Una sola categoría con problemas', render: () => <ResultsDemo findings={D.singleCategoryFindings} /> },
  { id: 'results-unverified', group: 'results', title: 'Solo «no verificado» (sobre foto)', render: () => <ResultsDemo findings={D.unverifiedFindings} /> },
  { id: 'results-ai', group: 'results', title: 'Con resumen de IA y aviso de tope', render: () => <ResultsDemo findings={D.testFileFindings} aiSummary={D.aiSummary} aiNotice="La IA revisó 120 de 340 capas porque se alcanzó el tope de 0,25 USD. Suba el tope en Ajustes o revise por partes." /> },
  { id: 'results-ignored', group: 'results', title: 'Con hallazgos ignorados', render: () => <ResultsDemo findings={D.testFileFindings} ignored={D.testFileFindings.slice(0, 3).map((f) => f.id)} /> },
  { id: 'batch-rename', group: 'results', title: 'Lote: renombrar 34 capas', note: 'Antes → después, con casillas.', render: () => <ResultsDemo findings={D.findings200} initialBatch={{ kind: 'rename', preview: D.renamePreview34, applying: false }} /> },
  { id: 'batch-color', group: 'results', title: 'Lote: estilo de color', render: () => <ResultsDemo findings={D.testFileFindings} initialBatch={{ kind: 'apply-color', preview: D.colorPreview, applying: false }} /> },
  { id: 'batch-spacing', group: 'results', title: 'Lote: espaciado', render: () => <ResultsDemo findings={D.testFileFindings} initialBatch={{ kind: 'snap-spacing', preview: D.spacingPreview, applying: false }} /> },
  { id: 'batch-loading', group: 'results', title: 'Lote: preparando vista previa', render: () => <ResultsDemo findings={D.testFileFindings} initialBatch={{ kind: 'rename', preview: null, applying: false }} /> },
  { id: 'batch-applying', group: 'results', title: 'Lote: aplicando', render: () => <ResultsDemo findings={D.testFileFindings} initialBatch={{ kind: 'apply-text-style', preview: D.textPreview, applying: true }} /> },
  { id: 'batch-applied', group: 'results', title: 'Después de aplicar', render: () => <ResultsDemo findings={D.testFileFindings.slice(4)} applied="Se aplicaron 34 cambios. Ctrl+Z los deshace." /> },

  { id: 'clean', group: 'clean', title: 'Sin problemas', render: () => <ResultsDemo findings={[]} /> },
  { id: 'clean-ignored', group: 'clean', title: 'Sin problemas (con ignorados)', render: () => <ResultsDemo findings={D.testFileFindings} ignored={D.testFileFindings.map((f) => f.id)} /> },

  ...ERROR_KINDS.map((k): Entry => ({
    id: `error-${k}`, group: 'errors', title: ERROR_TITLES[k],
    render: () => <ErrorScreen kind={k} detail={k === 'unknown' ? 'TypeError: Cannot read properties of undefined (reading "children")' : k === 'ai-key-invalid' ? 'HTTP 401 · authentication_error' : undefined} onAction={noop} />,
  })),

  { id: 'settings', group: 'settings', title: 'Ajustes', note: 'Desplácese: reglas, umbrales, trato, IA y privacidad.', render: () => <SettingsDemo /> },
  { id: 'settings-ai', group: 'settings', title: 'Ajustes · IA con clave guardada', render: () => <SettingsDemo hasKey aiEnabled keyCheck={{ status: 'ok' }} /> },
  { id: 'settings-key-error', group: 'settings', title: 'Ajustes · clave rechazada', render: () => <SettingsDemo hasKey aiEnabled keyCheck={{ status: 'error', message: 'Anthropic rechazó la clave (401). Revise que la copió completa.' }} /> },
  { id: 'settings-checking', group: 'settings', title: 'Ajustes · probando clave', render: () => <SettingsDemo hasKey aiEnabled keyCheck={{ status: 'checking' }} /> },

  { id: 'export', group: 'export', title: 'Exportar', render: () => <Export review={D.reviewPayload(D.testFileFindings, { aiSummary: D.aiSummary })} fileName="Sistema de diseño · v2" onBack={noop} /> },
  { id: 'export-empty', group: 'export', title: 'Exportar sin revisión', render: () => <Export review={null} onBack={noop} /> },

  { id: 'about', group: 'about', title: 'Acerca de', render: () => <About version="0.1.0" onBack={noop} /> },

  { id: 'components', group: 'components', title: 'Todos los componentes', wide: true, render: () => <ComponentsSheet /> },
];



