<script setup>
import { confirmDelete } from '../composables/useConfirm';
import { notifyError, notifySuccess } from '../composables/useNotify';
import { ref, reactive, onMounted } from 'vue';
// ★ v1.10.8 — 다국어
import { useI18n } from '../composables/useI18n';

import { useFormat } from '../composables/useFormat';
const fmt = useFormat();
import http from '../api/http';
import { useAuthStore } from '../stores/auth';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const auth = useAuthStore();
const rows = ref([]);
const header = ref({ total: 0, page: 1, perPage: 20, totalPages: 1 });
const page = ref(1);
const perPage = ref(20);
const loading = ref(false);
const error = ref(null);

// 추가/편집 대화상자
const editor = reactive({ open: false, mode: 'create', id: null,
  form: { name: '', username: '', email: '', role: 'admin', status: 'active', password: '' },
  saving: false, error: null });

// 비밀번호 재설정 대화상자 (관리자)
const pwdReset = reactive({ open: false, id: null, username: '', newPassword: '', saving: false, error: null });

// 내 비밀번호 변경 대화상자
const myPwd = reactive({ open: false, currentPassword: '', newPassword: '', newPasswordConfirm: '',
  saving: false, error: null, message: null });

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/users/paged', {
      params: { page: page.value, perPage: perPage.value },
    });
    const d = r.data?.data || r.data || {};
    rows.value = d.rows || [];
    header.value = d.header || header.value;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally { loading.value = false; }
}

function goPage(p) {
  if (p < 1 || p > header.value.totalPages) return;
  page.value = p;
  load();
}

function openCreate() {
  editor.mode = 'create';
  editor.id = null;
  editor.form = { name: '', username: '', email: '', role: 'admin', status: 'active', password: '' };
  editor.error = null;
  editor.open = true;
}

async function openEdit(row) {
  editor.mode = 'edit';
  editor.id = row.id;
  editor.form = {
    name: row.name, username: row.username, email: row.email,
    role: row.role, status: row.status, password: '',
  };
  editor.error = null;
  editor.open = true;
}

function closeEditor() { editor.open = false; }

async function saveEditor() {
  editor.saving = true;
  editor.error = null;
  try {
    if (editor.mode === 'create') {
      await http.post('/api/admin/users', editor.form);
    } else {
      const { name, email, role, status } = editor.form;
      await http.put(`/api/admin/users/${editor.id}`, { name, email, role, status });
    }
    editor.open = false;
    await load();
  } catch (e) {
    editor.error = e.response?.data?.message || e.message;
  } finally { editor.saving = false; }
}

async function removeRow(row) {
  if (!await confirmDelete(row.username, { title: t('userList.k16'), detail: '이 계정의 세션도 모두 종료됩니다.', requireText: row.username })) return;
  try {
    await http.delete(`/api/admin/users/${row.id}`);
    await load();
  } catch (e) {
    notifyError('삭제 실패', e);
  }
}

async function unlockRow(row) {
  try {
    await http.post(`/api/admin/users/${row.id}/unlock`);
    await load();
  } catch (e) {
    notifyError('잠금 해제 실패', e);
  }
}

function openPwdReset(row) {
  pwdReset.id = row.id;
  pwdReset.username = row.username;
  pwdReset.newPassword = '';
  pwdReset.error = null;
  pwdReset.open = true;
}
async function savePwdReset() {
  pwdReset.saving = true;
  pwdReset.error = null;
  try {
    await http.put(`/api/admin/users/${pwdReset.id}/password`, { newPassword: pwdReset.newPassword });
    pwdReset.open = false;
    notifySuccess('비밀번호를 재설정했습니다');
  } catch (e) {
    pwdReset.error = e.response?.data?.message || e.message;
  } finally { pwdReset.saving = false; }
}

function openMyPwd() {
  myPwd.currentPassword = '';
  myPwd.newPassword = '';
  myPwd.newPasswordConfirm = '';
  myPwd.error = null;
  myPwd.message = null;
  myPwd.open = true;
}
async function saveMyPwd() {
  myPwd.saving = true;
  myPwd.error = null;
  myPwd.message = null;
  if (myPwd.newPassword !== myPwd.newPasswordConfirm) {
    myPwd.error = '새 비밀번호가 일치하지 않습니다.';
    myPwd.saving = false;
    return;
  }
  try {
    await http.put('/api/admin/users/me/password', {
      currentPassword: myPwd.currentPassword,
      newPassword: myPwd.newPassword,
    });
    myPwd.message= t('userList.k17');
    if (auth.user) auth.user.mustChangePassword = false;   // 상단 '초기 비밀번호' 배너 해제
    myPwd.currentPassword = '';
    myPwd.newPassword = '';
    myPwd.newPasswordConfirm = '';
  } catch (e) {
    myPwd.error = e.response?.data?.message || e.message;
  } finally { myPwd.saving = false; }
}

