export interface PetArea { position: { x: number; y: number }; size: { width: number; height: number } }

export function validPetArea(value: unknown): value is PetArea {
  const area = value as PetArea | null;
  return Boolean(area && [area.position?.x, area.position?.y, area.size?.width, area.size?.height].every(Number.isFinite)
    && area.size.width > 0 && area.size.height > 0);
}

export function intersectPetArea(selected: PetArea | null, work: PetArea, petSize: PetArea['size']): PetArea {
  if (!selected) return work;
  const x = Math.max(selected.position.x, work.position.x);
  const y = Math.max(selected.position.y, work.position.y);
  const width = Math.min(selected.position.x + selected.size.width, work.position.x + work.size.width) - x;
  const height = Math.min(selected.position.y + selected.size.height, work.position.y + work.size.height) - y;
  return width >= petSize.width && height >= petSize.height ? { position: { x, y }, size: { width, height } } : work;
}

export function clampPetPosition(position: PetArea['position'], size: PetArea['size'], area: PetArea) {
  return {
    x: Math.round(Math.max(area.position.x, Math.min(position.x, area.position.x + Math.max(0, area.size.width - size.width)))),
    y: Math.round(Math.max(area.position.y, Math.min(position.y, area.position.y + Math.max(0, area.size.height - size.height)))),
  };
}

export function selectionRect(start: { x: number; y: number }, end: { x: number; y: number }): PetArea {
  return { position: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    size: { width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) } };
}
