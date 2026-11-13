interface Point { x: number; y: number }
interface Size { width: number; height: number }

export function getWalkingPath(
  position: Point,
  size: Size,
  workArea: { position: Point; size: Size },
  requestedDirection: -1 | 1,
  distance = 72,
) {
  const left = workArea.position.x;
  const right = Math.max(left, left + workArea.size.width - size.width);
  const top = workArea.position.y;
  const bottom = Math.max(top, top + workArea.size.height - size.height);
  const start = {
    x: Math.max(left, Math.min(right, position.x)),
    y: Math.max(top, Math.min(bottom, position.y)),
  };
  let direction = requestedDirection;
  if ((direction === 1 && right - start.x < 8) || (direction === -1 && start.x - left < 8)) {
    direction = direction === 1 ? -1 : 1;
  }
  const end = { x: Math.max(left, Math.min(right, start.x + direction * distance)), y: start.y };
  return { start, end, direction };
}
