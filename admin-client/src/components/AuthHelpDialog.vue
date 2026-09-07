<script setup>
/**
 * AuthHelpDialog — “전체 인증 필요” 를 켜면 무엇이 달라지나 (v1.16.1)
 *
 *  이 스위치는 켜기는 쉬운데 **켠 뒤 무엇을 해야 하는지**가 화면 어디에도 없었다.
 *  그래서 켜 놓고 401 을 만나 당황하는 경우가 생긴다.
 *  “토큰을 어떻게 받고, 어디에 붙이고, 401·403 은 무슨 뜻인지” 를 한 화면에 모았다.
 */
import { useI18n } from '../composables/useI18n';
defineProps({ enabled: { type: Boolean, default: false } });
defineEmits(['close']);
const { t } = useI18n();
void t;
</script>

<template>
  <div class="ah-backdrop" @mousedown.self="$emit('close')">
    <div class="ah-dialog">
      <div class="d-flex align-items-center gap-2 mb-3">
        <h6 class="mb-0"><i class="bi bi-shield-lock me-2"></i>{{ t('authHelp.title') }}</h6>
        <span class="badge" :class="enabled ? 'text-bg-warning' : 'text-bg-secondary'">
          {{ t('authHelp.now') }}: {{ enabled ? t('authHelp.on') : t('authHelp.off') }}
        </span>
        <button type="button" class="btn-close ms-auto" @click="$emit('close')"></button>
      </div>

      <div class="ah-body">
        <!-- 1. 무슨 일이 일어나나 -->
        <section class="mb-3">
          <div class="fw-semibold mb-1">{{ t('authHelp.s1') }}</div>
          <p class="small text-secondary mb-2" v-html="t('authHelp.p1')"></p>
          <pre class="ah-code mb-0">@Controller('/api/snack')
@Auth()                      ← {{ t('authHelp.cmtAuth') }}
export default class SnackController { … }</pre>
        </section>

        <!-- 2. 클라이언트가 할 일 -->
        <section class="mb-3">
          <div class="fw-semibold mb-1">{{ t('authHelp.s2') }}</div>
          <pre class="ah-code mb-2">① {{ t('authHelp.cmtLogin') }}
POST /api/admin/auth/login
{ "username": "admin", "password": "…" }
→ {{ t('authHelp.cmtToken') }}

② {{ t('authHelp.cmtAttach') }}
GET /api/snack
Authorization: Bearer eyJhbGciOi…</pre>
          <p class="small text-secondary mb-2" v-html="t('authHelp.p2')"></p>
        </section>

        <!-- 3. 도구별 -->
        <section class="mb-3">
          <div class="fw-semibold mb-1">{{ t('authHelp.s3') }}</div>
          <div class="row g-2 small">
            <div class="col-md-4">
              <div class="ah-card">
                <div class="fw-semibold mb-1">{{ t('authHelp.tool1') }}</div>
                <p class="small text-secondary mb-2" v-html="t('authHelp.tool1Body')"></p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="ah-card">
                <div class="fw-semibold mb-1">{{ t('authHelp.tool2') }}</div>
                <p class="small text-secondary mb-2" v-html="t('authHelp.tool2Body')"></p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="ah-card">
                <div class="fw-semibold mb-1">{{ t('authHelp.tool3') }}</div>
                <span class="text-secondary"><code>headers: { Authorization: `Bearer ${token}` }</code></span>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. 오류 읽는 법 -->
        <section class="mb-3">
          <div class="fw-semibold mb-1">{{ t('authHelp.s4') }}</div>
          <table class="table table-sm small mb-0">
            <tbody>
              <tr><td style="width:70px"><code>401</code></td>
                  <td v-html="t('authHelp.e401')"></td></tr>
              <tr><td><code>403</code></td>
                  <td v-html="t('authHelp.e403')"></td></tr>
              <tr><td><code>503</code></td>
                  <td>{{ t('authHelp.e503') }}</td></tr>
            </tbody>
          </table>
        </section>

        <!-- 5. 라우트별 -->
        <section>
          <div class="fw-semibold mb-1">{{ t('authHelp.s5') }}</div>
          <p class="small text-secondary mb-2" v-html="t('authHelp.p5')"></p>
          <pre class="ah-code mb-0">@GetMapping('/')                    ← {{ t('authHelp.cmtNoAuth') }}
async list() { … }

@DeleteMapping('/:id')
@Auth() @Roles('admin')             ← {{ t('authHelp.cmtAdminOnly') }}
async remove() { … }</pre>
        </section>
      </div>

      <div class="text-end mt-3">
        <button type="button" class="btn btn-sm btn-primary" @click="$emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ah-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 1090;
  display: grid; place-items: center; padding: 24px; }
.ah-dialog { background: var(--bs-body-bg, #fff); border-radius: 12px; padding: 18px;
  width: min(880px, 100%); box-shadow: 0 20px 50px rgba(2, 6, 23, .3); }
.ah-body { max-height: 68vh; overflow-y: auto; }
.ah-code { background: #1e2233; color: #e8ecf8; border-radius: 8px; padding: 10px 12px;
  font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
.ah-card { border: 1px solid var(--bs-border-color, #e0e3e7); border-radius: 8px; padding: 8px 10px; height: 100%; }
</style>
