<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import http from '../api/http';
import { useI18n } from '../composables/useI18n';
const { t } = useI18n();
const state = ref(null);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const reveal = ref(false);
const replacePassphrase = ref(false);
const desktop = ref(null);
const form = reactive({ enabled: false, keyFile: '', certFile: '', caFile: '', serverName: '', passphrase: '' });
const hosts = ref([...new Set(['localhost', '127.0.0.1', '::1', window.location.hostname.replace(/^\[|\]$/g, '')])].join(','));
const days = ref(90);
const currentOrigin = window.location.origin;
const nextUrl = computed(() => {
  const url = new URL(window.location.origin);
  url.protocol = form.enabled ? 'https:' : 'http:';
  url.port = String(state.value?.active.port || url.port);
  return url.origin;
});
function showError(e) { error.value = e.response?.data?.message || e.message; }
function assign(data) {
  state.value = data;
  Object.assign(form, data.configured, { passphrase: '' });
  replacePassphrase.value = false;
}
async function load() {
  busy.value = true; error.value = '';
  try { assign((await http.get('/api/admin/config/https')).data.data); }
  catch (e) { showError(e); }
  finally { busy.value = false; }
}
onMounted(async () => {
  await load();
  try { desktop.value = await window.electronApp?.getInfo(); } catch {}
});
async function generate() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const data = (await http.post('/api/admin/config/https/certificate', { hosts: hosts.value, days: Number(days.value) }, { timeout: 60000 })).data.data;
    Object.assign(form, data.settings, { passphrase: '' });
    replacePassphrase.value = true;
    notice.value = t('httpsSettings.generated');
  } catch (e) { showError(e); }
  finally { busy.value = false; }
}
async function save() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const { passphrase, hasPassphrase, ...values } = form;
    if (replacePassphrase.value) values.passphrase = passphrase;
    assign((await http.put('/api/admin/config/https', values)).data.data);
    notice.value = t('httpsSettings.saved');
  } catch (e) { showError(e); }
  finally { busy.value = false; }
}
async function downloadCa() {
  error.value = '';
  try {
    const data = (await http.get('/api/admin/config/https/ca')).data.data;
    const url = URL.createObjectURL(new Blob([data.pem], { type: 'application/x-pem-file' }));
    const a = document.createElement('a'); a.href = url; a.download = 'aidot-private-ca.crt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { showError(e); }
}
async function restartApp() {
  error.value = '';
  try { await window.electronApp.restartApplication(); } catch (e) { showError(e); }
}
</script>

<template>
  <section class="https-settings" aria-labelledby="https-title">
    <h6 id="https-title">{{ t('httpsSettings.title') }}</h6>
    <p class="small text-secondary">{{ t('httpsSettings.description') }}</p>
    <p class="small mb-3"><span class="badge me-2" :class="currentOrigin.startsWith('https:') ? 'bg-success' : 'bg-secondary'">{{ currentOrigin.startsWith('https:') ? 'HTTPS' : 'HTTP' }}</span><code>{{ currentOrigin }}</code></p>
    <div v-if="error || state?.validationError" class="alert alert-danger py-2 small" role="alert">{{ error || state.validationError }}</div>
    <div v-if="notice" class="alert alert-success py-2 small" role="status">{{ notice }}</div>
    <div v-if="state?.restartRequired" class="alert alert-warning py-2 small">
      <p class="mb-2">{{ t('httpsSettings.restartRequired') }}</p>
      <code>{{ nextUrl }}</code>
      <button v-if="desktop && !desktop.serverExternal" class="btn btn-sm btn-outline-dark d-block mt-2" :disabled="busy" @click="restartApp">{{ t('httpsSettings.restartApp') }}</button>
    </div>
    <form v-if="state" @submit.prevent="save">
      <fieldset :disabled="busy">
        <div class="form-check form-switch mb-3">
          <input id="https-enabled" v-model="form.enabled" type="checkbox" class="form-check-input">
          <label for="https-enabled" class="form-check-label">{{ t('httpsSettings.enable') }}</label>
        </div>
        <div v-for="field in ['keyFile', 'certFile', 'caFile', 'serverName']" :key="field" class="mb-2">
          <label :for="`https-${field}`" class="form-label small mb-1">{{ t(`httpsSettings.${field}`) }}</label>
          <input :id="`https-${field}`" v-model="form[field]" type="text" class="form-control form-control-sm font-monospace" :required="form.enabled && ['keyFile', 'certFile'].includes(field)" autocomplete="off" spellcheck="false">
        </div>
        <p class="small text-secondary text-break">{{ t('httpsSettings.paths') }} <code>{{ state.envFile }}</code></p>
        <div class="form-check mb-2">
          <input id="https-passphrase-replace" v-model="replacePassphrase" type="checkbox" class="form-check-input">
          <label for="https-passphrase-replace" class="form-check-label small">{{ t('httpsSettings.replacePassphrase') }} <span v-if="state.configured.hasPassphrase">({{ t('httpsSettings.passphraseSet') }})</span></label>
        </div>
        <div v-if="replacePassphrase" class="input-group input-group-sm mb-3">
          <input id="https-passphrase" v-model="form.passphrase" :type="reveal ? 'text' : 'password'" class="form-control" :aria-label="t('httpsSettings.passphrase')" autocomplete="new-password">
          <button type="button" class="btn btn-outline-secondary" :aria-label="t('httpsSettings.showPassphrase')" :aria-pressed="reveal" @click="reveal = !reveal"><i class="bi" :class="reveal ? 'bi-eye-slash' : 'bi-eye'"></i></button>
        </div>
        <div class="d-flex gap-2 mb-4">
          <button type="submit" class="btn btn-primary btn-sm">{{ t('httpsSettings.save') }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="load">{{ t('httpsSettings.reload') }}</button>
          <button v-if="state.configured.caFile" type="button" class="btn btn-outline-secondary btn-sm" @click="downloadCa">{{ t('httpsSettings.downloadCa') }}</button>
        </div>
      </fieldset>
    </form>
    <details v-if="state" class="border rounded p-3 mb-3">
      <summary class="small fw-semibold">{{ t('httpsSettings.generateTitle') }}</summary>
      <p class="small text-secondary mt-2">{{ t('httpsSettings.generateHelp') }}</p>
      <label for="https-hosts" class="form-label small">{{ t('httpsSettings.hosts') }}</label>
      <input id="https-hosts" v-model="hosts" class="form-control form-control-sm mb-2" :disabled="busy" spellcheck="false">
      <label for="https-days" class="form-label small">{{ t('httpsSettings.days') }}</label>
      <input id="https-days" v-model="days" type="number" min="1" max="365" class="form-control form-control-sm mb-2" :disabled="busy">
      <button class="btn btn-outline-primary btn-sm" :disabled="busy" @click="generate"><span v-if="busy" class="spinner-border spinner-border-sm me-1"></span>{{ t('httpsSettings.generate') }}</button>
      <p class="small text-secondary mt-2 mb-0">{{ t('httpsSettings.trust') }}</p>
    </details>
    <dl v-if="state?.active.certificate" class="small text-break">
      <dt>{{ t('httpsSettings.activeCertificate') }}</dt><dd>{{ state.active.certificate.subjectAltName }}</dd>
      <dt>{{ t('httpsSettings.validTo') }}</dt><dd>{{ state.active.certificate.validTo }}</dd>
      <dt>SHA-256</dt><dd><code>{{ state.active.certificate.fingerprint256 }}</code></dd>
    </dl>
    <p class="small text-secondary mb-0">{{ t('httpsSettings.production') }}</p>
  </section>
</template>
