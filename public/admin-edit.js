'use strict';

let config = null;
let qrBlobUrl = '';

const elements = {
  form: document.querySelector('#config-form'),
  title: document.querySelector('#title-input'),
  description: document.querySelector('#description-input'),
  background: document.querySelector('#background-select'),
  imageRequired: document.querySelector('#image-required'),
  imageTitle: document.querySelector('#image-title-input'),
  imageDescription: document.querySelector('#image-description-input'),
  responseTitle: document.querySelector('#response-title-input'),
  responseDescription: document.querySelector('#response-description-input'),
  submitTitle: document.querySelector('#submit-title-input'),
  submitDescription: document.querySelector('#submit-description-input'),
  images: document.querySelector('#images-editor'),
  fields: document.querySelector('#fields-editor'),
  addImage: document.querySelector('#add-image'),
  uploadImage: document.querySelector('#image-upload-admin'),
  addTextField: document.querySelector('#add-text-field'),
  addChoiceField: document.querySelector('#add-choice-field'),
  save: document.querySelector('#save-config'),
  generateQr: document.querySelector('#generate-qr'),
  saveQr: document.querySelector('#save-qr'),
  generateQrSecondary: document.querySelector('#generate-qr-secondary'),
  saveQrSecondary: document.querySelector('#save-qr-secondary'),
  qrPreview: document.querySelector('#qr-preview'),
  qrPlaceholder: document.querySelector('#qr-placeholder'),
  qrUrl: document.querySelector('#qr-url'),
  toast: document.querySelector('#toast')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove('visible'), 2800);
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function renderImages() {
  elements.images.innerHTML = config.images.map((image, index) => {
    const isDisplay = image.id === config.displayImageId;
    return `
      <div class="editor-card ${isDisplay ? 'display-card' : ''}" data-image-index="${index}">
        <div class="editor-card-header">
          <div>
            <strong>图片 ${index + 1}</strong>
            ${isDisplay ? '<span class="display-badge">当前展示图</span>' : ''}
          </div>
          <div class="card-actions">
            <button class="icon-button" type="button" data-image-action="up" data-index="${index}" aria-label="上移图片">↑</button>
            <button class="icon-button" type="button" data-image-action="down" data-index="${index}" aria-label="下移图片">↓</button>
            <button class="icon-button danger" type="button" data-image-action="delete" data-index="${index}" aria-label="删除图片">×</button>
            <button class="display-button" type="button" data-image-action="setDisplay" data-index="${index}">${isDisplay ? '正在展示' : '设为展示图'}</button>
          </div>
        </div>
        <div class="editor-card-grid">
          <label>图片名称<input type="text" data-image-field="label" data-index="${index}" value="${escapeHtml(image.label)}"></label>
          <label>图片地址<input type="text" data-image-field="url" data-index="${index}" value="${escapeHtml(image.url)}"></label>
          <img class="image-preview wide" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.label)}">
        </div>
      </div>
    `;
  }).join('');
}

