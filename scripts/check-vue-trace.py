# -*- coding: utf-8 -*-
"""
check-vue-trace.py — Vue SFC 정적 추적 검사. (v1.7.8)

  vite build 이전에 잡을 수 있는 런타임 고장 유형을 확인한다.
    ① defineEmits() 결과를 변수로 받지 않고 emit() 을 부르는 곳
    ② 템플릿이 쓰는 컴포넌트가 import 되지 않은 곳
    ③ v-model / @click 이 가리키는 식별자가 script 에 없는 곳
    ④ 만들어 놓고 아무 데서도 안 쓰는 computed (미완성 기능의 흔적)
    ⑤ vue / vue-router 컴포저블을 import 없이 쓰는 곳  ← setup 단계 ReferenceError

  실행: python3 scripts/check-vue-trace.py
  실제로 v1.7.8 에서 ①(ControllerFlowDialog) ④(ProjectEditorView) ⑤(MainLayout) 를 잡았다.
"""
import re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'admin-client' / 'src'
bad = []

def script_of(s):
    blocks = re.findall(r'<script[^>]*>(.*?)</script>', s, re.S)
    return '\n'.join(blocks) if blocks else None
def template_of(s):
    m = re.search(r'<template>(.*)</template>', s, re.S); return m.group(1) if m else None

for p in sorted(ROOT.rglob('*.vue')):
    s = p.read_text(encoding='utf8'); rp = str(p.relative_to(ROOT))
    js, tm = script_of(s), template_of(s)
    if js is None: continue

    # ① emit 을 쓰는데 defineEmits 결과를 안 받은 경우 → 런타임 ReferenceError
    has_emit_binding = (re.search(r'(?:const|let)\s+emit\s*=\s*defineEmits', js)
                        or re.search(r'setup\s*\([^)]*\{[^}]*\bemit\b', js))   # defineComponent setup(props,{emit})
    if re.search(r'(?<![\w.])emit\s*\(', js) and not has_emit_binding:
        bad.append((rp, 'emit 미정의', 'defineEmits() 결과를 변수로 받지 않았다'))

    # ② 템플릿이 참조하는 컴포넌트가 import 되어 있는지 (PascalCase 태그)
    if tm:
        used = set(re.findall(r'<([A-Z][A-Za-z0-9]*)[\s/>]', tm))
        BUILTIN = {'RouterView','RouterLink','Teleport','Transition','TransitionGroup','KeepAlive','Suspense','Fragment'}
        for c in used - BUILTIN:
            if not re.search(rf'\b{c}\b', js):
                bad.append((rp, '컴포넌트 미import', c))

    # ③ 템플릿의 v-model / @click 이 부르는 최상위 식별자가 script 에 있는지
    if tm:
        declared = set(re.findall(r'(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)', js))
        declared |= set(re.findall(r'import\s+([A-Za-z_$][\w$]*)', js))
        for m in re.finditer(r'import\s*\{([^}]*)\}', js):
            for x in m.group(1).split(','):
                if x.strip(): declared.add(x.strip().split(' as ')[-1].strip())
        # ★ v1.10.0 — 구조분해 선언도 declared 로 본다.
        #   `const { t, setLocale } = useI18n();` 를 못 읽어
        #   멀쩡한 핸들러를 '핸들러 없음' 으로 오탐했다.
        for m in re.finditer(r'(?:const|let|var)\s*\{([^}]*)\}\s*=', js):
            for part in m.group(1).split(','):
                part = part.strip()
                if not part:
                    continue
                # `a: b` (이름 바꾸기) 는 b 가 실제 이름, `a = 1` (기본값) 은 a
                name = part.split(':')[-1].split('=')[0].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', name):
                    declared.add(name)
        # 구조분해 배열도 — `const [a, b] = ...`
        for m in re.finditer(r'(?:const|let|var)\s*\[([^\]]*)\]\s*=', js):
            for part in m.group(1).split(','):
                name = part.strip().split('=')[0].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', name):
                    declared.add(name)
        for m in re.finditer(r'defineProps\(\s*\{([\s\S]*?)\n\}\)', js):
            declared |= set(re.findall(r'^\s*([A-Za-z_$][\w$]*)\s*:', m.group(1), re.M))
        for m in re.finditer(r'v-for="\(?([^)"]*)\)?\s+in\s', tm):
            for v in m.group(1).split(','): declared.add(v.strip())
        # v-model 은 반드시 존재하는 반응형이어야 한다
        for m in re.finditer(r'v-model(?::\w+)?="([A-Za-z_$][\w$]*)', tm):
            if m.group(1) not in declared:
                bad.append((rp, 'v-model 대상 없음', m.group(1)))
        # @click="foo(" / @click="foo" 형태의 핸들러
        for m in re.finditer(r'@[\w.:-]+="([A-Za-z_$][\w$]*)\s*[("]?', tm):
            n = m.group(1)
            if n not in declared and n not in {'emit','router','route','$emit','$event'} and not n[0].isupper():
                bad.append((rp, '핸들러 없음', n))

    # ④ computed/ref 를 만들어 놓고 아무 데서도 안 쓰는 것 (죽은 코드)
    body = js + (tm or '')
    for m in re.finditer(r'const\s+([A-Za-z_$][\w$]*)\s*=\s*computed\(', js):
        n = m.group(1)
        if len(re.findall(rf'\b{re.escape(n)}\b', body)) < 2:
            bad.append((rp, '미사용 computed', n))

