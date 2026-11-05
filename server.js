'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');

const { loadConfig, saveConfig, addSubmission, listSubmissions } = require('./lib/store');
const { validateSubmission } = require('./lib/validate');

const projectRoot = __dirname;
const ADMIN_SESSION_COOKIE = 'yishan_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function safeExtension(originalName, mimetype) {
  const allowed = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  };
  const ext = path.extname(originalName || '').toLowerCase();
  return allowed[mimetype] || (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.png');
}

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function answerText(field, value) {
  if (field.type === 'text') {
    return typeof value === 'string' ? value : '';
  }
  const values = Array.isArray(value) ? value : (value ? [value] : []);
  return values
    .map((id) => (field.options || []).find((option) => option.id === id)?.label || id)
    .join(' / ');
}

function parseCookies(req) {
  const cookies = {};
  String(req.headers.cookie || '').split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return cookies;
}

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function resolveAdminAuth(options, dataDir) {
  const localAuthPath = path.join(dataDir, 'admin-auth.json');
  let localAuth = {};
  try {
    localAuth = JSON.parse(fs.readFileSync(localAuthPath, 'utf8'));
  } catch {}

  const username = options.adminUsername || process.env.ADMIN_USERNAME || localAuth.username || 'admin';
  const plainPassword = options.adminPassword || process.env.ADMIN_PASSWORD || localAuth.password || '';
  const passwordHash = options.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH || localAuth.passwordHash || '';
  const salt = options.adminPasswordSalt || process.env.ADMIN_PASSWORD_SALT || localAuth.salt || '';

  return {
    username,
    verify(password) {
      if (plainPassword) return timingSafeEqualString(password, plainPassword);
      if (!passwordHash || !salt) return false;
      const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
      return timingSafeEqualString(hash, passwordHash);
    }
  };
}

function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.YISHAN_DATA_DIR || path.join(projectRoot, 'data');
  const uploadsDir = options.uploadsDir || process.env.YISHAN_UPLOADS_DIR || path.join(projectRoot, 'uploads');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  const adminAuth = resolveAdminAuth(options, dataDir);
  const sessions = new Map();

  function isAdminSession(req) {
    const token = parseCookies(req)[ADMIN_SESSION_COOKIE];
    const session = token && sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (token) sessions.delete(token);
      return false;
    }
    return true;
  }

  function requireAdmin(req, res, next) {
    if (isAdminSession(req)) {
      next();
      return;
    }
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: '需要管理员登录' });
      return;
    }
    const nextUrl = String(req.originalUrl || '/admin');
    const safeNext = nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/admin';
    res.redirect(`/admin/login?next=${encodeURIComponent(safeNext)}`);
  }

  function issueAdminSession(res) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS
    });
  }

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(projectRoot, 'public')));
  app.use('/uploads', express.static(uploadsDir));

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, callback) => {
        callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname, file.mimetype)}`);
      }
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new Error('只能上传图片文件'));
        return;
      }
      callback(null, true);
    }
  });

  app.get('/api/config', (req, res) => {
    res.json(loadConfig(dataDir));
  });

  app.put('/api/config', requireAdmin, (req, res) => {
    const config = req.body;
    if (!config || typeof config !== 'object' || !Array.isArray(config.fields) || !Array.isArray(config.images)) {
      res.status(400).json({ error: '配置格式不正确' });
      return;
    }
    res.json(saveConfig(config, dataDir));
  });

  app.get('/api/qr.png', requireAdmin, async (req, res) => {
    const text = String(req.query.text || '');
    try {
      const url = new URL(text);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
      const qr = await QRCode.toBuffer(url.toString(), {
        type: 'png',
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H'
      });
      res.setHeader('content-type', 'image/png');
      res.setHeader('cache-control', 'no-store');
      res.send(qr);
    } catch {
      res.status(400).json({ error: '二维码地址必须是有效的 http 或 https URL' });
    }
  });

  app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: '请选择图片' });
      return;
    }
    res.status(201).json({
      id: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname
    });
  });

  app.post('/api/submissions', (req, res) => {
    const config = loadConfig(dataDir);
    const result = validateSubmission(req.body || {}, config);
    if (!result.ok) {
      res.status(400).json({ error: '提交内容不完整', errors: result.errors });
      return;
    }

    const body = req.body || {};
    const displayImage = (config.images || []).find((image) => image.id === config.displayImageId) || (config.images || [])[0];
    const submission = addSubmission({
      background: body.background || config.background,
      image: displayImage ? {
        id: displayImage.id,
        url: displayImage.url,
        label: displayImage.label,
        kind: displayImage.url.startsWith('/uploads/') ? 'upload' : 'preset'
      } : null,
      answers: body.answers || {},
      userAgent: req.get('user-agent') || ''
    }, dataDir);

    res.status(201).json(submission);
  });

  app.get('/api/submissions', requireAdmin, (req, res) => {
    res.json(listSubmissions(dataDir));
  });

  app.get('/api/submissions/export.csv', requireAdmin, (req, res) => {
    const config = loadConfig(dataDir);
    const submissions = listSubmissions(dataDir);
    const headers = ['提交ID', '提交时间', '背景', '图片', ...config.fields.map((field) => field.label)];
    const rows = submissions.map((submission) => [
      submission.id,
      submission.createdAt,
      submission.background,
      submission.image?.label || '',
      ...config.fields.map((field) => answerText(field, submission.answers?.[field.id]))
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', 'attachment; filename="yishan-moment-submissions.csv"');
    res.send(csv);
  });

  app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(projectRoot, 'public', 'admin-login.html'));
  });

  app.post('/api/admin/login', (req, res) => {
    const username = String(req.body?.username || '');
    const password = String(req.body?.password || '');
    if (!timingSafeEqualString(username, adminAuth.username) || !adminAuth.verify(password)) {
      res.status(401).json({ error: '账号或密码错误' });
      return;
    }
    issueAdminSession(res);
    res.json({ username: adminAuth.username });
  });

  app.get('/api/admin/session', requireAdmin, (req, res) => {
    res.json({ username: adminAuth.username });
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const token = parseCookies(req)[ADMIN_SESSION_COOKIE];
    if (token) sessions.delete(token);
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(projectRoot, 'public', 'admin.html'));
  });

  app.get('/admin/edit', requireAdmin, (req, res) => {
    res.sendFile(path.join(projectRoot, 'public', 'admin-edit.html'));
  });

  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError || error.message === '只能上传图片文件') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: '服务器处理失败' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`一闪 Moment is running at http://localhost:${port}`);
  });
}

module.exports = { createApp };
