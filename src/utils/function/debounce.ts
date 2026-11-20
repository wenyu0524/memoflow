export function debounce<Args extends unknown[], Result>(callback: (...args: Args) => Result, delay: number) {
  let timerId: number | undefined;
  let pending: Args | undefined;
  function flush() {
    window.clearTimeout(timerId);
    const args = pending; pending = undefined;
    if (args) return callback(...args);
  }
  const debounced = (...args: Args) => {
    pending = args;
    window.clearTimeout(timerId);
    timerId = window.setTimeout(flush, delay);
  };
  debounced.flush = flush;
  return debounced;
}
