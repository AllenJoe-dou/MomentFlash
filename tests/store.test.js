const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadConfig, saveConfig, addSubmission, listSubmissions } = require('../lib/store');
const { validateSubmission } = require('../lib/validate');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'yishan-store-'));
}

test('loads and saves config in a data directory', () => {
  const dir = tempDir();
  const config = loadConfig(dir);
  assert.equal(config.title, '一闪 Moment');
  config.title = '测试时刻';
  saveConfig(config, dir);
  assert.equal(loadConfig(dir).title, '测试时刻');
});

test('normalizes displayImageId to an existing image', () => {
  const dir = tempDir();
  saveConfig({
    title: 'Test',
    description: 'Test',
    background: 'pink-plum',
    imageRequired: true,
    displayImageId: 'missing',
    images: [
      { id: 'first', label: 'First', url: '/first.png' },
      { id: 'second', label: 'Second', url: '/second.png' }
    ],
    fields: []
  }, dir);
  assert.equal(loadConfig(dir).displayImageId, 'first');
});


test('adds submissions and lists newest first', () => {
  const dir = tempDir();
  addSubmission({ id: 'one', createdAt: '2026-11-04T01:00:00.000Z' }, dir);
  addSubmission({ id: 'two', createdAt: '2026-11-04T02:00:00.000Z' }, dir);
  assert.deepEqual(listSubmissions(dir).map((item) => item.id), ['two', 'one']);
});

test('rejects missing required text and invalid choices', () => {
  const config = {
    imageRequired: false,
    fields: [
      { id: 'message', type: 'text', label: '想说的话', required: true },
      { id: 'mood', type: 'choice', label: '心情', required: true, selection: 'single', options: [{ id: 'happy', label: '开心' }] },
      { id: 'tags', type: 'choice', label: '标签', required: false, selection: 'multiple', options: [{ id: 'spring', label: '春天' }] }
    ]
  };

  const missing = validateSubmission({ answers: { message: '   ', mood: '' }, background: 'pink-plum' }, config);
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.length, 2);

  const invalid = validateSubmission({
    answers: { message: '你好', mood: 'sad', tags: 'spring' },
    background: 'pink-plum'
  }, config);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.length, 2);

  const valid = validateSubmission({
    answers: { message: '你好', mood: 'happy', tags: ['spring'] },
    background: 'pink-plum'
  }, config);
  assert.equal(valid.ok, true);
});