# ⑤ vue / vue-router 컴포저블을 import 없이 쓰는 곳
VUE = ['ref','reactive','computed','watch','watchEffect','nextTick','provide','inject','useId',
       'onMounted','onBeforeMount','onUnmounted','onBeforeUnmount','onUpdated','shallowRef','toRef','toRefs','h']
ROUTER = ['useRouter','useRoute','onBeforeRouteLeave','onBeforeRouteUpdate']

def mask(js):
    """주석·문자열·템플릿 리터럴을 공백으로 — 생성 코드 문자열 오탐 제거"""
    out = list(js); i = 0; n = len(js)
    while i < n:
        c = js[i]
        if c in '"\'`':
            q = c; j = i + 1
            while j < n:
                if js[j] == '\\': j += 2; continue
                if js[j] == q: break
                j += 1
            for k in range(i, min(j + 1, n)): out[k] = ' '
            i = j + 1; continue
        if c == '/' and i + 1 < n and js[i + 1] == '/':
            j = js.find('\n', i); j = n if j < 0 else j
            for k in range(i, j): out[k] = ' '
            i = j; continue
        if c == '/' and i + 1 < n and js[i + 1] == '*':
            j = js.find('*/', i); j = n if j < 0 else j + 2
            for k in range(i, j):
                if js[k] != '\n': out[k] = ' '
            i = j; continue
        i += 1
    return ''.join(out)

for p in sorted(list(ROOT.rglob('*.vue')) + list(ROOT.rglob('*.js'))):
    s2 = p.read_text(encoding='utf8'); rp = str(p.relative_to(ROOT))
    blocks = re.findall(r'<script[^>]*>(.*?)</script>', s2, re.S)
    js = '\n'.join(blocks) if blocks else (s2 if p.suffix == '.js' else '')
    if not js: continue
    imported = set()
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from", js):
        for n in m.group(1).split(','):
            if n.strip(): imported.add(n.strip().split(' as ')[-1].strip())
    for m in re.finditer(r"import\s+(\w+)\s+from", js): imported.add(m.group(1))
    code = mask(js)
    for name in VUE + ROUTER:
        if re.search(rf'(?<![\w.$]){name}\s*\(', code) and name not in imported:
            bad.append((rp, 'import 없이 사용', name))

print(f'추적 검사 → 문제 {len(bad)}건')
for f,k,n in bad: print(f'  {k:<18} {f}  →  {n}')
sys.exit(1 if bad else 0)
