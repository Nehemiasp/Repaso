// Tres archivos de prueba para evaluar los nombres de capa. Todo está nombrado «por defecto», como llega de un archivo real.
// Material inventado: no hay clientes ni NIU.
import { box, frame, image, node, rect, scene, solid, text, type Spec } from '../tests/builders';
import type { Scene } from '../src/shared/types';

function names() {
  let n = 100;
  const next = (kind: string) => `${kind} ${++n}`;
  const F = (id: string, props: Parameters<typeof frame>[1] = {}, kids: Spec[] = []) => frame(id, { name: next('Frame'), ...props }, kids);
  const R = (id: string, props: Parameters<typeof rect>[1] = {}) => rect(id, { name: next('Rectangle'), ...props });
  const V = (id: string, w = 16) => node(id, 'VECTOR', { name: next('Vector'), box: box(w, w) });
  const E = (id: string, props: Parameters<typeof node>[2] = {}) => node(id, 'ELLIPSE', { name: next('Ellipse'), ...props });
  const G = (id: string, kids: Spec[] = []) => node(id, 'GROUP', { name: next('Group') }, kids);
  const L = (id: string) => node(id, 'LINE', { name: next('Line'), box: box(300, 1) });
  return { F, R, V, E, G, L };
}

const H = { mode: 'HORIZONTAL' as const, gap: 8, padL: 16, padR: 16, padT: 12, padB: 12 };
const Vv = { mode: 'VERTICAL' as const, gap: 8, padL: 16, padR: 16, padT: 16, padB: 16 };
const ink = [solid('#111111')];
const white = [solid('#FFFFFF')];
const blue = [solid('#043565')];

export function tienda(): Scene {
  const { F, R, V, E, G, L } = names();
  return scene(
    F('pantalla', { box: box(390, 900), fills: white, layout: Vv }, [
      F('nav', { box: box(390, 56), layout: H, fills: white }, [V('nav-menu', 24), text('nav-titulo', 'Tienda Aurora', { fontSize: 18, fontWeight: 700 }), V('nav-carrito', 24)]),
      F('busqueda', { box: box(358, 44), layout: H, fills: [solid('#F2F4F7')], radius: 8 }, [V('busq-lupa'), text('busq-texto', 'Buscar productos')]),
      F('tarjeta1', { box: box(358, 320), layout: Vv, fills: white, radius: 12 }, [
        R('t1-foto', { fills: [image()], box: box(326, 180) }),
        F('t1-info', { box: box(326, 60), layout: Vv }, [text('t1-nombre', 'Cafetera de émbolo 600 ml', { fontSize: 16, fontWeight: 600 }), text('t1-desc', 'Vidrio borosilicato y acero', { fontSize: 13 })]),
        F('t1-pie', { box: box(326, 44), layout: H }, [text('t1-precio', '$ 24,90', { fontSize: 18, fontWeight: 700 }), F('t1-btn', { box: box(120, 40), fills: blue, radius: 8, layout: H }, [text('t1-btn-t', 'Agregar', { fills: white })])]),
      ]),
      F('tarjeta2', { box: box(358, 320), layout: Vv, fills: white, radius: 12 }, [
        R('t2-foto', { fills: [image()], box: box(326, 180) }),
        F('t2-etiqueta', { box: box(64, 24), fills: [solid('#E6F5EC')], radius: 12, layout: H }, [text('t2-et-t', 'Nuevo', { fontSize: 12 })]),
        F('t2-info', { box: box(326, 60), layout: Vv }, [text('t2-nombre', 'Molinillo manual de cerámica', { fontSize: 16, fontWeight: 600 }), text('t2-desc', 'Muelas ajustables', { fontSize: 13 })]),
        F('t2-pie', { box: box(326, 44), layout: H }, [text('t2-precio', '$ 31,00', { fontSize: 18, fontWeight: 700 }), F('t2-btn', { box: box(120, 40), fills: blue, radius: 8, layout: H }, [text('t2-btn-t', 'Agregar', { fills: white })])]),
      ]),
      L('divisor'),
      F('categorias', { box: box(358, 80), layout: H }, [
        G('cat1', [E('cat1-circulo', { box: box(48, 48), fills: [solid('#F2F4F7')] }), V('cat1-icono', 24)]),
        G('cat2', [E('cat2-circulo', { box: box(48, 48), fills: [solid('#F2F4F7')] }), V('cat2-icono', 24)]),
        G('cat3', [E('cat3-circulo', { box: box(48, 48), fills: [solid('#F2F4F7')] }), V('cat3-icono', 24)]),
      ]),
      F('pie', { box: box(390, 64), layout: H, fills: [solid('#F2F4F7')] }, [text('pie-1', 'Envíos', { fontSize: 13 }), text('pie-2', 'Devoluciones', { fontSize: 13 }), text('pie-3', 'Ayuda', { fontSize: 13 })]),
    ]),
  );
}

