import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createActivityPlan } from '../src/utils/pet/petMotion.ts';

const size = { width: 200, height: 240 };
const area = { position: { x: 0, y: 0 }, size: { width: 1920, height: 1040 } };

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
test('activity varies across all four quadrants and includes walking, running and sudden bursts', () => {
  const random = seeded(42);
  const quadrants = new Set();
  const modes = new Set();
  let bursts = 0;
  for (let i = 0; i < 300; i++) {
    const plan = createActivityPlan({ x: 800, y: 400 }, size, area, random);
    quadrants.add(`${Math.sign(plan.end.x - plan.start.x)},${Math.sign(plan.end.y - plan.start.y)}`);
    modes.add(plan.mode);
    if (plan.burstAt !== null) {
      bursts++;
      assert.ok(plan.burstAt >= .3 && plan.burstAt <= .65);
    }
    assert.ok(plan.runSpeed > plan.walkSpeed * 3);
  }
  assert.equal(quadrants.size, 4);
  assert.deepEqual([...modes].sort(), ['running', 'walking']);
  assert.ok(bursts > 0 && bursts < 300);
});
test('random paths stay inside all edges, including their intermediate positions', () => {
  const random = seeded(17);
  for (const position of [{x:0,y:0},{x:1720,y:800},{x:0,y:800},{x:1720,y:0}]) {
    for (let i = 0; i < 100; i++) {
      const plan = createActivityPlan(position, size, area, random);
      for (const progress of [0,.25,.5,.75,1]) {
        const x = plan.start.x + (plan.end.x - plan.start.x) * progress;
        const y = plan.start.y + (plan.end.y - plan.start.y) * progress;
        assert.ok(x >= 0 && x <= 1720);
        assert.ok(y >= 0 && y <= 800);
      }
    }
  }
});
test('supports negative monitor coordinates and taskbar work areas', () => {
  const path = createActivityPlan({ x: -10, y: 1200 }, size, { position: { x: -1920, y: 40 }, size: { width: 1920, height: 1000 } }, seeded(8));
  assert.deepEqual(path.start, { x: -200, y: 800 });
  assert.ok(path.end.x >= -1920 && path.end.x <= -200);
  assert.ok(path.end.y >= 40 && path.end.y <= 800);
});
test('handles a work area smaller than the pet without invalid coordinates', () => {
  const path = createActivityPlan({ x: 200, y: 200 }, size, { position: { x: 10, y: 20 }, size: { width: 100, height: 100 } }, seeded(8));
  assert.deepEqual(path.start, { x: 10, y: 20 });
  assert.deepEqual(path.end, { x: 10, y: 20 });
});

test('DPI scaling changes travel speed consistently', () => {
  const normal = createActivityPlan({x:800,y:400}, size, area, seeded(3), 1);
  const scaled = createActivityPlan({x:800,y:400}, size, area, seeded(3), 2);
  assert.equal(scaled.walkSpeed, normal.walkSpeed * 2);
  assert.equal(scaled.runSpeed, normal.runSpeed * 2);
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
