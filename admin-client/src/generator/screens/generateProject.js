/**
 * generateProject — 프로젝트 spec 전체를 파일 리스트로 변환하는 오케스트레이터.
 *
 *  입력: activeProject (screenProjects store 의 상세)
 *  출력: Array<{ path, content, source }>
 *
 *  수행 단계:
 *   1. scaffold (index.html, package.json, vite, main, App, router)
 *   2. layout (AppLayout/Header/Sidebar/TopNav)
 *   3. widgets (Stat/List/Detail/Text/Markdown SFC)
 *   4. commons (apiClient, authStore)
 *   5. 각 composite screen 을 SFC 로 (compositeGen)
 *   6. composite 라우터 모듈
 *   7. 각 composite 이 사용한 resource 들의 store 파일
 */
import { genScaffold, genRouterIndex } from '../layouts/scaffoldGen.js';
import { genLayout } from '../layouts/layoutGen.js';
import { genWidgetSfcs } from '../widget-templates/widgetSfcTemplates.js';
import { genApiClient, genAuthStore } from './commonGen.js';
import { genCompositeScreen, genCompositeRouterModule } from './compositeGen.js';
import { genAllResourceStores } from './resourceStoreGen.js';

export function generateProject(project) {
  if (!project) throw new Error('project 가 필요합니다');

  const files = [];
  const resourceCollector = new Map();   // composite 이 참조하는 resource 들을 수집

  // 1) scaffold
  files.push(...genScaffold(project));

  // 2) layout — Phase 20: cssFramework 에 따라 Bootstrap/Metronic class 분기
  files.push(...genLayout(project.layout || {}, project.config?.cssFramework));

  // 3) widget SFC
  files.push(...genWidgetSfcs());

  // 4) common
  files.push(genApiClient(project));
  files.push(genAuthStore());

  // 5) composite screens
  const composites = (project.screens || []).filter((s) => s.kind === 'composite');
  for (const spec of composites) {
    files.push(genCompositeScreen(spec, { resourceCollector, screens: composites }));   // ★ v1.11.7 화면 이동 핸들러에 대상 화면 목록
  }

  // 6) composite router module
  const routerModule = genCompositeRouterModule(composites);
  if (routerModule) files.push(routerModule);

  // 7) 루트 router
  files.push(genRouterIndex(composites));

  // 8) resource stores — composite 이 수집한 것들
  if (resourceCollector.size > 0) {
    const resources = [...resourceCollector.values()];
    files.push(...genAllResourceStores(resources));
  }

  // 경로 중복 제거 (맨 뒤 것이 이김)
  const seen = new Map();
  for (const f of files) seen.set(f.path, f);
  const unique = [...seen.values()];
  // 경로 알파벳 순 정렬 (파일 트리 UI 에서 안정적)
  unique.sort((a, b) => a.path.localeCompare(b.path));

  return unique;
}
