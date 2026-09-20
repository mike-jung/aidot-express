<script setup>
/*
 * 연동 업체 계정 — users.role='vendor' 계정을 콘솔에서 발급·관리한다.
 *
 *  관리자 콘솔 계정(admin_users)과는 테이블부터 분리되어 있고 토큰 realm 도
 *  달라, 여기서 발급한 계정으로는 콘솔 API 를 호출할 수 없다.
 *
 *  문구는 한국어 고정이다. 다국어가 필요해지면 locales 에 키를 추가하고
 *  useI18n 의 t() 로 바꾸면 된다.
 */
import { ref, reactive, onMounted } from 'vue';
import http from '../api/http';
import { confirmDelete } from '../composables/useConfirm';
import { notifyError, notifySuccess } from '../composables/useNotify';
import { useFormat } from '../composables/useFormat';

const fmt = useFormat();

const rows = ref([]);
const header = ref({ total: 0, page: 1, perPage: 20, totalPages: 1 });
const page = ref(1);
const perPage = ref(20);
const loading = ref(false);
const error = ref(null);

const editor = reactive({
  open: false, mode: 'create', id: null, saving: false, error: null,
  form: { name: '', username: '', email: '', password: '', status: 'active', orgText: '' },
});

const pwdReset = reactive({ open: false, id: null, username: '', newPassword: '', saving: false, error: null });

