import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getWalkingPath } from '../src/utils/pet/petMotion.ts';

const size = { width: 200, height: 240 };
const area = { position: { x: 0, y: 0 }, size: { width: 1920, height: 1040 } };

test('walks a short distance without changing height', () => {
  const path = getWalkingPath({ x: 600, y: 500 }, size, area, 1);
  assert.deepEqual(path.end, { x: 672, y: 500 });
});
test('turns around at either edge and never walks off screen', () => {
  assert.deepEqual(getWalkingPath({ x: 1720, y: 800 }, size, area, 1).end, { x: 1648, y: 800 });
  assert.deepEqual(getWalkingPath({ x: 0, y: 800 }, size, area, -1).end, { x: 72, y: 800 });
  assert.equal(getWalkingPath({ x: 1690, y: 800 }, size, area, 1).end.x, 1720);
});
test('supports negative monitor coordinates and taskbar work areas', () => {
  const path = getWalkingPath({ x: -10, y: 1200 }, size, { position: { x: -1920, y: 40 }, size: { width: 1920, height: 1000 } }, 1);
  assert.deepEqual(path.start, { x: -200, y: 800 });
  assert.deepEqual(path.end, { x: -272, y: 800 });
});
test('handles a work area smaller than the pet without invalid coordinates', () => {
  const path = getWalkingPath({ x: 200, y: 200 }, size, { position: { x: 10, y: 20 }, size: { width: 100, height: 100 } }, 1);
  assert.deepEqual(path.start, { x: 10, y: 20 });
  assert.deepEqual(path.end, { x: 10, y: 20 });
});

test('pet is an independent transparent window that does not steal startup focus', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
  const pet = config.app.windows.find(window => window.label === 'pet');
  assert.equal(pet.url, 'index.html?view=pet');
  assert.equal(pet.transparent, true);
  assert.equal(pet.decorations, false);
  assert.equal(pet.shadow, false);
  assert.equal(pet.alwaysOnTop, true);
  assert.equal(pet.skipTaskbar, true);
  assert.equal(pet.focus, false);
  assert.equal(pet.resizable, false);
});

test('movement permissions apply only to the pet window', () => {
  const capability = JSON.parse(readFileSync(new URL('../src-tauri/capabilities/pet.json', import.meta.url)));
  assert.deepEqual(capability.windows, ['pet']);
  assert.ok(capability.permissions.includes('core:window:allow-start-dragging'));
  assert.ok(capability.permissions.includes('core:window:allow-set-position'));
});
