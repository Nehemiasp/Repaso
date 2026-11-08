// Cliente mínimo de la API de Mensajes de Anthropic con `fetch`.
//
// Por qué no el SDK oficial: este código corre en el hilo principal de un plugin de Figma, un
// entorno de JavaScript restringido donde no puedo comprobar el SDK desde aquí, y el manifiesto
// solo permite un dominio. Es una sola llamada POST /v1/messages, así que se hace a mano.
//
// Reglas de la API para los modelos del menú de Ajustes: sin `temperature`, sin `tool_choice`
// forzado y sin prefill. Se omite `thinking` (adaptativo) y se baja el esfuerzo a `low`.
import type { ErrorKind } from '../shared/messages';

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODELS_URL = 'https://api.anthropic.com/v1/models?limit=1';
export const API_VERSION = '2026-10-21';

export class AiError extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly detail: string,
    /** Reintentar tiene sentido (red, 5xx). */
    readonly transient = false,
  ) {
    super(detail);
    this.name = 'AiError';
  }
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface CompleteRequest {
  system: string;
  user: string;
  /** JSON Schema de la respuesta (salida estructurada). */
  schema: Record<string, unknown>;
  maxTokens: number;
}

export interface CompleteResult {
  text: string;
  usage: Usage;
  stopReason: string | null;
}

export interface AiClient {
  complete(req: CompleteRequest): Promise<CompleteResult>;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

const headers = (apiKey: string) => ({
  'content-type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': API_VERSION,
  // Obligatorio para llamar a la API desde un navegador o iframe (CORS). La clave es del propio usuario.
  'anthropic-dangerous-direct-browser-access': 'true',
});

/** Traduce una respuesta de error de la API al error que la interfaz sabe explicar. */
export function toAiError(status: number, body: string): AiError {
  let type = '';
  let message = '';
  try {
    const j = JSON.parse(body) as { error?: { type?: string; message?: string } };
    type = j.error?.type ?? '';
    message = j.error?.message ?? '';
  } catch {
    message = body.slice(0, 200);
  }
  const detail = `HTTP ${status}${type ? ` · ${type}` : ''}${message ? ` · ${message}` : ''}`;
  if (/CORS requests are not allowed/i.test(message)) {
    return new AiError('unknown', `${detail}. Su organización de Anthropic no permite llamadas desde el navegador (por ejemplo, retención de datos cero).`);
  }
  if (status === 402 || type === 'billing_error' || /credit balance|billing|spend limit/i.test(message)) return new AiError('ai-no-credit', detail);
  if (status === 401 || status === 403 || type === 'authentication_error' || type === 'permission_error') return new AiError('ai-key-invalid', detail);
  if (status === 429 || type === 'rate_limit_error') return new AiError('ai-rate-limit', detail);
  if (status >= 500 || status === 529) return new AiError('unknown', detail, true);
  return new AiError('unknown', detail);
}

const offline = (e: unknown) => new AiError('ai-offline', e instanceof Error ? e.message : String(e), true);

export function createClient(opts: { apiKey: string; model: string; fetchFn: FetchLike }): AiClient {
  const { apiKey, model, fetchFn } = opts;
  return {
    async complete(req) {
      const body = {
        model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: req.schema } },
      };
      let res;
      try {
        res = await fetchFn(API_URL, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) });
      } catch (e) {
        throw offline(e);
      }
      const raw = await res.text();
      if (!res.ok) throw toAiError(res.status, raw);
      let json: { content?: { type: string; text?: string }[]; usage?: Partial<Usage>; stop_reason?: string | null };
      try {
        json = JSON.parse(raw);
      } catch {
        throw new AiError('unknown', 'La respuesta de la API no es JSON.', true);
      }
      // Los bloques de «thinking» se ignoran: solo importa el texto con el JSON.
      const text = (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
      return {
        text,
        stopReason: json.stop_reason ?? null,
        usage: { input_tokens: json.usage?.input_tokens ?? 0, output_tokens: json.usage?.output_tokens ?? 0 },
      };
    },
  };
}

/** Comprueba la clave sin gastar tokens: lista un modelo. También prueba que CORS funcione. */
export async function checkKey(apiKey: string, fetchFn: FetchLike): Promise<void> {
  let res;
  try {
    res = await fetchFn(MODELS_URL, { method: 'GET', headers: headers(apiKey) });
  } catch (e) {
    throw offline(e);
  }
  if (!res.ok) throw toAiError(res.status, await res.text());
}
