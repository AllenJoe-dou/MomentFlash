const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('participant page includes display image, fields, background picker, and submit flow', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /id="image-upload"/);
  assert.doesNotMatch(html, /id="preset-list"/);
  assert.doesNotMatch(html, /id="clear-image"/);
  assert.match(html, /id="display-image"/);
  assert.match(html, /id="display-image-frame"/);
  assert.match(html, /id="fields-container"/);
  assert.match(html, /id="submit-button"/);
  assert.doesNotMatch(html, /id="background-picker"/);
  assert.doesNotMatch(html, /class="image-caption"/);
  assert.doesNotMatch(html, /class="status-chip">展示图片</);
  assert.doesNotMatch(html, /class="status-chip">可直接提交</);
  assert.doesNotMatch(html, /暂未设置展示图片/);
  assert.doesNotMatch(html, /请操作人员在配置页面上传图片/);
  assert.doesNotMatch(html, /display-image-empty/);
  assert.match(html, /一闪 Moment/);
  assert.match(html, /favicon/);
  assert.ok(fs.existsSync(path.join(root, 'public', 'favicon.svg')));
});

test('participant styles include liquid glass presentation and responsive rules', () => {
  const css = read('public/styles.css');
  assert.match(css, /backdrop-filter/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /#display-image[^}]*height:\s*auto/s);
  assert.doesNotMatch(css, /\.display-image-frame[^}]*height:\s*clamp/s);
  assert.match(css, /\.display-image-frame/);
  assert.match(css, /@media/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.glass-card/);
});

test('background system supports four themes including pink plum particles', () => {
  const js = read('public/backgrounds.js');
  assert.match(js, /pink-plum/);
  assert.match(js, /violet-flow/);
  assert.match(js, /golden-hour/);
  assert.match(js, /ocean-bubble/);
  assert.match(js, /plum/i);
});

test('participant app wires API calls and accessible form labels', () => {
  const js = read('public/app.js');
  assert.match(js, /\/api\/config/);
  assert.doesNotMatch(js, /\/api\/upload/);
  assert.match(js, /\/api\/submissions/);
  assert.match(js, /displayImageId/);
  assert.match(js, /aria-label/);
  assert.doesNotMatch(js, /renderBackgroundPicker/);
  assert.doesNotMatch(js, /data-theme/);
  assert.doesNotMatch(js, /FormData/);
});








