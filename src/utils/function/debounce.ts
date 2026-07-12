export function debounce<Args extends unknown[]>(callback: (...args: Args) => void, delay: number) {
  let timerId: number | undefined;

  return (...args: Args) => {
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
