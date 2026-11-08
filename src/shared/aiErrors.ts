import type { ErrorKind } from './messages';

/** Mensaje claro, en español, para mostrar junto a «Probar clave». */
export const KEY_CHECK_MESSAGE: Partial<Record<ErrorKind, string>> = {
  'ai-key-invalid': 'Anthropic rechazó la clave. Revise que la copió completa y que sigue activa.',
  'ai-no-credit': 'La clave es válida, pero la cuenta no tiene saldo disponible.',
  'ai-offline': 'No hay conexión con api.anthropic.com. Revise su internet o su VPN.',
  'ai-rate-limit': 'Anthropic pidió esperar un momento. Pruebe de nuevo en un minuto.',
};
