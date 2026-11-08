import { AiError, type AiClient, type CompleteRequest } from './client';
import type { Budget } from './budget';
import { estimateTokens } from './pricing';
import { parseJson, ValidationError } from './validate';

export class BudgetExceeded extends Error {
  constructor() {
    super('Se alcanzó el tope de gasto de la revisión.');
    this.name = 'BudgetExceeded';
  }
}

export interface StructuredOptions<T> {
  client: AiClient;
  budget: Budget;
  request: CompleteRequest;
  validate: (raw: unknown) => T;
}

/**
 * Una llamada con salida estructurada: valida, reintenta UNA vez si la respuesta no sirve
 * (o si el servidor falló de forma pasajera) y, si vuelve a fallar, devuelve null:
 * ese lote se descarta sin romper nada. Los errores de clave, saldo, límite o conexión sí se propagan.
 */
export async function structuredCall<T>(o: StructuredOptions<T>): Promise<T | null> {
  const inputTokens = estimateTokens(o.request.system + o.request.user + JSON.stringify(o.request.schema));
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!o.budget.canAfford(inputTokens, o.request.maxTokens)) throw new BudgetExceeded();
    try {
      const res = await o.client.complete(o.request);
      o.budget.add(res.usage);
      // Un refusal o un corte por tokens no se puede validar: cuenta como fallo y se reintenta.
      if (res.stopReason === 'refusal' || res.stopReason === 'max_tokens') throw new ValidationError(`La respuesta terminó con «${res.stopReason}».`);
      return o.validate(parseJson(res.text));
    } catch (e) {
      if (e instanceof ValidationError) continue;
      if (e instanceof AiError && e.transient && e.kind === 'unknown') continue;
      throw e;
    }
  }
  return null;
}
