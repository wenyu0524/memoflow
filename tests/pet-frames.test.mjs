import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getFrameIndex, getTimedFrame, idleBlinkDurations } from '../src/utils/pet/framePlayback.ts';

const root = new URL('../images/cream_cat_desktop_pet_frames/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root)));

test('cream cat holds its eyes open and blinks quickly within a two-second idle cycle', () => {
    const durations = idleBlinkDurations;
    assert.equal(durations.reduce((sum, ms) => sum + ms, 0), 2000);
    assert.deepEqual(getTimedFrame(1599, durations), { index: 1, delay: 1 });
    assert.deepEqual(getTimedFrame(1600, durations), { index: 2, delay: 60 });
    assert.deepEqual(getTimedFrame(1660, durations), { index: 3, delay: 70 });
    assert.equal(getTimedFrame(1730, durations).index, 4);
    assert.equal(getTimedFrame(2000, durations).index, 0);
    assert.equal(getTimedFrame(5660, durations).index, 3);
});

test('all six supplied animations contain complete ordered RGBA frames', () => {
  assert.deepEqual(manifest.actions.map(action => action.id).sort(), ['idle', 'jump', 'run', 'sit', 'sleep', 'walk']);
  for (const animation of manifest.actions) {
    assert.ok(animation.fps > 0);
    assert.equal(animation.frames.length, 5);
    assert.deepEqual(animation.frames, [...animation.frames].sort());
    for (const file of animation.frames) {
      const png = readFileSync(new URL(animation.id + '/' + file, root));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), manifest.canvas[0]);
      assert.equal(png.readUInt32BE(20), manifest.canvas[1]);
      assert.equal(png[25], 6, 'frame must retain RGBA transparency');
    }
  }
});
test('looping animations use manifest FPS and wrap back to their first frame', () => {
  assert.equal(getFrameIndex(0, 8, 5, true), 0);
  assert.equal(getFrameIndex(125, 8, 5, true), 1);
  assert.equal(getFrameIndex(625, 8, 5, true), 0);
  assert.equal(getFrameIndex(200, 5, 5, true), 1);
  assert.equal(getFrameIndex(200, 12, 5, true), 2);
});
test('jump, sitting and sleeping can play once and hold their final pose', () => {
  for (const action of ['jump', 'sit', 'sleep']) {
    const { fps, frames } = manifest.actions.find(item => item.id === action);
    assert.equal(getFrameIndex(10000, fps, frames.length, false), 4);
    if (action === 'jump') assert.equal(frames.length / fps * 1000, 625);
  }
});
test('playback is based on elapsed time and can recover from delayed timers', () => {
  assert.equal(getFrameIndex(1875, 8, 5, true), 0);
  assert.equal(getFrameIndex(-100, 8, 5, true), 0);
  assert.equal(getFrameIndex(100, 8, 0, true), 0);
});
