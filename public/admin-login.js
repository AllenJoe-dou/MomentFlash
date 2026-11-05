'use strict';

const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');

function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next') || '/admin';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: document.querySelector('#username').value,
      password: document.querySelector('#password').value
    })
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    error.textContent = result.error || '登录失败';
    error.hidden = false;
    return;
  }

  window.location.href = safeNext();
});
