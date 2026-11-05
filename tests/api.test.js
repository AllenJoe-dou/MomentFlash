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
  const dataDir = tempDir('yishan-api-data-');
  const uploadsDir = tempDir('yishan-api-uploads-');
  const app = createApp({
    dataDir,
    uploadsDir,
    adminUsername: 'admin',
    adminPassword: '20210224yjq'
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(baseUrl + '/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '20210224yjq' })
  });
  const authHeaders = { cookie: cookieFrom(login) };
  try {
    await run(baseUrl, { dataDir, uploadsDir, authHeaders });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('API reads and updates config', async () => {
  await withServer(async (baseUrl, { authHeaders }) => {
    const getResponse = await fetch(`${baseUrl}/api/config`);
    assert.equal(getResponse.status, 200);
    const config = await getResponse.json();
    assert.equal(config.title, '一闪 Moment');

    config.title = '今晚的 Moment';
    const putResponse = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify(config)
    });
    assert.equal(putResponse.status, 200);

    const updated = await (await fetch(`${baseUrl}/api/config`)).json();
    assert.equal(updated.title, '今晚的 Moment');
  });
});

test('API uploads an image and stores a submission', async () => {
  await withServer(async (baseUrl, { authHeaders }) => {
    const form = new FormData();
    form.append('image', new Blob(['fake-image'], { type: 'image/png' }), 'moment.png');
    const uploadResponse = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form, headers: authHeaders });
    assert.equal(uploadResponse.status, 201);
    const upload = await uploadResponse.json();
    assert.match(upload.url, /^\/uploads\//);

    const invalidResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: { message: '', mood: '' }, background: 'pink-plum' })
    });
    assert.equal(invalidResponse.status, 400);

    const submitResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageId: 'plum-window',
        imageUrl: '/presets/plum-window.svg',
        background: 'pink-plum',
        answers: { message: '记得这一刻', mood: 'warm', tags: ['memory'] }
      })
    });
    assert.equal(submitResponse.status, 201);
    const created = await submitResponse.json();
    assert.ok(created.id);

    const listResponse = await fetch(`${baseUrl}/api/submissions`, { headers: authHeaders });
    const submissions = await listResponse.json();
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].answers.message, '记得这一刻');
  });
});

test('API submissions use configured display image and ignore participant image overrides', async () => {
  await withServer(async (baseUrl, { authHeaders }) => {
    const config = await (await fetch(baseUrl + '/api/config')).json();
    config.displayImageId = 'city-light';
    await fetch(baseUrl + '/api/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify(config)
    });

    const response = await fetch(baseUrl + '/api/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageId: 'plum-window',
        imageUrl: '/presets/plum-window.svg',
        uploadId: 'participant-upload.png',
        background: 'pink-plum',
        answers: { message: '展示图测试', mood: 'warm', tags: [] }
      })
    });
    assert.equal(response.status, 201);
    const submission = await response.json();
    assert.equal(submission.image.id, 'city-light');
    assert.equal(submission.image.url, '/presets/city-light.svg');
    assert.equal(submission.image.kind, 'preset');
  });
});

test('API generates local PNG QR codes and rejects invalid URLs', async () => {
  await withServer(async (baseUrl, { authHeaders }) => {
    const response = await fetch(baseUrl + '/api/qr.png?text=' + encodeURIComponent('https://moment.example.com/'), { headers: authHeaders });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 4)], [137, 80, 78, 71]);

    const invalid = await fetch(baseUrl + '/api/qr.png?text=' + encodeURIComponent('ftp://example.com'), { headers: authHeaders });
    assert.equal(invalid.status, 400);
  });
});

test('API exports submissions as CSV', async () => {
  await withServer(async (baseUrl, { authHeaders }) => {
    await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageId: 'plum-window',
        background: 'pink-plum',
        answers: { message: '一行,带逗号', mood: 'warm', tags: ['memory'] }
      })
    });

    const response = await fetch(`${baseUrl}/api/submissions/export.csv`, { headers: authHeaders });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment/);
    const csv = await response.text();
    assert.match(csv, /提交时间/);
    assert.match(csv, /"一行,带逗号"/);
  });
});
