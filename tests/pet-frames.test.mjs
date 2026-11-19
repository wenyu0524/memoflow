import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getFrameIndex, getTimedFrame } from '../src/utils/pet/framePlayback.ts';

const root = new URL('../images/luoxiaohei_desktop_pet_frames/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root)));

test('idle and sit hold their eyes open and blink quickly within the same two-second cycle', () => {
  for (const action of ['idle', 'sit']) {
    const durations = manifest.actions[action].frame_durations_ms;
    assert.equal(durations.reduce((sum, ms) => sum + ms, 0), 2000);
    const closing = action === 'idle' ? 1 : 2;
    assert.deepEqual(getTimedFrame(1599, durations), { index: closing - 1, delay: 1 });
    assert.deepEqual(getTimedFrame(1600, durations), { index: closing, delay: 50 });
    assert.deepEqual(getTimedFrame(1650, durations), { index: closing + 1, delay: 80 });
    assert.equal(getTimedFrame(1730, durations).index, closing + 2);
    assert.equal(getTimedFrame(2000, durations).index, 0);
    assert.equal(getTimedFrame(5650, durations).index, closing + 1);
  }
});

test('all six supplied animations contain complete ordered RGBA frames', () => {
  assert.deepEqual(Object.keys(manifest.actions).sort(), ['idle', 'jump', 'run', 'sit', 'sleep', 'walk']);
  for (const [name, animation] of Object.entries(manifest.actions)) {
    assert.ok(animation.fps > 0);
    assert.equal(animation.frame_files.length, 5);
    assert.deepEqual(animation.frame_files, [...animation.frame_files].sort());
    for (const file of animation.frame_files) {
      const png = readFileSync(new URL(name + '/' + file, root));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), manifest.frame_size[0]);
      assert.equal(png.readUInt32BE(20), manifest.frame_size[1]);
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
test('jump plays once and holds its final frame rather than looping', () => {
  const { fps, loop, frame_files: frames } = manifest.actions.jump;
  assert.equal(loop, false);
  assert.equal(getFrameIndex(250, fps, frames.length, loop), 2);
  assert.equal(getFrameIndex(10000, fps, frames.length, loop), 4);
  assert.equal(frames.length / fps * 1000, 625);
});
test('playback is based on elapsed time and can recover from delayed timers', () => {
  assert.equal(getFrameIndex(1875, 8, 5, true), 0);
  assert.equal(getFrameIndex(-100, 8, 5, true), 0);
  assert.equal(getFrameIndex(100, 8, 0, true), 0);
});
