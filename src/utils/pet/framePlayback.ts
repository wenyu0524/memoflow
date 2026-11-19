export function getFrameIndex(elapsedMs: number, fps: number, frameCount: number, loop: boolean) {
  if (frameCount < 1) return 0;
  const index = Math.max(0, Math.floor(elapsedMs * fps / 1000));
  return loop ? index % frameCount : Math.min(index, frameCount - 1);
}

export function getTimedFrame(elapsedMs: number, durations: number[]) {
  const cycle = durations.reduce((total, duration) => total + duration, 0);
  let phase = Math.max(0, elapsedMs) % cycle;
  for (let index = 0; index < durations.length; index++) {
    if (phase < durations[index]) return { index, delay: durations[index] - phase };
    phase -= durations[index];
  }
  return { index: 0, delay: durations[0] };
}
