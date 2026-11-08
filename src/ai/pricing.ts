// Precios por millón de tokens (USD) de los modelos que ofrece Ajustes. Fuente: documentación de Anthropic.
export interface Price {
  input: number;
  output: number;
}

export const PRICES: Record<string, Price> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
};

/** Un modelo desconocido se estima con el precio más alto: mejor pasarse que quedarse corto. */
export const priceOf = (model: string): Price => PRICES[model] ?? PRICES['claude-opus-5-5']!;

/** ~3,5 caracteres por token en español, con 20 % de margen. Es un estimado, no una medición. */
export const estimateTokens = (text: string): number => Math.ceil((text.length / 3.5) * 1.2);

export const costOf = (model: string, inputTokens: number, outputTokens: number): number => {
  const p = priceOf(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
};

export const formatUsd = (n: number): string => (n < 0.01 ? '< 0,01 USD' : `${n.toFixed(2).replace('.', ',')} USD`);
