const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('package exposes Railway-compatible start and test scripts', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.start, 'node server.js');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.match(pkg.engines.node, /20/);
});

test('Railway files configure web startup', () => {
  assert.match(read('Procfile'), /^web: npm start$/m);
  const railway = JSON.parse(read('railway.json'));
  assert.equal(railway.deploy.startCommand, 'npm start');
  assert.equal(railway.deploy.healthcheckPath, '/');
});

test('README covers local use and GitHub-to-Railway deployment', () => {
  const readme = read('README.md');
  assert.match(readme, /npm install/);
  assert.match(readme, /npm start/);
  assert.match(readme, /GitHub/);
  assert.match(readme, /Railway/);
  assert.match(readme, /PORT/);
  assert.match(readme, /\/admin/);
});

test('gitignore excludes runtime uploads and local dependency output', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /node_modules/);
  assert.match(ignore, /uploads\//);
});
