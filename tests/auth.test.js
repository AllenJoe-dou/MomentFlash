const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { createApp } = require('../server');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cookieFrom(response) {
  const raw = response.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

async function withServer(run) {
  const dataDir = tempDir('yishan-auth-data-');
  const uploadsDir = tempDir('yishan-auth-uploads-');
  const app = createApp({
    dataDir,
    uploadsDir,
    adminUsername: 'admin',
    adminPassword: '20210224yjq'
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('admin routes redirect to login without a session', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl + '/admin', { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location'), /^\/admin\/login/);
  });
});

test('admin login rejects wrong credentials and accepts configured credentials', async () => {
  await withServer(async (baseUrl) => {
    const wrong = await fetch(baseUrl + '/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' })
    });
    assert.equal(wrong.status, 401);

    const correct = await fetch(baseUrl + '/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '20210224yjq' })
    });
    assert.equal(correct.status, 200);
    const cookie = cookieFrom(correct);
    assert.match(cookie, /yishan_admin_session=/);

    const session = await fetch(baseUrl + '/api/admin/session', { headers: { cookie } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).username, 'admin');

    const admin = await fetch(baseUrl + '/admin', { headers: { cookie }, redirect: 'manual' });
    assert.equal(admin.status, 200);
  });
});

test('admin logout invalidates the session and protects operator APIs', async () => {
  await withServer(async (baseUrl) => {
    const login = await fetch(baseUrl + '/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '20210224yjq' })
    });
    const cookie = cookieFrom(login);

    const protectedConfig = await fetch(baseUrl + '/api/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ title: 'x', description: 'y', background: 'pink-plum', imageRequired: false, images: [], fields: [] })
    });
    assert.equal(protectedConfig.status, 200);

    const logout = await fetch(baseUrl + '/api/admin/logout', {
      method: 'POST',
      headers: { cookie }
    });
    assert.equal(logout.status, 200);

    const afterLogout = await fetch(baseUrl + '/api/admin/session', { headers: { cookie } });
    assert.equal(afterLogout.status, 401);
  });
});
