'use strict';

function validateSubmission(payload, config) {
  const errors = [];
  const answers = payload && payload.answers && typeof payload.answers === 'object' ? payload.answers : {};

  const hasConfiguredImage = (config.images || []).some((image) => image.id === config.displayImageId);
  if (config.imageRequired && !hasConfiguredImage && !payload.imageId && !payload.uploadId) {
    errors.push({ fieldId: 'image', message: '请选择或上传一张图片' });
  }

  for (const field of config.fields || []) {
    const raw = answers[field.id];
    if (field.type === 'text') {
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (field.required && !value) {
        errors.push({ fieldId: field.id, message: `${field.label}不能为空` });
      }
      continue;
    }

    if (field.type === 'choice') {
      const values = field.selection === 'multiple'
        ? (Array.isArray(raw) ? raw : [])
        : (typeof raw === 'string' && raw ? [raw] : []);

      if (field.selection === 'multiple' && raw !== undefined && !Array.isArray(raw)) {
        errors.push({ fieldId: field.id, message: `${field.label}的选项格式不正确` });
      }

      const allowed = new Set((field.options || []).map((option) => option.id));

      if (field.required && values.length === 0) {
        errors.push({ fieldId: field.id, message: `请选择${field.label}` });
      }
      if (values.some((value) => !allowed.has(value))) {
        errors.push({ fieldId: field.id, message: `${field.label}包含无效选项` });
      }
      if (field.selection !== 'multiple' && values.length > 1) {
        errors.push({ fieldId: field.id, message: `${field.label}只能选择一个选项` });
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateSubmission };

