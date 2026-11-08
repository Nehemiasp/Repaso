import type { ComponentChildren } from 'preact';
import './Screen.css';

export interface ScreenProps {
  header: ComponentChildren;
  children: ComponentChildren;
  footer?: ComponentChildren;
  /** Contenido que no debe hacer scroll junto con el cuerpo (p. ej. pestañas). */
  sub?: ComponentChildren;
  /** Superposiciones (hoja de lote, avisos) dentro del marco de la pantalla. */
  overlay?: ComponentChildren;
}

/** Esqueleto de toda pantalla: encabezado fijo, cuerpo con scroll y pie opcional. */
export function Screen({ header, sub, children, footer, overlay }: ScreenProps) {
  return (
    <div class="rp-screen">
      {header}
      {sub}
      <main class="rp-screen__body rp-scroll">{children}</main>
      {footer && <footer class="rp-screen__foot">{footer}</footer>}
      {overlay}
    </div>
  );
}
