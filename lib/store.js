'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const defaultConfig = {
  title: '一闪 Moment',
  description: '把这一瞬间，留给值得的人。',
  background: 'pink-plum',
  imageRequired: true,
  displayImageId: 'plum-window',
  sections: {
    image: { title: '这一刻，被认真呈现', description: '图片由操作人员设置，并在桌面和手机上完整展示。' },
    response: { title: '写下这一刻', description: '选好选项，或输入只有你们懂的话。' },
    submit: { title: '准备好了吗？', description: '确认内容后提交，操作人员就能看到你的心意。' }
  },
  images: [
    { id: 'plum-window', label: '梅花窗景', url: '/presets/plum-window.svg' },
    { id: 'city-light', label: '城市流光', url: '/presets/city-light.svg' },
    { id: 'ocean-breeze', label: '海风蓝调', url: '/presets/ocean-breeze.svg' }
  ],
  fields: [
    {
      id: 'message',
      type: 'text',
      label: '想说的话',
      placeholder: '写下此刻最想说的……',
      required: true,
      maxLength: 500
    },
    {
      id: 'mood',
      type: 'choice',
      label: '此刻的心情',
      required: true,
      selection: 'single',
      options: [
        { id: 'warm', label: '温柔' },
        { id: 'joyful', label: '雀跃' },
        { id: 'calm', label: '平静' },
        { id: 'miss', label: '想念' }
      ]
    },
    {
      id: 'tags',
      type: 'choice',
      label: '给这一刻打上标签',
      required: false,
      selection: 'multiple',
      options: [
        { id: 'spring', label: '春日' },
        { id: 'together', label: '陪伴' },
        { id: 'gift', label: '礼物' },
        { id: 'memory', label: '纪念' }
      ]
    }
  ]
};

function resolveDataDir(baseDir) {
  return path.resolve(baseDir || process.env.YISHAN_DATA_DIR || path.join(projectRoot, 'data'));
}

function normalizeConfig(config) {
  const normalized = { ...config };
  const images = Array.isArray(normalized.images) ? normalized.images : [];
  normalized.images = images;
  normalized.fields = Array.isArray(normalized.fields) ? normalized.fields : [];
  normalized.sections = {
    image: { ...defaultConfig.sections.image, ...(config.sections?.image || {}) },
    response: { ...defaultConfig.sections.response, ...(config.sections?.response || {}) },
    submit: { ...defaultConfig.sections.submit, ...(config.sections?.submit || {}) }
  };
  if (!images.some((image) => image.id === normalized.displayImageId)) {
    normalized.displayImageId = images[0]?.id || '';
  }
  return normalized;
}

function ensureFile(filePath, fallback) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
  }
}

function readJson(filePath, fallback) {
  ensureFile(filePath, fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function loadConfig(baseDir) {
  const dir = resolveDataDir(baseDir);
  return normalizeConfig(readJson(path.join(dir, 'config.json'), defaultConfig));
}

function saveConfig(config, baseDir) {
  const dir = resolveDataDir(baseDir);
  const normalized = normalizeConfig(config);
  writeJson(path.join(dir, 'config.json'), normalized);
  return normalized;
}

function listSubmissions(baseDir) {
  const dir = resolveDataDir(baseDir);
  const submissions = readJson(path.join(dir, 'submissions.json'), []);
  return [...submissions].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function addSubmission(record, baseDir) {
  const dir = resolveDataDir(baseDir);
  const submissions = readJson(path.join(dir, 'submissions.json'), []);
  const submission = {
    id: record.id || crypto.randomUUID(),
    createdAt: record.createdAt || new Date().toISOString(),
    ...record
  };
  submissions.push(submission);
  writeJson(path.join(dir, 'submissions.json'), submissions);
  return submission;
}

module.exports = {
  defaultConfig,
  normalizeConfig,
  loadConfig,
  saveConfig,
  listSubmissions,
  addSubmission
};



