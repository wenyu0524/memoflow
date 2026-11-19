import manifest from '../../../images/luoxiaohei_desktop_pet_frames/manifest.json';
import type { PetAction } from './petMotion';

const frameUrls = import.meta.glob<string>(
  '../../../images/luoxiaohei_desktop_pet_frames/*/frame_*.png',
  { eager: true, query: '?url', import: 'default' },
);

export const actionSources = {
  idle: 'idle', walking: 'walk', running: 'run', jumping: 'jump', sitting: 'sit', sleeping: 'sleep',
} as const satisfies Record<PetAction, keyof typeof manifest.actions>;

export const petAnimations = Object.fromEntries(
  Object.entries(actionSources).map(([action, source]) => {
    const definition = manifest.actions[source];
    const frames = definition.frame_files.map((file) => {
      const url = frameUrls['../../../images/luoxiaohei_desktop_pet_frames/' + source + '/' + file];
      if (!url) throw new Error('Missing pet animation frame: ' + source + '/' + file);
      return url;
    });
    const durations = 'frame_durations_ms' in definition ? definition.frame_durations_ms : undefined;
    return [action, { source, fps: definition.fps, loop: definition.loop, frames, durations }];
  }),
) as Record<PetAction, { source: string; fps: number; loop: boolean; frames: string[]; durations?: number[] }>;

let preload: Promise<void> | undefined;
export function preloadPetFrames() {
  preload ??= Promise.all(Object.values(petAnimations).flatMap(({ frames }) => frames).map((url) =>
    new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to load pet frame'));
      image.src = url;
    }),
  )).then(() => {}).catch((error) => { preload = undefined; throw error; });
  return preload;
}

export function getAnimationDuration(action: PetAction) {
  const animation = petAnimations[action];
  return animation.frames.length / animation.fps * 1000;
}