function fmtTs(v) {
  if (!v) return '-';
  try { return fmt.dateTime(v); } catch { return v; }
}
function badgeForStatus(s) {
  return s === 'active' ? 'bg-success' : s === 'locked' ? 'bg-danger' : 'bg-secondary';
}
function isLocked(row) {
  return row.locked_until && new Date(row.locked_until) > new Date();
}

onMounted(load);
</script>

<template>
  <div class="user-list-page">
    <div class="d-flex align-items-center mb-3 flex-wrap gap-2">
      <h4 class="mb-0"><i class="bi bi-people-fill text-primary me-2"></i>{{ t('users.title') }}</h4>
      <div class="ms-auto d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="openMyPwd">
          <i class="bi bi-key me-1"></i>{{ t('users.changeMyPassword') }}
        </button>
        <button class="btn btn-sm btn-primary" @click="openCreate">
          <i class="bi bi-plus-lg me-1"></i>{{ t('users.addUser') }}
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger small">{{ error }}</div>

    <div class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th style="width: 60px;">ID</th>
              <th>{{ t('userList.k1') }}</th>
              <th>Username</th>
              <th>Email</th>
              <th style="width: 80px;">Role</th>
              <th style="width: 100px;">Status</th>
              <th style="width: 150px;">{{ t('users.colLastLogin') }}</th>
              <th style="width: 220px;" class="text-end">{{ t('users.colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="text-center text-secondary py-4">
              <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
            </td></tr>
            <tr v-else-if="!rows.length"><td colspan="8" class="text-center text-secondary py-4">
              {{ t('users.empty') }}
            </td></tr>
            <tr v-for="r in rows" :key="r.id">
              <td class="text-muted">{{ r.id }}</td>
              <td>{{ r.name }}</td>
              <td><code>{{ r.username }}</code></td>
              <td class="small">{{ r.email }}</td>
              <td><span class="badge bg-primary-subtle text-primary">{{ r.role }}</span></td>
              <td>
                <span class="badge" :class="badgeForStatus(r.status)">{{ r.status }}</span>
                <span v-if="isLocked(r)" class="badge bg-warning text-dark ms-1" :title="'~' + fmtTs(r.locked_until)">{{ t('users.locked') }}</span>
              </td>
              <td class="small text-secondary">{{ fmtTs(r.last_login_at) }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="openEdit(r)" :title="t('userList.k9')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="openPwdReset(r)" :title="t('userList.k10')">
                  <i class="bi bi-key"></i>
                </button>
                <button v-if="isLocked(r)" class="btn btn-sm btn-outline-warning me-1" @click="unlockRow(r)" :title="t('userList.k11')">
                  <i class="bi bi-unlock"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="removeRow(r)" :title="t('userList.k12')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <nav v-if="header.totalPages > 1" class="mt-3 d-flex justify-content-center">
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item" :class="{ disabled: page <= 1 }">
          <button class="page-link" @click="goPage(page - 1)">{{ t('users.prev') }}</button>
        </li>
        <li v-for="p in header.totalPages" :key="p" class="page-item" :class="{ active: p === page }">
          <button class="page-link" @click="goPage(p)">{{ p }}</button>
        </li>
        <li class="page-item" :class="{ disabled: page >= header.totalPages }">
          <button class="page-link" @click="goPage(page + 1)">{{ t('users.next') }}</button>
        </li>
      </ul>
    </nav>
    <div v-if="header.totalPages > 1" class="text-center small text-secondary mt-2">
      전체 {{ header.total }}명 · 페이지 {{ page }} / {{ header.totalPages }}
    </div>

    <!-- 추가/편집 대화상자 -->
    <div v-if="editor.open" class="modal-backdrop fade show" @click="closeEditor"></div>
    <div v-if="editor.open" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi" :class="editor.mode === 'create' ? 'bi-person-plus' : 'bi-person-gear'"></i>
              {{ editor.mode === 'create' ? t('userList.k14') : t('userList.k15') }}
            </h5>
            <button type="button" class="btn-close" @click="closeEditor"></button>
          </div>
          <div class="modal-body">
            <div v-if="editor.error" class="alert alert-danger small">{{ editor.error }}</div>
            <div class="mb-2">
              <label class="form-label small">{{ t('users.nameRequired') }}</label>
              <input v-model="editor.form.name" type="text" class="form-control" required />
            </div>
            <div class="mb-2">
              <label class="form-label small">Username *</label>
              <input v-model="editor.form.username" type="text" class="form-control"
                     :disabled="editor.mode === 'edit'" required />
              <div v-if="editor.mode === 'edit'" class="form-text small">{{ t('users.usernameFixed') }}</div>
            </div>
            <div class="mb-2">
              <label class="form-label small">Email *</label>
              <input v-model="editor.form.email" type="email" class="form-control" required />
            </div>
            <div class="mb-2" v-if="editor.mode === 'create'">
              <label class="form-label small">{{ t('users.initialPassword') }}</label>
              <input v-model="editor.form.password" type="password" class="form-control" autocomplete="new-password"
                     :placeholder="t('userList.k13')" required />
              <!-- ★ v1.11.8 — 만들 때도 바꿀 때와 같은 규칙. 이 비밀번호는 본인이 첫 로그인에 바꾸게 된다 -->
              <div class="form-text small">{{ t('users.passwordPolicyHint') }}</div>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label small">Role</label>
                <select v-model="editor.form.role" class="form-select">
                  <option value="admin">admin</option>
                  <option value="user">user</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small">Status</label>
                <select v-model="editor.form.status" class="form-select">
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-sm" @click="closeEditor">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary btn-sm" @click="saveEditor" :disabled="editor.saving">
              <span v-if="editor.saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 비밀번호 재설정 (관리자) -->
    <div v-if="pwdReset.open" class="modal-backdrop fade show" @click="pwdReset.open = false"></div>
    <div v-if="pwdReset.open" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-key me-1"></i>{{ t('users.resetPassword') }}</h5>
            <button type="button" class="btn-close" @click="pwdReset.open = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="pwdReset.error" class="alert alert-danger small">{{ pwdReset.error }}</div>
            <p class="small"><code>{{ pwdReset.username }}</code> {{ t('userList.k2') }}</p>
            <input v-model="pwdReset.newPassword" type="password" class="form-control"
                   :placeholder="t('userList.k13')" autocomplete="new-password" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-sm" @click="pwdReset.open = false">{{ t('userList.k3') }}</button>
            <button class="btn btn-primary btn-sm" @click="savePwdReset" :disabled="pwdReset.saving">
              {{ t('users.reset') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 내 비밀번호 변경 -->
    <div v-if="myPwd.open" class="modal-backdrop fade show" @click="myPwd.open = false"></div>
    <div v-if="myPwd.open" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-key-fill me-1"></i>{{ t('userList.k4') }}</h5>
            <button type="button" class="btn-close" @click="myPwd.open = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="myPwd.error" class="alert alert-danger small">{{ myPwd.error }}</div>
            <div v-if="myPwd.message" class="alert alert-success small">{{ myPwd.message }}</div>
            <div class="mb-2">
              <label class="form-label small">{{ t('users.currentPassword') }}</label>
              <input v-model="myPwd.currentPassword" type="password" class="form-control" autocomplete="current-password" />
            </div>
            <div class="mb-2">
              <label class="form-label small">{{ t('userList.k5') }}</label>
              <input v-model="myPwd.newPassword" type="password" class="form-control" autocomplete="new-password" />
            </div>
            <div class="mb-2">
              <label class="form-label small">{{ t('userList.k6') }}</label>
              <input v-model="myPwd.newPasswordConfirm" type="password" class="form-control" autocomplete="new-password" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary btn-sm" @click="myPwd.open = false">{{ t('userList.k7') }}</button>
            <button class="btn btn-primary btn-sm" @click="saveMyPwd" :disabled="myPwd.saving">
              {{ t('userList.k8') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal.d-block { z-index: 1055; }
.modal-backdrop.show { opacity: 0.5; }
.user-list-page { padding-bottom: 24px; }
</style>
