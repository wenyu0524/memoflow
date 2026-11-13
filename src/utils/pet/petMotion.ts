interface Point { x: number; y: number }
interface Size { width: number; height: number }
export type PetAction = 'idle' | 'walking' | 'running' | 'jumping';

export function createActivityPlan(
  position: Point,
  size: Size,
  workArea: { position: Point; size: Size },
  random: () => number = Math.random,
  scale = 1,
) {
  const left = workArea.position.x;
  const right = Math.max(left, left + workArea.size.width - size.width);
  const top = workArea.position.y;
  const bottom = Math.max(top, top + workArea.size.height - size.height);
  const start = {
    x: Math.max(left, Math.min(right, position.x)),
    y: Math.max(top, Math.min(bottom, position.y)),
  };
  const mode: 'running' | 'walking' = random() < .24 ? 'running' : 'walking';
  const angle = random() * Math.PI * 2;
  const distance = (mode === 'running' ? 190 + random() * 260 : 85 + random() * 130) * scale;
  // Reflect destinations into the work area; interpolation then remains inside its bounds.
  const reflect = (value: number, min: number, max: number) => {
    const span = max - min;
    if (span <= 0) return min;
    const phase = ((value - min) % (span * 2) + span * 2) % (span * 2);
    return min + (phase <= span ? phase : span * 2 - phase);
  };
  const end = {
    x: reflect(start.x + Math.cos(angle) * distance, left, right),
    y: reflect(start.y + Math.sin(angle) * distance, top, bottom),
  };
  const burstAt = mode === 'walking' && random() < .38 ? .3 + random() * .35 : null;
  return {
    start, end, mode, burstAt,
    direction: (end.x >= start.x ? 1 : -1) as -1 | 1,
    lookY: Math.sign(end.y - start.y) * 2,
    walkSpeed: 64 * scale,
    runSpeed: 275 * scale,
    pause: mode === 'running' ? 350 + random() * 850 : 900 + random() * 1900,
  };
}
