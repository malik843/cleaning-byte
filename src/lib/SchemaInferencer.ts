export type FieldType = 'NAME' | 'EMAIL' | 'DATE' | 'ID' | 'STRING' | 'NUMBER' | 'PHONE' | 'FINGERPRINT' | 'IGNORE';

export function inferColumnType(header: string): FieldType {
  const lower = header.toLowerCase();
  if (/email/i.test(lower)) return 'EMAIL';
  if (/name|first|last/i.test(lower)) return 'NAME';
  if (/date|time|created|updated|added|due/i.test(lower)) return 'DATE';
  if (/phone|mobile|cell/i.test(lower)) return 'PHONE';
  if (/amount|price|total|qty|quantity|number|num/i.test(lower)) return 'NUMBER';
  if (/fingerprint|biometric|nfiq/i.test(lower)) return 'FINGERPRINT';
  if (/id|uuid|code|key/i.test(lower)) return 'ID';
  return 'STRING';
}

export function inferSchema(headers: string[]): Record<string, FieldType> {
  const schema: Record<string, FieldType> = {};
  for (const h of headers) {
    schema[h] = inferColumnType(h);
  }
  return schema;
}
