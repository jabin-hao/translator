import type { PartialDeep } from '../constants/types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeSettings<T>(target: T, updates: PartialDeep<T>): T {
  if (!isPlainObject(target) || !isPlainObject(updates)) {
    return (updates ?? target) as T;
  }

  const nextValue = { ...(target as Record<string, unknown>) };

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const currentValue = nextValue[key];

    nextValue[key] =
      isPlainObject(currentValue) && isPlainObject(value)
        ? mergeSettings(currentValue, value)
        : value;
  });

  return nextValue as T;
}
