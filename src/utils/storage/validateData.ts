export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function validateStoredData(key: string, value: unknown) {
  let valid = false;
  if (key === 'todo') valid = Array.isArray(value) && value.every(item => isRecord(item)
    && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean'
    && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string');
  if (key === 'memo') valid = isRecord(value) && typeof value.content === 'string'
    && (value.updatedAt === null || typeof value.updatedAt === 'string');
  if (key === 'settings') valid = isRecord(value) && ['auto', 'light', 'dark'].includes(value.themeMode as string)
    && typeof value.alwaysOnTop === 'boolean' && typeof value.editingLocked === 'boolean' && isRecord(value.window)
    && typeof value.window.width === 'number' && Number.isFinite(value.window.width) && value.window.width > 0
    && typeof value.window.height === 'number' && Number.isFinite(value.window.height) && value.window.height > 0;
  if (key === 'petSettings') valid = isRecord(value) && typeof value.enabled === 'boolean'
    && ['cute', 'funny', 'strict', 'encouraging'].includes(value.style as string)
    && [5,15,30,60].includes(value.minutes as number) && typeof value.autoStart === 'boolean'
    && ['cream', 'xiaohei'].includes(value.character as string);
  if (!valid) throw new Error('Invalid stored data: ' + key);
}
