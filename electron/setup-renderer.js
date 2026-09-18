const $ = (id) => document.getElementById(id);
const msg = (text, kind = '') => { $('msg').textContent = text; $('msg').className = kind; };
let busy = false;
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button, input, select').forEach(el => { el.disabled = value; });
}
function syncType() {
  const sqlite = $('type').value === 'sqlite';
  document.querySelectorAll('.db').forEach(el => { el.style.display = sqlite ? 'none' : ''; });
  document.querySelectorAll('.sqlite').forEach(el => { el.style.display = sqlite ? '' : 'none'; });
  document.querySelectorAll('.oracle').forEach(el => { el.style.display = $('type').value === 'oracle' ? '' : 'none'; });
}
function collect() {
  return Object.fromEntries(['type', 'host', 'port', 'user', 'password', 'database', 'dbfile', 'service', 'serverPort']
    .map(key => [key, $(key === 'serverPort' ? 'srvport' : key).value]));
}
async function run(save) {
  if (busy) return;
  setBusy(true);
  msg(save ? '연결 확인 후 설정을 적용합니다…' : '연결 확인 중…');
  try {
    const result = await (save ? window.setup.save(collect()) : window.setup.testDb(collect()));
    if (!result.ok) msg(result.message || '연결하지 못했습니다.', 'bad');
    else msg(save ? '저장했습니다. 서버를 시작합니다…' : `연결됐습니다. ${result.version || ''}`, 'ok');
  } catch (error) { msg(error.message || '설정을 적용하지 못했습니다.', 'bad'); }
  finally { setBusy(false); }
}
$('type').addEventListener('change', syncType);
$('srvport').addEventListener('input', () => { $('portEcho').textContent = $('srvport').value; });
$('test').addEventListener('click', () => run(false));
$('save').addEventListener('click', () => run(true));
$('later').addEventListener('click', () => { if (!busy) window.setup.skip(); });
setBusy(true);
window.setup.read().then(({ config, recovery }) => {
  for (const [key, value] of Object.entries(config)) {
    const el = $(key === 'serverPort' ? 'srvport' : key);
    if (el) el.value = value;
  }
  $('portEcho').textContent = config.serverPort;
  if (recovery) {
    $('heading').textContent = 'DB 연결 설정';
    $('subtitle').textContent = '접속 정보를 수정하세요. 연결 확인에 성공하면 저장하고 앱을 다시 시작합니다.';
    $('server-settings').hidden = true;
    $('save').textContent = '저장하고 다시 시작';
    $('later').textContent = '취소';
  }
  syncType();
  setBusy(false);
}).catch(error => { msg(error.message, 'bad'); $('later').disabled = false; busy = false; });