function renderFields() {
  elements.fields.innerHTML = config.fields.map((field, index) => {
    const choiceControls = field.type === 'choice' ? `
      <label>选择方式
        <select data-field-property="selection" data-index="${index}">
          <option value="single" ${field.selection !== 'multiple' ? 'selected' : ''}>单选</option>
          <option value="multiple" ${field.selection === 'multiple' ? 'selected' : ''}>多选</option>
        </select>
      </label>
      <label class="wide">选项（每行一个选项）
        <textarea data-field-property="optionsText" data-index="${index}">${escapeHtml((field.options || []).map((option) => option.label).join('\n'))}</textarea>
      </label>
    ` : `
      <label>占位提示<input type="text" data-field-property="placeholder" data-index="${index}" value="${escapeHtml(field.placeholder || '')}"></label>
      <label>最大字数<input type="number" min="20" max="2000" data-field-property="maxLength" data-index="${index}" value="${Number(field.maxLength) || 500}"></label>
    `;

    return `
      <div class="editor-card" data-field-index="${index}">
        <div class="editor-card-header">
          <strong>${field.type === 'choice' ? '选项栏' : '文本栏'} ${index + 1}</strong>
          <div class="card-actions">
            <button class="icon-button" type="button" data-field-action="up" data-index="${index}" aria-label="上移字段">↑</button>
            <button class="icon-button" type="button" data-field-action="down" data-index="${index}" aria-label="下移字段">↓</button>
            <button class="icon-button danger" type="button" data-field-action="delete" data-index="${index}" aria-label="删除字段">×</button>
          </div>
        </div>
        <div class="editor-card-grid">
          <label>栏目标题<input type="text" data-field-property="label" data-index="${index}" value="${escapeHtml(field.label)}"></label>
          <label class="check-label"><input type="checkbox" data-field-property="required" data-index="${index}" ${field.required ? 'checked' : ''}><span>设为必填</span></label>
          ${choiceControls}
        </div>
      </div>
    `;
  }).join('');
}

function syncBasicForm() {
  elements.title.value = config.title;
  elements.description.value = config.description;
  elements.background.value = config.background;
  elements.imageRequired.checked = Boolean(config.imageRequired);
  elements.imageTitle.value = config.sections.image.title;
  elements.imageDescription.value = config.sections.image.description;
  elements.responseTitle.value = config.sections.response.title;
  elements.responseDescription.value = config.sections.response.description;
  elements.submitTitle.value = config.sections.submit.title;
  elements.submitDescription.value = config.sections.submit.description;
}

function moveItem(list, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
}

function collectConfig() {
  config.title = elements.title.value.trim() || '一闪 Moment';
  config.description = elements.description.value.trim() || '把这一瞬间，留给值得的人。';
  config.background = elements.background.value;
  config.imageRequired = elements.imageRequired.checked;
  config.sections = {
    image: { title: elements.imageTitle.value.trim(), description: elements.imageDescription.value.trim() },
    response: { title: elements.responseTitle.value.trim(), description: elements.responseDescription.value.trim() },
    submit: { title: elements.submitTitle.value.trim(), description: elements.submitDescription.value.trim() }
  };

  elements.images.querySelectorAll('[data-image-field]').forEach((input) => {
    const index = Number(input.dataset.index);
    config.images[index][input.dataset.imageField] = input.value.trim();
  });

  elements.fields.querySelectorAll('[data-field-property]').forEach((input) => {
    const index = Number(input.dataset.index);
    const field = config.fields[index];
    const property = input.dataset.fieldProperty;

    if (property === 'required') {
      field.required = input.checked;
    } else if (property === 'maxLength') {
      field.maxLength = Number(input.value) || 500;
    } else if (property === 'selection') {
      field.selection = input.value;
    } else if (property === 'optionsText') {
      const labels = input.value.split('\n').map((label) => label.trim()).filter(Boolean);
      field.options = labels.map((label, optionIndex) => ({
        id: field.options?.[optionIndex]?.id || uniqueId('option'),
        label
      }));
    } else {
      field[property] = input.value.trim();
    }
  });

  return config;
}

async function uploadAdminImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    return;
  }
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    showToast('图片上传失败');
    return;
  }
  const uploaded = await response.json();
  collectConfig();
  config.images.push({
    id: uploaded.id,
    label: file.name.replace(/\.[^.]+$/, ''),
    url: uploaded.url
  });
  if (!config.displayImageId) config.displayImageId = uploaded.id;
  renderImages();
  showToast('图片已添加，可设为展示图');
}

function participantUrl() {
  return new URL('/', window.location.origin).toString();
}

async function makeQrBlob() {
  const url = participantUrl();
  elements.qrUrl.textContent = url;
  const response = await fetch('/api/qr.png?text=' + encodeURIComponent(url));
  if (!response.ok) throw new Error('二维码生成失败');
  return response.blob();
}

