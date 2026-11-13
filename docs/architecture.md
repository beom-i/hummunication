# 코드 구조

Safy-web의 기능별 구성을 참고한다. 이 프로젝트는 단일 Next.js 앱이므로 앱·패키지 분리 없이 `features`에 기능을 모은다.

- `src/app`: URL, 레이아웃, 서버 진입점. 페이지에서는 기능 화면을 조립한다.
- `src/components/ui`: 공통 shadcn 부품과 디자인 시스템. 도메인별 화면은 넣지 않는다.
- `src/features/<기능>/components`: 기능 화면과 폼.
- `src/features/<기능>/hooks`: 브라우저 상태·이벤트·수명주기를 처리하는 훅.
- `src/features/<기능>/utils`: React 없이 실행할 수 있는 계산과 변환.
- `src/features/<기능>/schemas.ts`: 데이터 검증, 폼 타입, 기본값. 클라이언트와 서버가 함께 사용한다.
- `src/features/<기능>/actions.ts`, `queries.ts`: 서버 입력 검증과 Supabase 읽기·쓰기.
- `src/lib`: Supabase 클라이언트, 결과 타입 등 기능과 무관한 기반 코드.

필요한 디렉터리만 만든다. 파일 한 개를 전달하는 배럴이나 이전 경로를 유지하는 재수출 파일은 만들지 않는다. 폼 전용 스키마가 필요한 경우 해당 폼과 같은 `components/schemas.ts`에 둔다.

## 주보

`weekly/components/weekly-workspace.tsx`는 폼과 복구·서버 저장을 연결한다. 화면 선택은 `weekly-step-content.tsx`, 모션과 히스토리 전환은 `hooks/use-weekly-transition.ts`, URL·제목·진행 단계 규칙은 `utils/workflow.ts`에서 처리한다.

`templates`에는 실제 출력되는 주보·설교·새가족·파송자 렌더러와 페이지 분할 결과를 제공하는 컨텍스트를 둔다. 출력 좌표·자간·폰트 스타일은 템플릿의 CSS에 모은다. 페이지 분할 계산과 PNG/JPG 내보내기는 `utils`에 둔다.

`ContentEditorLayout`은 설교·새가족·파송자를 모두 왼쪽 입력폼·오른쪽 미리보기로 배치한다. 좁은 화면에서는 입력폼 다음에 미리보기를 둔다. `CardPreview`의 화살표는 카드 페이지를 이동하며, 사람 선택은 목록에서 한다. 설교는 별도 앨범·목록 보기를 유지한다.

새가족은 목록 → 통합 편집 → 목록으로 이동한다. 입력 전용 화면과 전체 미리보기 화면은 제거했다. 과거 `family-edit` 주소는 통합 편집기로, `family-preview` 주소는 목록으로 해석한다. 하단 이전·저장·다음/완료 버튼은 `WeeklyFooter`로 공유한다.

## 사진·공통 작업 공간

`files/components`의 `PhotoField`, `PhotoCropDialog`를 설교와 새가족에서 함께 사용한다. 크롭 계산·최적화는 `files/utils`, 비동기 출력 소스는 `files/hooks`에서 처리한다. 사진 기능은 주보 UI를 가져오지 않는다.

`workspace/components`에는 홈·주보·상세 화면이 공유하는 사이드바·스플래시·작업 시작 오버레이를 둔다. `home`은 대시보드, `bulletins`는 상세 보기와 브라우저 복구 데이터를 담당한다.

## 조건부 렌더링과 검증

여러 화면을 고르는 분기는 명시적인 `if`·`switch`로 작성한다. 두 값 중 하나를 고르는 짧은 삼항연산자는 허용한다. 기능 코드와 페이지의 중첩 삼항연산자는 ESLint가 차단한다.

`pnpm test:workflow`는 과거 URL 호환, 날짜별 편집 URL, 단계 제목, 선택한 유형만 열리는 규칙과 사이드바 너비를 검사한다. 기존 저장·사진·서식·분할 검증은 각 테스트 명령으로 계속 실행한다.

브라우저 검증은 `scripts/check-weekly-transitions.sh <ego-space-id>`와 `tests/template-typography.browser.mjs`를 사용한다. 후자는 로컬 앱 Page를 받아 `runTemplateTypographyRegression(page)`를 실행하며, 임시 입력을 원래 값으로 복원한다. `tests/content-editors.browser.mjs`의 `runContentEditorRegression(page)`는 목록·편집 왕복, 새 순 추가, 실시간 반영·복구, 카드 페이지 이동과 PC·모바일 배치를 검사한다. 로컬 앱에서만 실행하며 테스트한 날짜의 임시 저장을 원래 값으로 복원한다. CI는 DOM 픽셀 비교를 대신하지 않는다.

Figma와의 픽셀 비교, 입력·미리보기 동선 검토, 구조 정리는 별개다. 코드 정리로 Figma 전체 화면의 일치가 보장되는 것은 아니다.
