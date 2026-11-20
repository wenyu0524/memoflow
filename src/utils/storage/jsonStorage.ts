import { invoke } from '@tauri-apps/api/core';
import defaultMemo from '../../../data/memo.json';
import defaultSettings from '../../../data/settings.json';
import defaultTodos from '../../../data/todo.json';
import type { MemoDocument } from '@/types/memo';
import type { AppSettings } from '@/types/settings';
import type { TodoItem } from '@/types/todo';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { storageFiles, type StorageFileKey } from './storageFiles';
import { defaultPetSettings, type PetSettings } from '@/utils/pet/petSettings';
import { validateStoredData } from './validateData';
import { createWriteQueue } from './writeQueue';

interface StorageShape {
  todo: TodoItem[];
  memo: MemoDocument;
  settings: AppSettings;
  petSettings: PetSettings;
}

const defaultData: StorageShape = {
  todo: defaultTodos as TodoItem[],
  memo: defaultMemo as MemoDocument,
  settings: defaultSettings as AppSettings,
  petSettings: defaultPetSettings,
};

const writes = createWriteQueue();
const failed = new Map<StorageFileKey, unknown>();
let readError = '';
let recovery = '';
function notify() { window.dispatchEvent(new Event('memoflow-storage-status')); }
export function storageStatus() { return { failedFiles: [...failed.keys()].map(key => storageFiles[key]), readError, recovery }; }
export async function flushPendingWrites() {
  await writes.flush();
  if (failed.size) throw new Error('Unsaved data');
}
export async function retryFailedWrites() {
  await Promise.all([...failed.entries()].map(([key, data]) => writeJsonFile(key, data as never)));
}

function cloneDefault<K extends StorageFileKey>(key: K): StorageShape[K] {
  return structuredClone(defaultData[key]);
}

export async function readJsonFile<K extends StorageFileKey>(key: K): Promise<StorageShape[K]> {
  const fileName = storageFiles[key];

  try {
    let value: unknown;
    if (isTauriRuntime()) value = await invoke('read_data_file', { fileName });
    else {
      const cached = localStorage.getItem(fileName);
      if (cached === null && localStorage.getItem(fileName + '.bak') === null) return cloneDefault(key);
      try {
        value = JSON.parse(cached ?? 'null'); validateStoredData(key, value);
      } catch {
        value = JSON.parse(localStorage.getItem(fileName + '.bak') ?? 'null');
        validateStoredData(key, value);
        if (cached !== null) localStorage.setItem(fileName + '.corrupt', cached);
        localStorage.setItem(fileName, JSON.stringify(value));
        recovery = fileName + ' 已从上次备份恢复，损坏内容已保留。'; notify();
      }
    }
    validateStoredData(key, value);
    readError = ''; notify();
    return value as StorageShape[K];
  } catch (error) {
    readError = fileName + ' 读取失败，原数据已保留，请检查文件或备份后重试。'; notify();
    throw error;
  }
}

export async function writeJsonFile<K extends StorageFileKey>(key: K, data: StorageShape[K]) {
  const fileName = storageFiles[key];

  // Capture now: Vue state may change again before an earlier write completes.
  const snapshot: StorageShape[K] = JSON.parse(JSON.stringify(data));
  return writes.enqueue(key, async () => {
    try {
      validateStoredData(key, snapshot);
      if (isTauriRuntime()) await invoke('write_data_file', { fileName, data: snapshot });
      else {
        const old = localStorage.getItem(fileName);
        if (old !== null) {
          try { validateStoredData(key, JSON.parse(old)); localStorage.setItem(fileName + '.bak', old); }
          catch (error) {
            if (error instanceof DOMException) throw error;
            localStorage.setItem(fileName + '.corrupt', old);
          }
        }
        localStorage.setItem(fileName, JSON.stringify(snapshot));
        if (key === 'todo') window.dispatchEvent(new Event('memoflow-todos-changed'));
      }
      failed.delete(key); notify();
    } catch (error) { failed.set(key, snapshot); notify(); throw error; }
  });
}