async function generateQr() {
  const blob = await makeQrBlob();
  if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
  qrBlobUrl = URL.createObjectURL(blob);
  elements.qrPreview.src = qrBlobUrl;
  elements.qrPreview.hidden = false;
  elements.qrPlaceholder.hidden = true;
  showToast('二维码已生成');
}

async function saveQr() {
  try {
    if (!qrBlobUrl) await generateQr();
    const anchor = document.createElement('a');
    anchor.href = qrBlobUrl;
    anchor.download = 'yishan-moment-qr.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast('二维码已保存');
  } catch (error) {
    showToast(error.message);
  }
}

function bindEvents() {
  elements.addImage.addEventListener('click', () => {
    collectConfig();
    config.images.push({ id: uniqueId('image'), label: '新图片', url: '/presets/plum-window.svg' });
    if (!config.displayImageId) config.displayImageId = config.images.at(-1).id;
    renderImages();
  });

  elements.uploadImage.addEventListener('change', (event) => {
    uploadAdminImage(event.target.files[0]);
    event.target.value = '';
  });

  elements.images.addEventListener('click', (event) => {
    const button = event.target.closest('[data-image-action]');
    if (!button) return;
    collectConfig();
    const index = Number(button.dataset.index);
    const action = button.dataset.imageAction;
    if (action === 'delete') {
      const removed = config.images.splice(index, 1)[0];
      if (removed?.id === config.displayImageId) config.displayImageId = config.images[0]?.id || '';
    }
    if (action === 'up') moveItem(config.images, index, -1);
    if (action === 'down') moveItem(config.images, index, 1);
    if (action === 'setDisplay') {
      config.displayImageId = config.images[index]?.id || config.displayImageId;
      showToast('展示图片已更新');
    }
    renderImages();
  });

  elements.addTextField.addEventListener('click', () => {
    collectConfig();
    config.fields.push({
      id: uniqueId('text'),
      type: 'text',
      label: '新的文本栏',
      placeholder: '写下你想说的话',
      required: false,
      maxLength: 500
    });
    renderFields();
  });

  elements.addChoiceField.addEventListener('click', () => {
    collectConfig();
    config.fields.push({
      id: uniqueId('choice'),
      type: 'choice',
      label: '新的选项栏',
      required: false,
      selection: 'single',
      options: [
        { id: uniqueId('option'), label: '选项一' },
        { id: uniqueId('option'), label: '选项二' }
      ]
    });
    renderFields();
  });

  elements.fields.addEventListener('click', (event) => {
    const button = event.target.closest('[data-field-action]');
    if (!button) return;
    collectConfig();
    const index = Number(button.dataset.index);
    if (button.dataset.fieldAction === 'delete') config.fields.splice(index, 1);
    if (button.dataset.fieldAction === 'up') moveItem(config.fields, index, -1);
    if (button.dataset.fieldAction === 'down') moveItem(config.fields, index, 1);
    renderFields();
  });

  [elements.generateQr, elements.generateQrSecondary].forEach((button) => {
    button.addEventListener('click', () => generateQr().catch((error) => showToast(error.message)));
  });

  [elements.saveQr, elements.saveQrSecondary].forEach((button) => {
    button.addEventListener('click', saveQr);
  });

  elements.save.addEventListener('click', async () => {
    const payload = collectConfig();
    elements.save.disabled = true;
    elements.save.textContent = '正在保存…';
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('配置保存失败');
      config = await response.json();
      syncBasicForm();
      renderImages();
      renderFields();
      showToast('配置已保存');
    } catch (error) {
      showToast(error.message);
    } finally {
      elements.save.disabled = false;
      elements.save.textContent = '保存配置';
    }
  });
}

async function init() {
  const response = await fetch('/api/config');
  if (!response.ok) {
    showToast('无法读取页面配置');
    return;
  }
  config = await response.json();
  syncBasicForm();
  renderImages();
  renderFields();
  bindEvents();
  elements.qrUrl.textContent = participantUrl();
}

init();

