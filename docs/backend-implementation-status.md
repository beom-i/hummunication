# 백엔드 운영 적용 상태

## 2026-11-13 최종 재검증

- 운영 DB의 마이그레이션 이력을 읽기 전용으로 조회했다. 저장소의 7개 migration과 운영 이력이 모두 일치했다. 이번 UI 마무리에서는 원격 DB/Storage 구조를 변경하지 않았다.
- `pnpm test:backend`의 임시 로컬 PostgreSQL 검증 14개 묶음이 통과했다. 데이터 이관, 저장·조회, 전체 트랜잭션 롤백, ID/사진 참조 보존, 소프트 삭제, 익명/직접 쓰기 차단, 파일 정리 권한과 동시 처리 경합을 포함한다.
- 입력 재검증·서버 오류 필드 연결·사진 정리·복구 초안 삭제·서식 보존·PNG/JPG 내보내기 관련 로컬 회귀 검사를 다시 실행했다. 실제 HTTP에서도 공개/보호 경로와 인증 없는 사진 정리 API 요청의 401 응답을 확인했다.
- 실제 계정으로 Supabase Auth→Storage 업로드→주보 저장→재조회하는 운영 통합 검증은 로그인 확인이 필요하다. 운영 migration 적용 확인과 로컬 DB/API 계약 테스트 통과만으로 이 경로까지 완료됐다고 판단하지 않는다.

아래는 이전 적용 이력이다.

2026-11-12 현재. 운영 Supabase DB 적용과 웹사이트 배포는 별개다.

## 현재 운영 구조

업무 테이블은 weekly / sermon / family / sender / files 다섯 개다.

- 파송자 한 사람을 sender 한 행으로 저장한다. 이름·기수·소속 순·파송 날짜·기도제목·표시 순서를 일반 컬럼으로 둔다.
- sender.weekly_id → weekly.id. 한 주보에 여러 파송자를 연결하며 미연결 원본은 NULL로 보존한다.
- 별도 파송자 묶음 테이블과 weekly.sender_id는 제거했다.
- 저장 번호 컬럼·RPC 인수·서버와 프론트 타입을 제거했다. 마지막에 저장한 내용이 반영된다.
- sermon.bible은 성경 구절, sermon.content는 제한된 Tiptap 문서다. sermon.thumbnail_id는 files.id를 참조한다.
- family 한 행은 순 하나다. weekly_id, name, photo_id, photo_edit, leader_name, leader_answer, members, position을 저장한다. 프론트와 서버도 같은 families 배열을 사용한다.
- 모든 테이블은 RLS를 활성화하고 authenticated SELECT를 명시적으로 허용한다. anon 조회와 authenticated 직접 쓰기는 금지한다.
- 사용자 확인은 getClaims 및 DB auth.uid로 수행하고 익명 Auth를 거절한다. 공개 회원가입은 없다.
- 주보 전체 저장은 한 DB 트랜잭션이다. 일부 원본의 검증·참조 오류가 나면 전체 롤백한다.
- 소프트 삭제는 deleted_at을 기록한다. 삭제된 주보의 원본과 사진 참조도 보존한다. 문답 순·파송자 명단에서 제거한 행도 소프트 삭제한다.
- 사진은 private uploads에 저장하고 원본을 덮어쓰거나 물리 삭제할 수 없도록 한다. 서명 URL은 1시간 유효하다.

[상세 컬럼](weekly-data-model.md) · [ERD HTML](reports/weekly-data-erd.html) · [실제 코드 HTML](reports/backend-code-structure.html)

## 마이그레이션 이력

이미 적용한 파일은 수정·삭제하지 않고 새 migration으로 변경했다.

1. 20261112050000_weekly_content.sql — 설교·문답·주보·파일 및 권한·트랜잭션. 로컬 커밋 bd696c2.
2. 20261112100000_weekly_content_sender.sql — 파송자 초기 구조·설교 썸네일. 로컬 커밋 2791fcd.
3. 20261112110000_weekly_content_simplify.sql — 파송자 직접 연결과 저장 계약 단순화. 로컬 커밋 5c9fb67.
4. 20261112120000_weekly_content_families.sql — 순별 문답과 프론트·백엔드 배열 계약 연결.

이전 단순화 파일 SHA-256: `a062c48daf5acd7b627eb0a386a744db1d32bb8a08474aabbe5ba1649de62cde`.

최신 migration은 기존 파송자 사람 행의 ID·입력값·삭제 기록을 유지하며 주보 FK를 옮긴다. 운영 이관 전후 파송자 전체·삭제·미연결 행 개수는 모두 0으로 일치했다. 실제 개인 데이터는 조회하지 않았다.

## 순별 family 연동 적용

20261112120000_weekly_content_families.sql을 운영에 적용했다. SHA-256: `68a1a870d77e924d0864bc8bb1623837d2721a6a2bea1440fdeb53badc7fb070`.