/* ------------------------------------------------------------ 목록 */

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/api-users/paged', {
      params: { page: page.value, perPage: perPage.value },
    });
    const data = r.data?.data ?? {};
    rows.value = data.rows ?? [];
    header.value = {
      total: data.total ?? 0, page: data.page ?? 1,
      perPage: data.perPage ?? 20, totalPages: data.totalPages ?? 1,
    };
  } catch (e) {
    error.value = e?.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

function go(next) {
  if (next < 1 || next > header.value.totalPages) return;
  page.value = next;
  load();
}

onMounted(load);

/* ------------------------------------------------------------ 발급·수정 */

const parseOrgs = text =>
  String(text || '').split(/[\s,]+/).map(s => s.trim()).filter(Boolean);

function openCreate() {
  editor.mode = 'create';
  editor.id = null;
  editor.error = null;
  Object.assign(editor.form, { name: '', username: '', email: '', password: '', status: 'active', orgText: '' });
  editor.open = true;
}

function openEdit(row) {
  editor.mode = 'edit';
  editor.id = row.id;
  editor.error = null;
  Object.assign(editor.form, {
    name: row.name ?? '', username: row.username, email: row.email ?? '',
    password: '', status: row.status, orgText: (row.orgIds ?? []).join(', '),
  });
  editor.open = true;
}

async function save() {
  editor.saving = true;
  editor.error = null;
  try {
    const orgIds = parseOrgs(editor.form.orgText);
    if (editor.mode === 'create') {
      const created = await http.post('/api/admin/api-users', {
        name: editor.form.name || editor.form.username,
        username: editor.form.username,
        email: editor.form.email,
        password: editor.form.password,
        status: editor.form.status,
        orgIds,
      });
      notifySuccess(`업체 계정 '${created.data?.data?.username}' 을(를) 발급했습니다`);
    } else {
      await http.put(`/api/admin/api-users/${editor.id}`, {
        name: editor.form.name, email: editor.form.email, status: editor.form.status,
      });
      await http.put(`/api/admin/api-users/${editor.id}/orgs`, { orgIds });
      notifySuccess('업체 계정을 수정했습니다');
    }
    editor.open = false;
    await load();
  } catch (e) {
    editor.error = e?.response?.data?.message || e.message;
  } finally {
    editor.saving = false;
  }
}

/* ------------------------------------------------------------ 개별 동작 */

function openPasswordReset(row) {
  Object.assign(pwdReset, { open: true, id: row.id, username: row.username, newPassword: '', error: null });
}

async function submitPasswordReset() {
  pwdReset.saving = true;
  pwdReset.error = null;
  try {
    await http.put(`/api/admin/api-users/${pwdReset.id}/password`, { newPassword: pwdReset.newPassword });
    pwdReset.open = false;
    notifySuccess('비밀번호를 재설정했습니다. 기존 토큰은 모두 폐기되었습니다.');
    await load();
  } catch (e) {
    pwdReset.error = e?.response?.data?.message || e.message;
  } finally {
    pwdReset.saving = false;
  }
}

async function revoke(row) {
  if (!await confirmDelete(`'${row.username}' 에게 발급된 토큰을 모두 폐기할까요? 업체 연동이 즉시 끊기고, 재로그인하면 다시 연결됩니다.`)) return;
  try {
    const r = await http.post(`/api/admin/api-users/${row.id}/revoke`);
    notifySuccess(`토큰 ${r.data?.data?.revoked ?? 0}건을 폐기했습니다`);
    await load();
  } catch (e) { notifyError(e?.response?.data?.message || e.message); }
}

async function unlock(row) {
  try {
    await http.post(`/api/admin/api-users/${row.id}/unlock`);
    notifySuccess('잠금을 해제했습니다');
    await load();
  } catch (e) { notifyError(e?.response?.data?.message || e.message); }
}

async function remove(row) {
  if (!await confirmDelete(`업체 계정 '${row.username}' 을(를) 삭제할까요? 기관 권한과 토큰도 함께 지워집니다.`)) return;
  try {
    await http.delete(`/api/admin/api-users/${row.id}`);
    notifySuccess('삭제했습니다');
    await load();
  } catch (e) { notifyError(e?.response?.data?.message || e.message); }
}

const statusLabel = s => ({ active: '사용', locked: '잠김', disabled: '정지' }[s] ?? s);
const statusClass = s => ({ active: 'bg-success', locked: 'bg-warning text-dark', disabled: 'bg-secondary' }[s] ?? 'bg-secondary');
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center mb-3">
      <h5 class="mb-0">연동 업체 계정</h5>
      <span class="text-muted small ms-3">
        외부 시스템이 조회 API 를 호출할 때 쓰는 계정입니다. 관리 콘솔 권한은 없습니다.
      </span>
      <button class="btn btn-primary btn-sm ms-auto" @click="openCreate">업체 계정 발급</button>
    </div>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th style="width:5rem">ID</th>
            <th>아이디</th>
            <th>이름</th>
            <th>상태</th>
            <th>조회 허용 기관</th>
            <th>마지막 로그인</th>
            <th style="width:20rem"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center text-muted py-4">불러오는 중…</td></tr>
          <tr v-else-if="!rows.length"><td colspan="7" class="text-center text-muted py-4">발급된 업체 계정이 없습니다.</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td class="text-muted">{{ row.id }}</td>
            <td><code>{{ row.username }}</code></td>
            <td>{{ row.name }}</td>
            <td><span class="badge" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
            <td>
              <span v-if="!row.orgIds?.length" class="text-danger small">없음 — 조회 불가</span>
              <span v-for="org in row.orgIds" :key="org" class="badge bg-light text-dark border me-1">{{ org }}</span>
            </td>
            <td class="text-muted small">{{ row.last_login_at ? fmt.dateTime(row.last_login_at) : '—' }}</td>
            <td class="text-end">
              <button class="btn btn-outline-secondary btn-sm me-1" @click="openEdit(row)">수정</button>
              <button class="btn btn-outline-secondary btn-sm me-1" @click="openPasswordReset(row)">비밀번호</button>
              <button class="btn btn-outline-warning btn-sm me-1" @click="revoke(row)">토큰 폐기</button>
              <button v-if="row.status === 'locked'" class="btn btn-outline-info btn-sm me-1" @click="unlock(row)">잠금 해제</button>
              <button class="btn btn-outline-danger btn-sm" @click="remove(row)">삭제</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="header.totalPages > 1" class="d-flex justify-content-center">
      <ul class="pagination pagination-sm">
        <li class="page-item" :class="{ disabled: header.page <= 1 }">
          <button class="page-link" @click="go(header.page - 1)">이전</button>
        </li>
        <li class="page-item disabled"><span class="page-link">{{ header.page }} / {{ header.totalPages }}</span></li>
        <li class="page-item" :class="{ disabled: header.page >= header.totalPages }">
          <button class="page-link" @click="go(header.page + 1)">다음</button>
        </li>
      </ul>
    </nav>

    <!-- 발급 / 수정 -->
    <div v-if="editor.open" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">{{ editor.mode === 'create' ? '업체 계정 발급' : '업체 계정 수정' }}</h6>
            <button class="btn-close" @click="editor.open = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="editor.error" class="alert alert-danger py-2">{{ editor.error }}</div>

            <label class="form-label small">아이디</label>
            <input v-model="editor.form.username" class="form-control form-control-sm mb-2"
                   :disabled="editor.mode === 'edit'" placeholder="vendor-a">

            <label class="form-label small">업체명</label>
            <input v-model="editor.form.name" class="form-control form-control-sm mb-2" placeholder="○○메디컬">

            <label class="form-label small">이메일</label>
            <input v-model="editor.form.email" class="form-control form-control-sm mb-2" placeholder="contact@vendor.example">

            <template v-if="editor.mode === 'create'">
              <label class="form-label small">비밀번호 <span class="text-muted">(12자 이상)</span></label>
              <input v-model="editor.form.password" type="text" class="form-control form-control-sm mb-2"
                     placeholder="업체에 안전한 경로로 전달하세요">
            </template>

            <label class="form-label small">상태</label>
            <select v-model="editor.form.status" class="form-select form-select-sm mb-2">
              <option value="active">사용</option>
              <option value="disabled">정지</option>
            </select>

            <label class="form-label small">조회 허용 기관</label>
            <input v-model="editor.form.orgText" class="form-control form-control-sm" placeholder="ORG001, ORG002">
            <div class="form-text">
              쉼표나 공백으로 구분합니다. 여기에 없는 기관은 토큰이 유효해도 조회할 수 없습니다.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" @click="editor.open = false">취소</button>
            <button class="btn btn-primary btn-sm" :disabled="editor.saving" @click="save">
              {{ editor.saving ? '저장 중…' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 비밀번호 재설정 -->
    <div v-if="pwdReset.open" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">비밀번호 재설정 — {{ pwdReset.username }}</h6>
            <button class="btn-close" @click="pwdReset.open = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="pwdReset.error" class="alert alert-danger py-2">{{ pwdReset.error }}</div>
            <input v-model="pwdReset.newPassword" type="text" class="form-control form-control-sm"
                   placeholder="새 비밀번호 (12자 이상)">
            <div class="form-text">저장하면 이 계정에 발급된 토큰이 모두 폐기됩니다.</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" @click="pwdReset.open = false">취소</button>
            <button class="btn btn-primary btn-sm" :disabled="pwdReset.saving" @click="submitPasswordReset">
              {{ pwdReset.saving ? '저장 중…' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
