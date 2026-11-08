const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/extra\s*-?light|ultra\s*-?light/i, 200],
  [/light/i, 300],
  [/semi\s*-?bold|demi\s*-?bold/i, 600],
  [/extra\s*-?bold|ultra\s*-?bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

/** Peso numérico (100–900) a partir del nombre de estilo de Figma («Semi Bold» → 600). */
export function weightFromStyle(style: string): number {
  for (const [re, w] of WEIGHTS) if (re.test(style)) return w;
  return 400;
}
