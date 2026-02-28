export function safeJsonParse<TValue>(
  jsonText: string,
  fallback: TValue,
): TValue {
  try {
    return JSON.parse(jsonText) as TValue;
  } catch {
    return fallback;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export function parseStringArrayJson(jsonText: string): string[] {
  return parseStringArray(safeJsonParse<unknown>(jsonText, []));
}

export function parseRecordJson<TValue extends Record<string, unknown>>(
  jsonText: string,
  fallback: TValue,
): TValue {
  const parsedValue = safeJsonParse<unknown>(jsonText, fallback);
  return isRecord(parsedValue) ? (parsedValue as TValue) : fallback;
}
