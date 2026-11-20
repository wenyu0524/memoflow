import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reminderStyles, dynamicMessages, formatReminder, pickReminder, shouldCelebrate } from '../src/utils/pet/reminderMessages.ts';
import { validPetArea, clampPetPosition, intersectPetArea, selectionRect } from '../src/utils/pet/petArea.ts';
import { createActivityPlan } from '../src/utils/pet/petMotion.ts';

test('all four styles have count-aware wording for one, several, many and complete', () => {
  assert.equal(Object.keys(reminderStyles).length, 4);
  for (const style of Object.keys(reminderStyles)) {
    for (const [count, scenario] of [[1, 'one'], [3, 'several'], [6, 'many'], [20, 'many'], [0, 'complete']]) {
      const text = pickReminder(style, count, '', () => 0);
      assert.equal(text, formatReminder(dynamicMessages[style][scenario][0], { count, petName: '咪了宝' }));
      assert.ok(!text.includes('{count}'));
      if (count) assert.ok(text.includes(String(count)));
    }
  }
});
test('fixed and dynamic random pools never repeat the previous sentence', () => {
  for (const style of Object.keys(reminderStyles)) {
    for (const count of [0, 1, 3, 8]) {
      for (const random of [() => 0, () => .8, () => .999]) {
        let previous = '';
        for (let i = 0; i < 10; i++) {
          const next = pickReminder(style, count, previous, random);
          assert.ok(next && next !== previous);
          previous = next;
        }
      }
    }
  }
  assert.equal(formatReminder('还有 {count} 项，{name} 加油！', { count: 3, name: '小黑' }), '还有 3 项，小黑 加油！');
  assert.ok(pickReminder('cute', 1, '', () => 0, '罗小黑').includes('罗小黑'));
});
test('celebrates completing the final task, not startup, empty lists or deleting the last pending task', () => {
  const pending = { remaining: 1, completed: 2, total: 3 };
  const done = { remaining: 0, completed: 3, total: 3 };
  assert.equal(shouldCelebrate(pending, done), true);
  assert.equal(shouldCelebrate(undefined, done), false);
  assert.equal(shouldCelebrate(done, done), false);
  assert.equal(shouldCelebrate(pending, { remaining: 0, completed: 2, total: 2 }), false);
  assert.equal(shouldCelebrate(pending, { remaining: 0, completed: 0, total: 0 }), false);
});
test('selection supports reverse dragging, physical coordinates and validation of saved areas', () => {
  assert.deepEqual(selectionRect({ x: 700, y: 600 }, { x: 100, y: 50 }), { position: { x: 100, y: 50 }, size: { width: 600, height: 550 } });
  for (const value of [null, {}, { position: { x: NaN, y: 0 }, size: { width: 500, height: 500 } }, { position: { x: 0, y: 0 }, size: { width: -1, height: 400 } }]) assert.equal(validPetArea(value), false);
  assert.equal(validPetArea({ position: { x: -1500, y: 40 }, size: { width: 900, height: 700 } }), true);
});
test('movement and manual drag clamping keep the entire pet inside the selected rectangle', () => {
  const work = { position: { x: -1920, y: 40 }, size: { width: 1920, height: 1000 } };
  const selected = { position: { x: -1700, y: 140 }, size: { width: 700, height: 600 } };
  const size = { width: 300, height: 360 }; // 150% DPI
  const area = intersectPetArea(selected, work, size);
  assert.deepEqual(clampPetPosition({ x: 9999, y: -9999 }, size, area), { x: -1300, y: 140 });
  for (let i = 0; i < 100; i++) {
    const plan = createActivityPlan({ x: -1920, y: 1000 }, size, area);
    for (const progress of [0, .25, .5, 1]) {
      const point = { x: plan.start.x + (plan.end.x - plan.start.x) * progress, y: plan.start.y + (plan.end.y - plan.start.y) * progress };
      assert.ok(point.x >= -1700 && point.x + size.width <= -1000);
      assert.ok(point.y >= 140 && point.y + size.height <= 740);
    }
  }
  assert.deepEqual(intersectPetArea({ position: { x: 99999, y: 0 }, size: { width: 300, height: 500 } }, work, size), work);
  assert.deepEqual(intersectPetArea({ position: { x: -100, y: 40 }, size: { width: 400, height: 500 } }, work, size), work);
});
test('native region picker is transparent, initially hidden and has its own event capability', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
  const picker = config.app.windows.find(item => item.label === 'pet-area');
  assert.equal(picker.visible, false); assert.equal(picker.transparent, true);
  assert.equal(picker.decorations, false); assert.equal(picker.alwaysOnTop, true);
  const capability = JSON.parse(readFileSync(new URL('../src-tauri/capabilities/pet-area.json', import.meta.url)));
  assert.deepEqual(capability.windows, ['pet-area']);
});
