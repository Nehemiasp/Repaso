import type { JSX } from 'preact';

const S = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
const dot = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="0.6" fill="currentColor" stroke="currentColor" stroke-width="1.2" />;

const ICONS = {
  check: () => <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'check-circle': () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  x: () => <path d="M6 6l12 12M18 6L6 18" />,
  plus: () => <path d="M12 5v14M5 12h14" />,
  minus: () => <path d="M5 12h14" />,
  'chevron-right': () => <path d="M9 6l6 6-6 6" />,
  'chevron-left': () => <path d="M15 6l-6 6 6 6" />,
  'chevron-down': () => <path d="M6 9l6 6 6-6" />,
  'chevron-up': () => <path d="M6 15l6-6 6 6" />,
  'arrow-left': () => <path d="M19 12H5M11 6l-6 6 6 6" />,
  external: () => <path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />,
  sliders: () => (
    <>
      <path d="M4 7h8M18 7h2M4 17h2M12 17h8" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  info: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      {dot(12, 8)}
    </>
  ),
  // Severidad: cuatro siluetas distintas (octágono, triángulo, rombo, círculo).
  'sev-critical': () => (
    <>
      <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3z" />
      <path d="M12 8v5" />
      {dot(12, 16.2)}
    </>
  ),
  'sev-high': () => (
    <>
      <path d="M12 4l9.5 16.5h-19L12 4z" />
      <path d="M12 10v4.5" />
      {dot(12, 17.4)}
    </>
  ),
  'sev-medium': () => (
    <>
      <path d="M12 3l9 9-9 9-9-9 9-9z" />
      <path d="M12 8v5" />
      {dot(12, 16)}
    </>
  ),
  'sev-low': () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      {dot(12, 8)}
    </>
  ),
  help: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8" />
      {dot(12, 17)}
    </>
  ),
  'eye-off': () => (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.5.9-1.4 2.100-2.600 3.200M6.600 7.700C4.500 9.100 3.100 11 2.500 12c1 1.800 4.500 6 9.500 6 1.500 0 2.800-.3 4-.9" />
      <path d="M9.900 10a3 3 0 0 0 4.100 4.100" />
    </>
  ),
  eye: () => (
    <>
      <path d="M2.500 12C3.500 10.200 7 6 12 6s8.500 4.200 9.500 6c-1 1.800-4.500 6-9.500 6s-8.500-4.200-9.500-6z" />
      <circle cx="12" cy="12" r="2.800" />
    </>
  ),
  wand: () => (
    <>
      <path d="M4 20L14 10" />
      <path d="M13 5l1.200 2.800L17 9l-2.800 1.200L13 13l-1.200-2.800L9 9l2.800-1.200L13 5z" />
      <path d="M19 14v4M17 16h4" />
    </>
  ),
  search: () => (
    <>
      <circle cx="11" cy="11" r="6.500" />
      <path d="M20 20l-4.300-4.300" />
    </>
  ),
  shield: () => (
    <>
      <path d="M12 3l8 3v6c0 4.500-3.300 7.800-8 9-4.700-1.200-8-4.500-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  copy: () => (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  refresh: () => <path d="M20 11a8 8 0 0 0-14.500-4M4 5v4h4M4 13a8 8 0 0 0 14.500 4M20 19v-4h-4" />,
  sparkle: () => <path d="M11 3l1.900 5.100L18 10l-5.100 1.900L11 17l-1.900-5.100L4 10l5.100-1.900L11 3zM18.500 15l.8 2.200 2.200.8-2.200.8-.8 2.200-.8-2.200-2.200-.8 2.200-.8.8-2.200z" />,
  type: () => <path d="M5 7V5h14v2M12 5v14M9 19h6" />,
  layers: () => <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
  palette: () => (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.100 0 1.600-.8 1.300-1.600-.4-1 .2-2.400 1.500-2.400H17a4 4 0 0 0 4-4c0-5-4-10-9-10z" />
      {dot(7.500, 11)}
      {dot(10, 7.500)}
      {dot(15, 7.500)}
    </>
  ),
  ruler: () => <path d="M3 9h18v6H3zM7 9v3M11 9v2M15 9v3M19 9v2" />,
  component: () => <path d="M12 3l3 3-3 3-3-3 3-3zM6 9l3 3-3 3-3-3 3-3zM18 9l3 3-3 3-3-3 3-3zM12 15l3 3-3 3-3-3 3-3z" />,
  contrast: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  touch: () => (
    <>
      <path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="2.500" />
    </>
  ),
  key: () => (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 7l3 3M14 9l2 2" />
    </>
  ),
  'wifi-off': () => (
    <>
      <path d="M3 3l18 18" />
      <path d="M5 11.500a10 10 0 0 1 3.500-2.100M10 6.200A14 14 0 0 1 12 6c3.300 0 6.200 1.300 8.500 3.500M8.500 15a5 5 0 0 1 4.500-1.400M12 18.500h.01" />
    </>
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.500 2.500 3.500 5.500 3.500 9s-1 6.500-3.500 9c-2.500-2.500-3.500-5.500-3.500-9s1-6.500 3.500-9z" />
    </>
  ),
  lock: () => (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  'file-large': () => (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  frame: () => <path d="M7 3v18M17 3v18M3 7h18M3 17h18" />,
  rect: () => <rect x="4" y="6" width="16" height="12" rx="1.500" />,
  ellipse: () => <circle cx="12" cy="12" r="8" />,
  vector: () => (
    <>
      <path d="M5 19L19 5" />
      <rect x="3" y="17" width="4" height="4" rx=".6" />
      <rect x="17" y="3" width="4" height="4" rx=".6" />
    </>
  ),
  line: () => <path d="M5 19L19 5" />,
  group: () => <path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M9 9h6v6H9z" />,
  instance: () => <path d="M12 3l9 9-9 9-9-9 9-9z" />,
  'component-set': () => <path d="M9 3l3 3-3 3-3-3 3-3zM15 9l3 3-3 3-3-3 3-3zM9 15l3 3-3 3-3-3 3-3z" />,
  section: () => <path d="M4 5h16v14H4zM4 9h16" />,
  'text-node': () => <path d="M6 6h12M12 6v12" />,
  undo: () => <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  trash: () => <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />,
  hourglass: () => <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
  list: () => <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  download: () => <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
} satisfies Record<string, () => JSX.Element>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  /** Si se omite, el ícono es decorativo (aria-hidden). */
  label?: string;
}

export function Icon({ name, size = 16, class: cls, label }: IconProps) {
  const Draw = ICONS[name];
  return (
    <svg
      class={`rp-icon ${cls ?? ''}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...S}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' })}
    >
      <Draw />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
