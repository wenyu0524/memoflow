export const storageFiles = {
  todo: 'todo.json',
  memo: 'memo.json',
  settings: 'settings.json',
} as const;

export type StorageFileKey = keyof typeof storageFiles;
