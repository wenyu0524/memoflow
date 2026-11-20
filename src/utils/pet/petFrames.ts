import manifest from '../../../images/cream_cat_desktop_pet_frames/manifest.json';
import blackManifest from '../../../images/luoxiaohei_desktop_pet_frames/manifest.json';
import type { PetAction } from './petMotion';
import { idleBlinkDurations } from './framePlayback';
import type { PetCharacterId } from './petSettings';

const frameUrls = import.meta.glob<string>(
  ['../../../images/cream_cat_desktop_pet_frames/*/frame_*.png', '../../../images/luoxiaohei_desktop_pet_frames/*/frame_*.png'],
  { eager: true, query: '?url', import: 'default' },
);

export const actionSources = {
  idle: 'idle', walking: 'walk', running: 'run', jumping: 'jump', sitting: 'sit', sleeping: 'sleep',
} as const satisfies Record<PetAction, string>;

type Animations = Record<PetAction, { source: string; fps: number; loop: boolean; frames: string[]; durations?: number[] }>;
const animations = new Map<PetCharacterId, Animations>();
export function getPetAnimations(character: PetCharacterId) {
  const cached = animations.get(character);
  if (cached) return cached;
  const result = Object.fromEntries(Object.entries(actionSources).map(([action, source]) => {
    const cream = manifest.actions.find(animation => animation.id === source)!;
    const black = blackManifest.actions[source];
    const definition = character === 'cream' ? cream : black;
    const files = character === 'cream' ? cream.frames : black.frame_files;
    const folder = character === 'cream' ? 'cream_cat_desktop_pet_frames' : 'luoxiaohei_desktop_pet_frames';
    const frames = files.map((file) => {
      const url = frameUrls['../../../images/' + folder + '/' + source + '/' + file];
      if (!url) throw new Error('Missing pet animation frame: ' + source + '/' + file);
      return url;
    });
    const durations = character === 'cream' ? (source === 'idle' ? idleBlinkDurations : undefined)
      : ('frame_durations_ms' in black ? black.frame_durations_ms : undefined);
    const loop = character === 'cream' ? ['idle', 'walk', 'run'].includes(source) : black.loop;
    return [action, { source, fps: definition.fps, loop, frames, durations }];
  })) as Animations;
  animations.set(character, result);
  return result;
}
export const petAnimations = getPetAnimations('cream');

const preloads = new Map<PetCharacterId, Promise<void>>();
export function preloadPetFrames(character: PetCharacterId = 'cream') {
  const existing = preloads.get(character);
  if (existing) return existing;
  const preload = Promise.all(Object.values(getPetAnimations(character)).flatMap(({ frames }) => frames).map((url) =>
    new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to load pet frame'));
      image.src = url;
    }),
  )).then(() => {}).catch((error) => { preloads.delete(character); throw error; });
  preloads.set(character, preload);
  return preload;
}

export function getAnimationDuration(action: PetAction, character: PetCharacterId = 'cream') {
  const animation = getPetAnimations(character)[action];
  return animation.durations?.reduce((sum, duration) => sum + duration, 0) ?? animation.frames.length / animation.fps * 1000;
}
