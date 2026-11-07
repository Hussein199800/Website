import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bullets, apply } from './sync-releases.mjs';

const base = { id: 'x', type: 'app', repo: 'o/x', apk: 'x.apk', version: '1.0.0', whatsNew: 'قديم', url: 'old' };

test('bullets: takes • and - lines, max 4, strips markers', () => {
  const body = 'عنوان\n\n• أ\n- ب\n* **ج**\nنص\n• د\n• هـ';
  assert.deepEqual(bullets(body), ['أ', 'ب', 'ج', 'د']);
});

test('apply: release with apk enables download and updates version/notes', () => {
  const p = apply({ ...base, available: false }, { tag_name: 'v1.2.0', body: '• جديد', assets: [{ name: 'x.apk' }] });
  assert.equal(p.version, '1.2.0');
  assert.equal(p.available, undefined);
  assert.deepEqual(p.whatsNew, ['جديد']);
  assert.equal(p.url, 'https://github.com/o/x/releases/latest/download/x.apk');
});

test('apply: release without the apk keeps button disabled', () => {
  const p = apply(base, { tag_name: 'v2.0.0', body: '', assets: [{ name: 'x-2.0.0.apk' }] });
  assert.equal(p.available, false);
  assert.equal(p.whatsNew, 'قديم');
});

test('apply: no release disables download', () => {
  assert.equal(apply(base, null).available, false);
});

test('bullets: skips GitHub auto-generated PR lines', () => {
  const body = '• جديد\n## What\'s Changed\n* إصلاح by @u in https://github.com/o/x/pull/4';
  assert.deepEqual(bullets(body), ['جديد']);
});
