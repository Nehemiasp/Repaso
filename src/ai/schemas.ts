// JSON Schemas de las respuestas (salida estructurada). Las restricciones de largo van en validate.ts:
// la API no admite minLength/maxLength/maxItems en el esquema.
const str = { type: 'string' } as const;
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

export const NAMES_SCHEMA = obj({ names: { type: 'array', items: obj({ id: str, name: str }) } });

export const STATES_SCHEMA = obj({
  sets: { type: 'array', items: obj({ id: str, missing: { type: 'array', items: obj({ state: str, description: str }) } }) },
});

export const COPY_SCHEMA = obj({
  issues: {
    type: 'array',
    items: obj({ id: str, kind: { type: 'string', enum: ['spelling', 'case', 'tone'] }, suggested: str, reason: str }),
  },
});

export const SUMMARY_SCHEMA = obj({ summary: str });
