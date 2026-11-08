import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { entries, GROUPS, type Entry } from './entries';

type Theme = 'light' | 'dark' | 'both';
type Size = '360x560' | '320x440' | '480x700';

const params = new URLSearchParams(location.search);

function Frame({ entry, theme, size }: { entry: Entry; theme: 'light' | 'dark'; size: Size }) {
  const [w, h] = size.split('x').map(Number) as [number, number];
  return (
    <div class={`pv-frame figma-${theme}`} style={entry.wide ? undefined : { width: `${w}px`, height: `${h}px` }} data-screen={entry.id} data-theme={theme}>
      {entry.render()}
    </div>
  );
}

export function Gallery() {
  const [theme, setTheme] = useState<Theme>((params.get('theme') as Theme) ?? 'both');
  const [size, setSize] = useState<Size>((params.get('size') as Size) ?? '360x560');
  const only = params.get('only');
  const list = useMemo(() => (only ? entries.filter((e) => e.id === only) : entries), [only]);
  useEffect(() => {
    document.body.classList.toggle('pv-dark-page', theme === 'dark');
  }, [theme]);

  // Modo captura: ?only=<id>&theme=dark muestra solo ese marco, sin menú.
  if (only) {
    const e = list[0];
    return e ? (
      <div style={{ padding: '16px', display: 'inline-block' }}>
        <Frame entry={e} theme={theme === 'dark' ? 'dark' : 'light'} size={size} />
      </div>
    ) : (
      <p>No existe «{only}».</p>
    );
  }

  const themes: ('light' | 'dark')[] = theme === 'both' ? ['light', 'dark'] : [theme];
  return (
    <div class="pv">
      <nav class="pv-nav" aria-label="Pantallas">
        <h1>Repaso · Galería</h1>
        <p>Todas las pantallas y estados, con datos de ejemplo. No necesita Figma.</p>
        <div class="pv-controls">
          <label>
            Tema
            <select value={theme} onChange={(e) => setTheme((e.currentTarget as HTMLSelectElement).value as Theme)}>
              <option value="both">Claro y oscuro</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
          <label>
            Tamaño de ventana
            <select value={size} onChange={(e) => setSize((e.currentTarget as HTMLSelectElement).value as Size)}>
              <option value="360x560">360 × 560 (predeterminado)</option>
              <option value="320x440">320 × 440 (mínimo)</option>
              <option value="480x700">480 × 700 (amplio)</option>
            </select>
          </label>
        </div>
        {GROUPS.map((g) => (
          <div key={g.id}>
            <h2>{g.title}</h2>
            <ul>
              {entries.filter((e) => e.group === g.id).map((e) => (
                <li key={e.id}><a href={`#${e.id}`}>{e.title}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <main class="pv-main">
        {GROUPS.map((g) => (
          <section class="pv-group" key={g.id} id={`g-${g.id}`}>
            <h2>{g.title}</h2>
            <p>{g.note}</p>
            <div class="pv-frames">
              {entries.filter((e) => e.group === g.id).flatMap((e) =>
                themes.map((th) => (
                  <Item key={`${e.id}-${th}`} entry={e} theme={th} size={size}>
                    <Frame entry={e} theme={th} size={size} />
                  </Item>
                )),
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function Item({ entry, theme, children }: { entry: Entry; theme: string; size: Size; children: ComponentChildren }) {
  return (
    <div class="pv-item" id={theme === 'light' ? entry.id : undefined}>
      <h3>
        {entry.title} · {theme === 'light' ? 'claro' : 'oscuro'}
        {entry.note && <small>{entry.note}</small>}
      </h3>
      {children}
    </div>
  );
}
