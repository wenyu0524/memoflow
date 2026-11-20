import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWriteQueue } from '../src/utils/storage/writeQueue.ts';
import { validateStoredData } from '../src/utils/storage/validateData.ts';
import { normalizePetSettings, petCharacters } from '../src/utils/pet/petSettings.ts';
import { waitForWindowPaint } from '../src/utils/window/ready.ts';

test('legacy pet preferences migrate while invalid values fall back to valid defaults', () => {
  assert.deepEqual(normalizePetSettings({ enabled:false, style:'strict', minutes:30 }), {enabled:false,style:'strict',minutes:30,autoStart:true,character:'cream'});
  assert.deepEqual(normalizePetSettings({enabled:'false',style:'unknown',minutes:-1,autoStart:null,character:'__proto__'}), normalizePetSettings(null));
  assert.deepEqual(Object.values(petCharacters), ['咪了宝', '罗小黑']);
  assert.equal(normalizePetSettings({autoStart:false,character:'xiaohei'}).autoStart, false);
});
test('invalid persisted structures are rejected before editing or saving', () => {
  for (const [key, data] of [['todo',{}],['todo',[{id:'a',title:'x',completed:'false'}]],['memo',{content:1}],['settings',{themeMode:'auto',window:{}}],['petSettings',{character:'evil'}]]) {
    assert.throws(()=>validateStoredData(key,data));
  }
  validateStoredData('todo', []);
  validateStoredData('memo', {content:'keep',updatedAt:null});
  validateStoredData('petSettings', normalizePetSettings({autoStart:false}));
});
test('ordered saves prevent older work from overwriting newer content, and failures do not poison retries', async () => {
  const queue = createWriteQueue(); const written = [];
  let release; const gate = new Promise(resolve=>{release=resolve;});
  const first = queue.enqueue('memo', async()=>{await gate;written.push('first');});
  const second = queue.enqueue('memo', async()=>{written.push('second');});
  await queue.enqueue('todo',async()=>{written.push('other file');});
  assert.deepEqual(written,['other file']); release();
  await Promise.all([first,second]);
  assert.deepEqual(written,['other file','first','second']);
  await assert.rejects(queue.enqueue('memo',async()=>{throw new Error('disk full');}));
  await queue.enqueue('memo',async()=>{written.push('retry');}); await queue.flush();
  assert.equal(written.at(-1),'retry');
});
test('a hidden WebView that suspends RAF still finishes startup', async () => {
  const previous = globalThis.window;
  globalThis.window = {setTimeout,clearTimeout,requestAnimationFrame:()=>{}};
  try { await waitForWindowPaint(); }
  finally { globalThis.window = previous; }
});
test('main window stays hidden while positioning and production pages use a restrictive CSP', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json',import.meta.url)));
  const main = config.app.windows.find(item=>item.label==='main');
  assert.equal(main.visible,false); assert.equal(main.center,true);
  assert.ok(config.app.security.csp.includes("object-src 'none'"));
  assert.ok(!config.app.security.csp.includes("'unsafe-eval'"));
});
