const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('admin submission page includes table, filters, export, and navigation', () => {
  const html = read('public/admin.html');
  assert.match(html, /id="submission-table"/);
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="export-button"/);
  assert.match(html, /id="submission-count"/);
  assert.match(html, /href="\/admin\/edit"/);
});

test('admin submission script fetches and exports submissions', () => {
  const js = read('public/admin.js');
  assert.match(js, /\/api\/submissions/);
  assert.match(js, /export\.csv/);
  assert.match(js, /search-input/);
  assert.match(js, /textContent/);
});

test('admin editor includes controls for copy, images, background, text, and choices', () => {
  const html = read('public/admin-edit.html');
  assert.match(html, /id="config-form"/);
  assert.match(html, /id="title-input"/);
  assert.match(html, /id="description-input"/);
  assert.match(html, /id="images-editor"/);
  assert.match(html, /id="fields-editor"/);
  assert.match(html, /id="background-select"/);
  assert.match(html, /id="add-text-field"/);
  assert.match(html, /id="add-choice-field"/);
  assert.match(html, /id="image-title-input"/);
  assert.match(html, /id="image-description-input"/);
  assert.match(html, /id="response-title-input"/);
  assert.match(html, /id="response-description-input"/);
  assert.match(html, /id="submit-title-input"/);
  assert.match(html, /id="submit-description-input"/);
});

test('admin editor includes display-image selection and QR controls', () => {
  const html = read('public/admin-edit.html');
  assert.match(html, /id="generate-qr"/);
  assert.match(html, /id="save-qr"/);
  assert.match(html, /id="qr-preview"/);
  assert.match(html, /id="qr-url"/);
  assert.match(html, /id="images-editor"/);
});

test('admin editor generates and downloads operator QR codes', () => {
  const js = read('public/admin-edit.js');
  assert.match(js, /\/api\/qr\.png/);
  assert.match(js, /displayImageId/);
  assert.match(js, /yishan-moment-qr\.png/);
  assert.match(js, /data-image-action="setDisplay"/);
  assert.match(js, /URL\.createObjectURL/);
});
test('admin editor script saves config through the API', () => {
  const js = read('public/admin-edit.js');
  assert.match(js, /\/api\/config/);
  assert.match(js, /method: 'PUT'/);
  assert.match(js, /FormData/);
  assert.match(js, /add-text-field/);
  assert.match(js, /add-choice-field/);
});


