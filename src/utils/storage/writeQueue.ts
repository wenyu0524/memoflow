export function createWriteQueue() {
  const pending = new Map<string, Promise<void>>();
  return {
    enqueue(key: string, write: () => Promise<void>) {
      const previous = pending.get(key) ?? Promise.resolve();
      const task = previous.catch(() => {}).then(write);
      pending.set(key, task);
      const clear = () => { if (pending.get(key) === task) pending.delete(key); };
      void task.then(clear, clear);
      return task;
    },
    async flush() { while (pending.size) await Promise.all([...pending.values()]); },
  };
}