export function formulario(): Scene {
  const { F, R, V, E, L } = names();
  const campo = (id: string, etiqueta: string, valor: string) =>
    F(id, { box: box(326, 72), layout: Vv }, [text(`${id}-et`, etiqueta, { fontSize: 13, fontWeight: 500 }), F(`${id}-caja`, { box: box(326, 44), layout: H, fills: white, hasStroke: true, radius: 8 }, [text(`${id}-valor`, valor, { fontSize: 15 })])]);
  return scene(
    F('pantalla', { box: box(390, 900), fills: white, layout: Vv }, [
      F('cab', { box: box(358, 48), layout: H }, [V('cab-atras', 24), text('cab-titulo', 'Crear cuenta', { fontSize: 20, fontWeight: 700 })]),
      text('intro', 'Complete sus datos para empezar.', { fontSize: 14 }),
      campo('c-nombre', 'Nombre completo', 'María Fernández'),
      campo('c-correo', 'Correo electrónico', 'maria@ejemplo.com'),
      F('c-clave', { box: box(326, 72), layout: Vv }, [text('c-clave-et', 'Contraseña', { fontSize: 13, fontWeight: 500 }), F('c-clave-caja', { box: box(326, 44), layout: H, hasStroke: true, radius: 8 }, [text('c-clave-v', '••••••••'), V('c-clave-ojo', 20)])]),
      F('terminos', { box: box(326, 28), layout: H }, [R('term-casilla', { box: box(18, 18), hasStroke: true, radius: 4 }), text('term-texto', 'Acepto los términos y la política de privacidad', { fontSize: 13 })]),
      F('acciones', { box: box(326, 96), layout: Vv }, [
        F('btn-principal', { box: box(326, 48), fills: blue, radius: 8, layout: H }, [text('btn-p-t', 'Crear cuenta', { fills: white, fontWeight: 600 })]),
        F('btn-secundario', { box: box(326, 40), hasStroke: true, radius: 8, layout: H }, [text('btn-s-t', 'Ya tengo cuenta', { fontWeight: 600 })]),
      ]),
      L('separador'),
      F('social', { box: box(326, 48), layout: H }, [E('soc-1', { box: box(40, 40), hasStroke: true }), E('soc-2', { box: box(40, 40), hasStroke: true }), E('soc-3', { box: box(40, 40), hasStroke: true })]),
    ]),
  );
}

export function panel(): Scene {
  const { F, R, V, E, G, L } = names();
  const item = (id: string, label: string) => F(id, { box: box(220, 40), layout: H }, [V(`${id}-i`, 20), text(`${id}-t`, label, { fontSize: 14 })]);
  const stat = (id: string, titulo: string, valor: string) => F(id, { box: box(220, 96), fills: white, radius: 12, layout: Vv }, [text(`${id}-t`, titulo, { fontSize: 13 }), text(`${id}-v`, valor, { fontSize: 28, fontWeight: 700 }), R(`${id}-barra`, { box: box(188, 6), fills: [solid('#E6F5EC')], radius: 3 })]);
  const fila = (id: string, a: string, b: string, c: string) => F(id, { box: box(700, 44), layout: H }, [E(`${id}-av`, { box: box(28, 28), fills: [image()] }), text(`${id}-a`, a), text(`${id}-b`, b), F(`${id}-estado`, { box: box(72, 24), fills: [solid('#E6F5EC')], radius: 12, layout: H }, [text(`${id}-c`, c, { fontSize: 12 })])]);
  return scene(
    F('app', { box: box(1200, 800), fills: [solid('#F2F4F7')], layout: H }, [
      F('lateral', { box: box(260, 800), fills: white, layout: Vv }, [text('logo', 'Métrica', { fontSize: 20, fontWeight: 700 }), item('n1', 'Resumen'), item('n2', 'Ventas'), item('n3', 'Clientes'), item('n4', 'Ajustes')]),
      F('contenido', { box: box(940, 800), layout: Vv }, [
        F('encabezado', { box: box(940, 56), layout: H }, [text('titulo', 'Resumen del mes', { fontSize: 22, fontWeight: 700 }), G('perfil', [E('perfil-av', { box: box(32, 32), fills: [image()] }), V('perfil-flecha', 12)])]),
        F('estadisticas', { box: box(940, 112), layout: H }, [stat('s1', 'Ingresos', '$ 48.200'), stat('s2', 'Pedidos', '1.284'), stat('s3', 'Conversión', '3,2 %')]),
        F('tabla', { box: box(900, 260), fills: white, radius: 12, layout: Vv }, [fila('r1', 'Lucía Pérez', 'Pedido 2041', 'Pagado'), fila('r2', 'Tomás Rivas', 'Pedido 2040', 'Pagado'), fila('r3', 'Ana Soto', 'Pedido 2039', 'Pagado')]),
      ]),
    ]),
  );
}

export const EVAL_FILES: { id: string; titulo: string; scene: () => Scene }[] = [
  { id: 'tienda', titulo: 'Tienda · pantalla de productos', scene: tienda },
  { id: 'formulario', titulo: 'Formulario de registro', scene: formulario },
  { id: 'panel', titulo: 'Panel de métricas', scene: panel },
];
