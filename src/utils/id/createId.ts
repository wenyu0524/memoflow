export function createId(prefix: string) {
  const value = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${value}`;
}

