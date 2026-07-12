import { invoke } from '@tauri-apps/api/core';
import defaultMemo from '../../../data/memo.json';
import defaultSettings from '../../../data/settings.json';
import defaultTodos from '../../../data/todo.json';
import type { MemoDocument } from '@/types/memo';
import type { AppSettings } from '@/types/settings';
import type { TodoItem } from '@/types/todo';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { storageFiles, type StorageFileKey } from './storageFiles';

interface StorageShape {
  todo: TodoItem[];
  memo: MemoDocument;
  settings: AppSettings;
}

const defaultData: StorageShape = {
  todo: defaultTodos as TodoItem[],
  memo: defaultMemo as MemoDocument,
  settings: defaultSettings as AppSettings,
};

function cloneDefault<K extends StorageFileKey>(key: K): StorageShape[K] {
  return structuredClone(defaultData[key]);
}

export async function readJsonFile<K extends StorageFileKey>(key: K): Promise<StorageShape[K]> {
  const fileName = storageFiles[key];

  if (isTauriRuntime()) {
    return invoke<StorageShape[K]>('read_data_file', { fileName });
  }

  const cached = localStorage.getItem(fileName);

  if (!cached) {
    return cloneDefault(key);
  }

  try {
    return JSON.parse(cached) as StorageShape[K];
  } catch {
    return cloneDefault(key);
  }
}

export async function writeJsonFile<K extends StorageFileKey>(key: K, data: StorageShape[K]) {
  const fileName = storageFiles[key];

  if (isTauriRuntime()) {
    await invoke('write_data_file', { fileName, data });
    return;
  }

  localStorage.setItem(fileName, JSON.stringify(data, null, 2));
}
