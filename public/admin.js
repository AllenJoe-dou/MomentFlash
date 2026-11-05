'use strict';

const state = {
  config: null,
  submissions: [],
  query: ''
};

const elements = {
  count: document.querySelector('#submission-count'),
  todayCount: document.querySelector('#today-count'),
  imageCount: document.querySelector('#image-count'),
  search: document.querySelector('#search-input'),
  body: document.querySelector('#submission-body'),
  empty: document.querySelector('#empty-state'),
  refresh: document.querySelector('#refresh-button'),
  exportButton: document.querySelector('#export-button')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function answerText(field, value) {
  if (field.type === 'text') return String(value || '').trim();
  const values = Array.isArray(value) ? value : (value ? [value] : []);
  return values.map((id) => field.options?.find((option) => option.id === id)?.label || id).join(' / ');
}

function answerLines(submission) {
  return state.config.fields.map((field) => `${field.label}：${answerText(field, submission.answers?.[field.id]) || '未填写'}`);
}

function matchesQuery(submission) {
  if (!state.query) return true;
  const haystack = [
    submission.image?.label,
    submission.image?.url,
    submission.background,
    ...answerLines(submission)
  ].join(' ').toLowerCase();
  return haystack.includes(state.query.toLowerCase());
}

function updateStats() {
  const today = new Date().toISOString().slice(0, 10);
  elements.count.textContent = String(state.submissions.length);
  elements.todayCount.textContent = String(state.submissions.filter((item) => item.createdAt?.startsWith(today)).length);
  elements.imageCount.textContent = String(state.submissions.filter((item) => item.image?.kind === 'upload').length);
}

function renderRows() {
  const visible = state.submissions.filter(matchesQuery);
  elements.empty.hidden = visible.length !== 0;
  elements.body.innerHTML = visible.map((submission, index) => {
    const lines = answerLines(submission);
    return `
      <tr>
        <td><strong>${escapeHtml(formatDate(submission.createdAt))}</strong></td>
        <td>
          <img class="submission-thumb" src="${escapeHtml(submission.image?.url || '/presets/plum-window.svg')}" alt="${escapeHtml(submission.image?.label || '提交图片')}">
          <span class="tag">${escapeHtml(submission.image?.kind === 'upload' ? '自定义上传' : '预设图片')}</span>
        </td>
        <td><span class="tag">${escapeHtml(submission.background)}</span></td>
        <td>
          <div class="answer-summary">
            ${lines.slice(0, 3).map((line) => `<span>${escapeHtml(line)}</span>`).join('')}
          </div>
        </td>
        <td><button class="detail-button" type="button" data-detail-index="${index}">展开详情</button></td>
      </tr>
      <tr class="detail-row" id="detail-${index}" hidden>
        <td colspan="5">
          <div class="detail-grid">
            ${state.config.fields.map((field) => `
              <div class="detail-item">
                <strong>${escapeHtml(field.label)}</strong>
                <span>${escapeHtml(answerText(field, submission.answers?.[field.id]) || '未填写')}</span>
              </div>
            `).join('')}
            <div class="detail-item">
              <strong>提交编号</strong>
              <span>${escapeHtml(submission.id)}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadData() {
  const [configResponse, submissionsResponse] = await Promise.all([
    fetch('/api/config'),
    fetch('/api/submissions')
  ]);
  if (!configResponse.ok || !submissionsResponse.ok) throw new Error('无法读取提交记录');
  state.config = await configResponse.json();
  state.submissions = await submissionsResponse.json();
  updateStats();
  renderRows();
}

function bindEvents() {
  elements.search.addEventListener('input', () => {
    state.query = elements.search.value.trim();
    renderRows();
  });

  elements.refresh.addEventListener('click', loadData);

  elements.exportButton.addEventListener('click', () => {
    window.location.href = '/api/submissions/export.csv';
  });

  elements.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-detail-index]');
    if (!button) return;
    const detail = document.querySelector(`#detail-${CSS.escape(button.dataset.detailIndex)}`);
    const isHidden = detail.hidden;
    detail.hidden = !isHidden;
    button.textContent = isHidden ? '收起详情' : '展开详情';
  });
}

bindEvents();
loadData().catch((error) => {
  elements.empty.hidden = false;
  elements.empty.textContent = error.message;
});