- weekly.family_id를 제거하고 family.weekly_id로 순별 원본을 연결한다. 이름·사진 참조·순장 이름과 답변은 일반 컬럼, 순원은 members 배열이다.
- 기존 여러 순을 각 행으로 이관한다. 첫 순은 기존 ID를 유지하며 나머지는 새 ID를 발급한다. 생성·수정·삭제 기록과 사진 크롭을 보존한다.
- 운영 이관 전 순 개수 0, 이관 후 family 행 0으로 일치했다. 실제 개인 입력을 조회하지 않았다.
- RLS, authenticated SELECT, anon 조회·RPC 차단, 직접 DML 차단 및 주보·파일 FK를 다시 확인했다.
- families와 senders는 동일한 단위의 배열 계약을 사용한다. 필드·타입·검증·미리보기·사진 업로드·서버 저장·복구본을 연결했다.
- 실제 운영 스키마에서 DB·RPC 타입을 생성했다. 저장 요청은 업로드한 파일 ID를 보내고 사진 본문을 다시 보내지 않는다.

## 코드와 검증

src/features/{weekly,sermon,family,sender,files}에서 도메인별 스키마·조회·변경을 관리한다. UI와 서버는 같은 Zod를 사용하며 RHF FieldError·root·toast에 오류를 연결한다. 기존 브라우저 입력의 passage/document와 파송자 personId도 읽을 때 현재 필드로 바꾼다. 저장에 실패하면 입력과 원본 ID를 보존한다.

- lint / typecheck / test:validation / test:content / mockup 검증 / 배포 빌드 통과.
- 독립 임시 PostgreSQL에서 기존 계약으로 만든 데이터의 이관, ID·서식 보존, 마지막 저장 반영, 파송자 순서 변경·제거, 잘못된 연결 차단, 일부 실패 전체 롤백, 소프트 삭제와 날짜 재사용을 검증했다.
- 운영 재조회에서 최신 migration 이력, 최종 테이블 5개, 저장 번호 컬럼·인수 부재, 파송자 FK·RLS·역할 권한과 행 개수 보존을 확인했다.
- 운영 스키마에서 실제 Supabase DB·RPC 타입을 다시 생성했다.

## 남은 웹 배포와 확인

이 문서는 배포 커밋 직전 개발 검증 기록이다. 앱 코드·동시 UI 변경을 PR로 배포하며 ci·gitleaks와 Vercel 성공 여부를 별도로 확인한다. 현재 기능 브랜치는 feat/figma-weekly-mockups다. 적용한 migration은 별도 로컬 이력에 기록한다.

실제 팀원 계정으로 브라우저 저장·사진 업로드가 성공하는 전체 경로는 추가 확인이 필요하다. 현재 단계의 저장·권한 동작은 로컬 통합 테스트로 검증했다. 1440/820/390px 화면 전환·뒤로가기·모션 감소 설정도 통과했다. 이번 브라우저 검증에서 families 순장 이름의 길이 오류, 순장·순원 답변의 카드 반영, 비로그인 저장 실패 알림과 입력 유지도 확인했다.

## 사진 공통화 · 2026-11-13 운영 DB 적용, 웹 배포 대기

새 migration `20261113010000_photo_workflow.sql`을 추가했다. family.photo_edit 품질 설정, sermon.thumbnail_edit, files.purged_at, 교체 후 미사용 파일 삭제 대기와 service_role 전용 정리 RPC를 포함한다. 기존 운영 migration은 수정하지 않았다.

공통 PhotoField·편집 모달에서 원본은 유지하고 편집값만 바꾸며, 미리보기와 다운로드가 같은 출력을 사용한다. 저장 실패 시 기존 파일과 연결은 유지한다. 새 스키마에서 로컬 저장·조회·롤백·공유 참조·파일 정리 권한 및 동시 저장과 정리 경합을 검증했다.

20261113010000_photo_workflow.sql과 20261113020000_family_template_photo_ratio.sql을 운영 DB에 적용했다. 후속 dry-run의 미적용 migration은 0개다. thumbnail_edit·purged_at, 기존 다섯 테이블 RLS, service_role 정리 허용과 anon·authenticated 정리 RPC 차단을 읽기 전용으로 재확인했다. 운영 콘텐츠·파일을 테스트로 생성하거나 삭제하지 않았다.

실파일 정리는 새 운영 배포의 Vercel 일일 Cron으로 작동한다. SUPABASE_SECRET_KEY·CRON_SECRET은 Vercel Production Secret으로 등록하고 값 노출 없이 확인했다. 웹 배포는 PR #9의 보안 검사 재확인 후 진행해야 한다. 해당 PR의 이미지 주소 경고 두 곳은 PNG 링크 검증과 내보내기 래스터 데이터 인코딩으로 보완하고 회귀 테스트를 추가했다. 실제 운영 정리 실행은 아직 수행하지 않았다. [운영 적용과 검증 방법](photo-workflow.md).

배포 전 전체 변경 검토에서 저장 중 편집 덮어쓰기, 복구 사진 URL 만료, 카드뉴스 메뉴 오이동, 홈 날짜에 적용되는 템플릿 CSS를 수정했다. 저장 중 입력 잠금·실패 후 입력 유지·메뉴 안내·홈 날짜 스타일은 브라우저에서 확인했고, URL 복구는 동일 파일 ID와 새 로컬 원본 보존 테스트로 검증했다. lint·typecheck·전체 로컬 테스트·운영 빌드가 통과했다. 운영 자동 정리용 환경변수 두 개는 배포 시 별도로 확인한다.
