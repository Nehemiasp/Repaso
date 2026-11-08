import { MAX_NODES } from '../shared/constants';
import type { DocNode, Scene } from '../shared/types';
import { serializeNode, type ReadEnv } from './serialize';

export class TooLargeError extends Error {
  constructor(public readonly count: number) {
    super(`El alcance supera ${MAX_NODES} capas (${count}).`);
    this.name = 'TooLargeError';
  }
}

export interface ReadOptions {
  env: ReadEnv;
  /** Nodos de partida: la selección o los hijos de la página. */
  roots: readonly SceneNode[];
  /** No leer lo que hay dentro de capas ocultas. */
  skipHidden: boolean;
  maxNodes?: number;
  budgetMs?: number;
  now?: () => number;
  yieldFn?: () => Promise<void>;
  onProgress?: (count: number) => void;
  signal?: { cancelled: boolean };
}

/** Cuántas capas «de abajo» del mismo nivel se leen como contexto para el fondo. */
const MAX_CONTEXT_SIBLINGS = 200;

type Loose = { id: string; parent: Loose | null; type: string; children?: Loose[] };

const isScene = (n: Loose | null): n is Loose => !!n && n.type !== 'PAGE' && n.type !== 'DOCUMENT';

/** Quita raíces que ya están dentro de otra raíz seleccionada (evita revisar dos veces). */
function dedupeRoots(roots: readonly SceneNode[]): SceneNode[] {
  const ids = new Set(roots.map((r) => r.id));
  return roots.filter((r) => {
    let p = (r as unknown as Loose).parent;
    while (p) {
      if (ids.has(p.id)) return false;
      p = p.parent;
    }
    return true;
  });
}

/**
 * Lee el alcance en trozos: recorre con una pila, y cada `budgetMs` cede el hilo
 * para que Figma siga respondiendo. Devuelve null si se cancela.
 * También lee los padres de las raíces (y los hermanos de abajo) como contexto
 * para calcular el fondo real de los textos; no se auditan.
 */
export async function readScope(opts: ReadOptions): Promise<Scene | null> {
  const {
    env,
    skipHidden,
    maxNodes = MAX_NODES,
    budgetMs = 8,
    now = () => Date.now(),
    yieldFn = () => new Promise<void>((r) => setTimeout(r, 0)),
  } = opts;
  const roots = dedupeRoots(opts.roots);
  const nodes: Record<string, DocNode> = {};
  let count = 0;
  let sliceStart = now();

  const tick = async (): Promise<boolean> => {
    if (now() - sliceStart < budgetMs) return false;
    opts.onProgress?.(count);
    await yieldFn();
    sliceStart = now();
    return !!opts.signal?.cancelled;
  };

  // Contexto: padres de cada raíz y los hermanos que quedan debajo de la cadena.
  for (const root of roots) {
    let child = root as unknown as Loose;
    let parent = child.parent;
    let inInstance = false;
    const chain: Loose[] = [];
    while (isScene(parent)) {
      chain.push(parent);
      parent = parent.parent;
    }
    inInstance = chain.some((p) => p.type === 'INSTANCE');
    for (let i = 0; i < chain.length; i++) {
      const p = chain[i]!;
      if (!nodes[p.id]) {
        nodes[p.id] = await serializeNode(p as unknown as SceneNode, chain[i + 1]?.id ?? null, inInstance, env);
      }
      const kids = p.children ?? [];
      const below = kids.slice(0, kids.findIndex((k) => k.id === child.id)).slice(-MAX_CONTEXT_SIBLINGS);
      for (const sib of below) {
        if (!nodes[sib.id]) nodes[sib.id] = await serializeNode(sib as unknown as SceneNode, p.id, inInstance, env);
      }
      child = p;
    }
  }

  const stack: { node: SceneNode; parentId: string | null; inInstance: boolean }[] = [];
  for (let i = roots.length - 1; i >= 0; i--) {
    const r = roots[i]!;
    const p = (r as unknown as Loose).parent;
    stack.push({ node: r, parentId: isScene(p) ? p.id : null, inInstance: false });
  }
  const parentOf = (r: SceneNode) => {
    const p = (r as unknown as Loose).parent;
    return isScene(p) ? p : null;
  };
  // Si la raíz está dentro de una instancia, también hereda inInstance.
  for (const s of stack) {
    let p = parentOf(s.node) as Loose | null;
    while (p) {
      if (p.type === 'INSTANCE') s.inInstance = true;
      p = isScene(p.parent) ? p.parent : null;
    }
  }

  while (stack.length) {
    const { node, parentId, inInstance } = stack.pop()!;
    const doc = await serializeNode(node, parentId, inInstance, env);
    nodes[doc.id] = doc;
    count += 1;
    if (count > maxNodes) throw new TooLargeError(count);
    const children = (node as unknown as Loose).children;
    if (children && !(skipHidden && !doc.visible)) {
      const nested = inInstance || doc.type === 'INSTANCE';
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i] as unknown as SceneNode, parentId: doc.id, inInstance: nested });
      }
    }
    if (await tick()) return null;
  }
  opts.onProgress?.(count);
  if (opts.signal?.cancelled) return null;
  return { rootIds: roots.map((r) => r.id), nodes };
}
