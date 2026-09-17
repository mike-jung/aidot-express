'use strict';
const api = window.initialPassword;
const field = document.getElementById('password');
const status = document.getElementById('status');
const copy = document.getElementById('copy');
const generate = document.getElementById('generate');
const next = document.getElementById('continue');
let ready = false, uncertain = false;
function message(text, kind = '') { status.textContent = text; status.className = kind; }
function busy(value) {
  copy.disabled = value || !ready;
  generate.disabled = value || !ready || uncertain;
  next.disabled = value;
  document.getElementById('generate-label').textContent = value ? '생성 중…' : '임의 생성';
}
function display(credential) {
  document.getElementById('username').textContent = credential.username;
  field.value = credential.password;
}
copy.addEventListener('click', async () => {
  try {
    const result = await api.copy();
    message(result.ok ? '비밀번호를 복사했습니다.' : result.message, result.ok ? 'success' : 'error');
  } catch { message('복사하지 못했습니다. 비밀번호를 선택해 Ctrl+C로 복사해 주세요.', 'error'); }
});
generate.addEventListener('click', async () => {
  busy(true);
  message('새 비밀번호를 생성하고 적용하고 있습니다.');
  try {
    const result = await api.generate();
    if (result.credential) display(result.credential);
    uncertain = !!result.uncertain;
    message(result.ok ? '새 비밀번호가 적용되었습니다. 창을 닫기 전에 복사해 주세요.' : result.message, result.ok ? 'success' : 'error');
  } catch { message('생성하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error'); }
  finally { busy(false); }
});
next.addEventListener('click', async () => {
  try { await api.continue(); } catch { message('창을 닫은 후 로그인해 주세요.', 'error'); }
});
(async () => {
  try {
    display(await api.read()); ready = true; busy(false);
    message('임의 생성을 누르면 로그인 비밀번호도 함께 변경됩니다.');
    copy.focus();
  } catch { message('로그인 정보를 불러오지 못했습니다. 앱을 다시 실행해 주세요.', 'error'); }
})();
