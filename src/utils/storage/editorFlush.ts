const editors = new Set<() => void | Promise<void>>();
export function registerEditorFlush(flush: () => void | Promise<void>) {
  editors.add(flush);
  return () => { editors.delete(flush); };
}
export async function flushEditors() { await Promise.all([...editors].map(flush => flush())); }
