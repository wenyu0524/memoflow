import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { readJsonFile } from '@/utils/storage/jsonStorage';
import { isTauriRuntime } from '@/utils/environment/isTauri';
import { pickReminder, reminderStyles, shouldCelebrate, type ReminderStyle, type TodoSnapshot } from './reminderMessages';

const preferenceKey = 'memoflow-pet-reminders';
export function usePetReminders(say: (text: string, duration?: number) => void, canSpeak: () => boolean) {
  const preferences = reactive({ enabled: true, style: 'cute' as ReminderStyle, minutes: 15 });
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? '{}');
    if (typeof saved.enabled === 'boolean') preferences.enabled = saved.enabled;
    if (Object.hasOwn(reminderStyles, saved.style)) preferences.style = saved.style;
    if ([5, 15, 30, 60].includes(saved.minutes)) preferences.minutes = saved.minutes;
  } catch { /* Keep defaults when stored preferences are invalid. */ }
  const snapshot = ref<TodoSnapshot>();
  const error = ref('');
  let previousMessage = '';
  let celebration = '';
  let timer: number | undefined;
  let disposed = false;
  let revision = 0;
  let unlisten: UnlistenFn | undefined;

  function message(count: number) {
    previousMessage = pickReminder(preferences.style, count, previousMessage);
    return previousMessage;
  }
  function schedule(delay = preferences.minutes * 60_000) {
    window.clearTimeout(timer);
    if (!disposed && preferences.enabled && snapshot.value && snapshot.value.remaining > 0 && !error.value) {
      timer = window.setTimeout(() => {
        if (canSpeak()) { say(message(snapshot.value!.remaining), 7000); schedule(); }
        else schedule(30_000);
      }, delay);
    }
  }
  function accept(current: TodoSnapshot) {
    if (current.remaining > 0) celebration = '';
    if (shouldCelebrate(snapshot.value, current) && preferences.enabled) {
      celebration = message(0);
      if (canSpeak()) { say(celebration, 7000); celebration = ''; }
    }
    const firstPending = !snapshot.value || snapshot.value.remaining === 0;
    snapshot.value = current;
    error.value = '';
    if (!current.remaining) window.clearTimeout(timer);
    else if (firstPending || timer === undefined) schedule(10_000);
  }
  async function refresh() {
    const currentRevision = ++revision;
    try {
      const items = await readJsonFile('todo');
      if (!Array.isArray(items) || items.some(item => !item || typeof item.completed !== 'boolean')) throw new Error('Invalid todos');
      if (!disposed && currentRevision === revision) {
        const completed = items.filter(item => item.completed).length;
        accept({ total: items.length, completed, remaining: items.length - completed });
      }
    } catch {
      if (!disposed && currentRevision === revision) {
        error.value = '待办读取失败，请重新显示桌宠后重试。';
        window.clearTimeout(timer); timer = undefined;
      }
    }
  }
  function remindNow() {
    if (!snapshot.value || error.value) return;
    say(snapshot.value.total ? message(snapshot.value.remaining) : '还没有待办，记下一个今天想完成的小目标吧！', 7000);
    schedule();
  }
  function storageChanged(event: StorageEvent) {
    if (event.key === 'todo.json' || event.key === null) void refresh();
  }
  const changed = () => { void refresh(); };
  watch(preferences, () => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); }
    catch { error.value = '提醒设置暂时无法保存，重启后可能恢复默认。'; }
    if (!preferences.enabled) celebration = '';
    schedule();
  });
  watch(canSpeak, active => {
    if (active && celebration && preferences.enabled) { say(celebration, 7000); celebration = ''; }
  });
  onMounted(async () => {
    window.addEventListener('storage', storageChanged);
    window.addEventListener('memoflow-todos-changed', changed);
    try {
      if (isTauriRuntime()) {
        const stop = await listen('todos-changed', changed);
        if (disposed) { stop(); return; }
        unlisten = stop;
      }
      if (!disposed) await refresh();
    } catch { if (!disposed) error.value = '待办同步暂时不可用，请重新显示桌宠后重试。'; }
  });
  onUnmounted(() => {
    disposed = true; window.clearTimeout(timer); unlisten?.();
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('memoflow-todos-changed', changed);
  });
  return { preferences, snapshot, error, remindNow };
}
