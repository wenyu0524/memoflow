export const petCharacters = { cream: '咪了宝', xiaohei: '罗小黑' } as const;
export type PetCharacterId = keyof typeof petCharacters;
export interface PetSettings {
  enabled: boolean;
  style: 'cute' | 'funny' | 'strict' | 'encouraging';
  minutes: number;
  autoStart: boolean;
  character: PetCharacterId;
}
export const defaultPetSettings: PetSettings = { enabled: true, style: 'cute', minutes: 15, autoStart: true, character: 'cream' };
export function normalizePetSettings(value: unknown): PetSettings {
  const source = value && typeof value === 'object' ? value as Partial<PetSettings> : {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultPetSettings.enabled,
    style: ['cute', 'funny', 'strict', 'encouraging'].includes(source.style ?? '') ? source.style! : defaultPetSettings.style,
    minutes: [5, 15, 30, 60].includes(source.minutes ?? 0) ? source.minutes! : defaultPetSettings.minutes,
    autoStart: typeof source.autoStart === 'boolean' ? source.autoStart : defaultPetSettings.autoStart,
    character: Object.hasOwn(petCharacters, source.character ?? '') ? source.character! : defaultPetSettings.character,
  };
}
