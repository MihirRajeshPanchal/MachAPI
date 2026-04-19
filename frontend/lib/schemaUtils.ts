// ── Shared types ───────────────────────────────────────────────────────────────

export interface InputField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SchemaProperty {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enumValues: string; // comma-separated
  arrayItemType: 'string' | 'number' | 'boolean';
}

export const FIELD_TYPES = ['string', 'number', 'boolean', 'array', 'object'];
export const SCHEMA_TYPES = ['string', 'number', 'boolean', 'array', 'object'] as const;

// ── Counter for stable IDs ─────────────────────────────────────────────────────
let _uid = 0;
export function uid() {
  return `p${++_uid}`;
}

// ── Visual props → JSON Schema ─────────────────────────────────────────────────
export function buildJsonSchema(
  title: string,
  props: SchemaProperty[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const p of props) {
    if (!p.name.trim()) continue;
    if (p.required) required.push(p.name.trim());

    const propDef: Record<string, unknown> = { type: p.type };
    if (p.description.trim()) propDef.description = p.description.trim();

    if (p.type === 'string' && p.enumValues.trim()) {
      const vals = p.enumValues
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (vals.length) propDef.enum = vals;
    }
    if (p.type === 'array') {
      propDef.items = { type: p.arrayItemType };
    }
    properties[p.name.trim()] = propDef;
  }

  return {
    title: title || 'MyResult',
    type: 'object',
    ...(required.length ? { required } : {}),
    properties,
  };
}

// ── JSON Schema → visual props (for pre-populating the editor) ─────────────────
export function schemaToProps(schema: Record<string, unknown>): SchemaProperty[] {
  const properties = (schema.properties as Record<string, Record<string, unknown>>) || {};
  const requiredList = (schema.required as string[]) || [];

  return Object.entries(properties).map(([name, def]) => {
    const type = (def.type as string) || 'string';
    const enumValues = Array.isArray(def.enum)
      ? (def.enum as string[]).join(', ')
      : '';

    let arrayItemType: 'string' | 'number' | 'boolean' = 'string';
    if (type === 'array' && def.items && typeof def.items === 'object') {
      const itemType = (def.items as Record<string, string>).type;
      if (itemType === 'number' || itemType === 'boolean') arrayItemType = itemType;
    }

    return {
      id: uid(),
      name,
      type: (SCHEMA_TYPES.includes(type as never) ? type : 'string') as SchemaProperty['type'],
      description: (def.description as string) || '',
      required: requiredList.includes(name),
      enumValues,
      arrayItemType,
    };
  });
}

// ── Sample JSON → InputFields ──────────────────────────────────────────────────
export function sampleJsonToInputFields(json: Record<string, unknown>): InputField[] {
  return Object.entries(json).map(([key, value]) => {
    let type = 'string';
    if (typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (Array.isArray(value)) type = 'array';
    else if (typeof value === 'object' && value !== null) type = 'object';

    return {
      name: key,
      label: key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      type,
      required: true,
      description: '',
    };
  });
}

// ── Sample response JSON → SchemaProperty[] ───────────────────────────────────
export function sampleResponseToProps(
  json: Record<string, unknown>
): SchemaProperty[] {
  return Object.entries(json).map(([key, value]) => {
    let type: SchemaProperty['type'] = 'string';
    if (typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (Array.isArray(value)) type = 'array';
    else if (typeof value === 'object' && value !== null) type = 'object';

    let arrayItemType: 'string' | 'number' | 'boolean' = 'string';
    if (Array.isArray(value) && value.length > 0) {
      if (typeof value[0] === 'number') arrayItemType = 'number';
      else if (typeof value[0] === 'boolean') arrayItemType = 'boolean';
    }

    return {
      id: uid(),
      name: key,
      type,
      description: '',
      required: true,
      enumValues: '',
      arrayItemType,
    };
  });
}