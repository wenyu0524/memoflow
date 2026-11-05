import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const json = (path) => JSON.parse(read(path));
const config = json('src-tauri/tauri.conf.json');
const window = config.app.windows[0];

test('native window supports the translucent surface and native shadow', () => {
  assert.equal(window.transparent, true);
  assert.equal(window.shadow, true);
});

test('window can resize beyond the old 1000 × 800 limit', () => {
  assert.equal(window.resizable, true);
  assert.equal(window.maxWidth, undefined);
  assert.equal(window.maxHeight, undefined);
  assert.ok(json('src-tauri/capabilities/default.json').permissions.includes('core:window:allow-toggle-maximize'));
});

test('application and tray icons have valid PNG/ICO headers', () => {
  assert.deepEqual([...read('src-tauri/icons/icon.png').subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...read('src-tauri/icons/icon.ico').subarray(0, 4)], [0, 0, 1, 0]);
});

test('frontend, installer and lockfile versions agree', () => {
  const version = json('package.json').version;
  const lock = json('package-lock.json');
  assert.equal(config.version, version);
  assert.equal(lock.version, version);
  assert.equal(lock.packages[''].version, version);
  assert.ok(read('src-tauri/Cargo.toml').toString().includes(`version = "${version}"`));
  assert.ok(read('src-tauri/Cargo.lock').toString().replaceAll('\r\n', '\n').includes(`name = "memoflow"\nversion = "${version}"`));
});
