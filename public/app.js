'use strict';

const state = {
  config: null,
  answers: {},
  background: 'pink-plum'
};

const elements = {
  displayImage: document.querySelector('#display-image'),
  displayImageFrame: document.querySelector('#display-image-frame'),
  fields: document.querySelector('#fields-container'),
  submit: document.querySelector('#submit-button'),
  toast: document.querySelector('#toast'),
  title: document.querySelector('h1'),
  description: document.querySelector('#page-description'),
  imageTitle: document.querySelector('#image-title'),
  imageDescription: document.querySelector('#image-description'),
  responseTitle: document.querySelector('#response-title'),
  responseDescription: document.querySelector('#response-description'),
  submitTitle: document.querySelector('#submit-title'),
  submitDescription: document.querySelector('#submit-description')
};

function showToast(message, duration = 2800) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove('visible'), duration);
}

function safeText(value) {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
}

function renderDisplayImage() {
  const image = state.config.images.find((item) => item.id === state.config.displayImageId) || state.config.images[0];
  if (!image) {
    elements.displayImage.removeAttribute('src');
    elements.displayImage.hidden = true;
    elements.displayImageFrame.classList.add('empty');
    return;
  }

  elements.displayImage.src = image.url;
  elements.displayImage.alt = image.label || '展示图片';
  elements.displayImage.hidden = false;
  elements.displayImageFrame.classList.remove('empty');
}

function renderText(field) {
  const required = field.required ? '<span class="required-mark">*</span>' : '';
  return `
    <div class="field-block" data-field-id="${safeText(field.id)}">
      <div class="field-label-row">
        <label for="field-${safeText(field.id)}">${safeText(field.label)}${required}</label>
        <span class="field-hint">${field.required ? '必填' : '选填'}${field.maxLength ? ` · 最多 ${field.maxLength} 字` : ''}</span>
      </div>
      <textarea
        class="text-input"
        id="field-${safeText(field.id)}"
        data-field-type="text"
        maxlength="${Number(field.maxLength) || 500}"
        placeholder="${safeText(field.placeholder || '写下你想说的话')}"
        aria-label="${safeText(field.label)}"
      ></textarea>
    </div>
  `;
}

function renderChoice(field) {
  const required = field.required ? '<span class="required-mark">*</span>' : '';
  return `
    <div class="field-block" data-field-id="${safeText(field.id)}">
      <div class="field-label-row">
        <span class="field-label">${safeText(field.label)}${required}</span>
        <span class="field-hint">${field.selection === 'multiple' ? '可多选' : '单选'} · ${field.required ? '必填' : '选填'}</span>
      </div>
      <div class="choice-grid" role="${field.selection === 'multiple' ? 'group' : 'radiogroup'}" aria-label="${safeText(field.label)}">
        ${(field.options || []).map((option) => `
          <button
            class="choice-option"
            type="button"
            data-field-id="${safeText(field.id)}"
            data-option-id="${safeText(option.id)}"
            data-selection="${safeText(field.selection)}"
            role="${field.selection === 'multiple' ? 'checkbox' : 'radio'}"
            aria-checked="false"
          >${safeText(option.label)}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderFields() {
  elements.fields.innerHTML = state.config.fields.map((field) => {
    if (field.type === 'text') return renderText(field);
    if (field.type === 'choice') return renderChoice(field);
    return '';
  }).join('');
}

function collectAnswers() {
  const answers = {};
  state.config.fields.forEach((field) => {
    if (field.type === 'text') {
      const input = document.querySelector(`#field-${CSS.escape(field.id)}`);
      answers[field.id] = input ? input.value.trim() : '';
    } else if (field.type === 'choice') {
      const selected = [...document.querySelectorAll(`.choice-option[data-field-id="${CSS.escape(field.id)}"].selected`)];
      const values = selected.map((button) => button.dataset.optionId);
      answers[field.id] = field.selection === 'multiple' ? values : (values[0] || '');
    }
  });
  return answers;
}

function renderParticipant() {
  elements.title.textContent = state.config.title;
  elements.description.textContent = state.config.description;
  elements.imageTitle.textContent = state.config.sections.image.title;
  elements.imageDescription.textContent = state.config.sections.image.description;
  elements.responseTitle.textContent = state.config.sections.response.title;
  elements.responseDescription.textContent = state.config.sections.response.description;
  elements.submitTitle.textContent = state.config.sections.submit.title;
  elements.submitDescription.textContent = state.config.sections.submit.description;
  state.background = state.config.background || 'pink-plum';
  renderDisplayImage();
  renderFields();
}

async function loadConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('无法读取页面配置');
  state.config = await response.json();
  renderParticipant();
}

function bindEvents() {
  elements.fields.addEventListener('click', (event) => {
    const button = event.target.closest('.choice-option');
    if (!button) return;
    const field = state.config.fields.find((item) => item.id === button.dataset.fieldId);
    if (!field) return;

    if (field.selection === 'multiple') {
      button.classList.toggle('selected');
      button.setAttribute('aria-checked', String(button.classList.contains('selected')));
      return;
    }

    document.querySelectorAll(`.choice-option[data-field-id="${CSS.escape(field.id)}"]`).forEach((option) => {
      option.classList.remove('selected');
      option.setAttribute('aria-checked', 'false');
    });
    button.classList.add('selected');
    button.setAttribute('aria-checked', 'true');
  });

  elements.submit.addEventListener('click', async () => {
    const payload = {
      background: state.background,
      answers: collectAnswers()
    };

    elements.submit.disabled = true;
    elements.submit.querySelector('span').textContent = '正在提交…';

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        const firstError = result.errors?.[0]?.message || result.error || '提交失败';
        throw new Error(firstError);
      }
      showToast('已收到你的心意，这一刻已经被好好收下。', 4200);
    } catch (error) {
      showToast(error.message);
    } finally {
      elements.submit.disabled = false;
      elements.submit.querySelector('span').textContent = '提交这一刻';
    }
  });
}

async function init() {
  bindEvents();
  try {
    await loadConfig();
    window.yishanBackground = window.YishanBackgrounds.initBackground(document.querySelector('#liquid-background'), state.background);
  } catch (error) {
    window.yishanBackground = window.YishanBackgrounds.initBackground(document.querySelector('#liquid-background'), state.background);
    showToast(error.message, 5000);
  }
}

init();




