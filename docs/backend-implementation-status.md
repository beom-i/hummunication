# 백엔드 운영 적용 상태

확인 시각: 2026-11-12T05:18:21+00:00. 시작 브랜치: `feat/weekly-backend`. 동시 UI 작업으로 최종 확인 시 현재 브랜치는 `feat/figma-weekly-mockups`이며, 적용한 첫 migration은 `bd696c2`, 파송자·썸네일 후속 migration은 `2791fcd`로 각각 로컬 커밋했다. 앱과 동시 UI 변경은 아직 작업 폴더에 있다.

## 적용 완료

운영 Supabase에 `20261112050000_weekly_content.sql`을 적용했고, 운영 메타데이터를 다시 조회해 이력·권한·제약을 확인했다. 이 migration은 이미 적용됐으므로 수정·삭제하지 않고 이후 변경은 새 파일로 추가한다.

- 테이블: `weekly`, `sermon`, `family`, `sender`, `sender_person`, `files`.
- 성경 구절: `sermon.bible`. 정리 문서: `sermon.content`.
- 여섯 테이블 모두 RLS 활성. authenticated 활성 원본 조회만 명시적 허용.
- anon 테이블 조회와 변경 함수 실행, authenticated 테이블 직접 쓰기를 차단했다. 사용자 식별은 서버 getClaims 및 DB auth.uid로 검증하며 익명 Auth 계정을 거절한다.
- 저장·주보 연결·버전 비교는 DB 함수에서 한 트랜잭션으로 처리한다. 연결 원본 중 하나가 충돌하면 전체 롤백한다.
- 소프트 삭제는 deleted_at을 기록한다. 주보 삭제 시 원본과 FK를 보존하고, 연결된 원본의 삭제를 거절한다. 활성 주보 날짜만 부분 UNIQUE다.
- 파일은 private uploads에 저장하고 files.id로 참조한다. 등록된 사진을 원본 소유자가 직접 덮어쓰거나 물리 삭제하는 Storage 정책을 제거했다. 등록된 활성 원본만 팀 공동 조회하며 기존 미등록 파일의 소유자 조회는 보존한다. 서명 URL은 1시간 유효하다.
- 운영 스키마에서 Supabase DB·RPC 타입을 생성해 `src/lib/supabase/database.types.ts`에 반영했다.

운영 Auth config diff에서도 로컬의 가입·익명 계정 비허용 설정과 차이가 없음을 확인했다. 해당 두 항목은 미관리 설정 목록에도 없었다. 다른 Auth 설정은 변경하지 않았다.

migration SHA-256: `64e91ecc518dde3ef3a848c2b3ba4050a393f0993712864093c432821321e941`.

## 앱 코드

`src/features/{weekly,sermon,family,files}`에 원본 스키마와 서버 함수를 두었다. 기존 UI는 공통 스키마를 사용하고 서버 오류를 필드 아래·errors.root·toast에 연결한다. 미완성 저장과 다음 단계 필수 검증은 구분한다.

홈 목록·상세·편집 로드는 서버 조회를 사용한다. 기존 브라우저 원본은 보존하며 passage/document를 bible/content로 읽어 온다. 저장 전에 사진을 업로드하고, 전체 저장에 성공한 후에만 서버 원본으로 전환한다. 복구본에는 최초 조회한 version도 보존하여 재로그인 후 타인의 수정 내용을 조용히 덮어쓰지 않는다. 브라우저 저장 공간 부족은 서버 저장을 막지 않는다.

공개 화면 진입은 유지한다. 실제 서버 원본 조회·저장·삭제는 관리자 발급 팀원 계정이 필요하다. 날짜 6자리 UI 확인은 서버 권한이 아니다.

파송자 입력과 설교 썸네일의 서버 저장 연결도 추가했다. UI·서버가 features 스키마를 함께 사용하고, 파일 업로드 후 전체 주보를 한 번에 저장한다. 자동 복구본에도 원래 읽은 version을 보존한다.

## 2026-11-12 추가 적용 — 파송자 관계형 저장

`20261112100000_weekly_content_sender.sql`을 운영 DB에 적용하고 실제 컬럼·FK·RLS·역할 권한을 다시 조회했다. 이미 적용한 파일이므로 이후 수정은 새 migration으로 한다.

- `sender`: 파송자 묶음. id/version과 공통 생성·수정·삭제 기록.
- `sender_person`: id, sender_id, name, generation, group_name, date, prayer, position, created_at, updated_at, updated_by, deleted_at. **people JSONB 컬럼은 없다.**
- `weekly.sender_id`: NULL 허용 UNIQUE FK. 한 주보가 묶음 한 건을 연결하고 묶음은 여러 사람 행을 가진다.
- `sermon.thumbnail_id`: private 업로드 원본인 files.id FK. 삭제된 설교의 사진 참조도 보호한다.
- 사람 목록 변경은 sender.version으로 한 번에 충돌 검사한다. 순서를 바꿔도 사람 ID가 유지되고 제거는 소프트 삭제한다. 이미 삭제한 사람이나 다른 묶음의 ID로 저장하면 거절한다.
- 새 테이블도 authenticated SELECT + RLS만 허용한다. 직접 INSERT/UPDATE/DELETE 및 anon 조회·RPC 실행은 금지한다.
- RPC의 people JSON과 조회 배열은 전송용이며 저장 데이터는 일반 컬럼이다. 기존 family.groups와 sermon.content의 JSONB는 유지한다.

migration SHA-256: `c545568d7fdd69fcb7388052697e3577750b9c51594faa8ef7654c97405ddcd2`.


## 검증

- pnpm lint / pnpm typecheck / pnpm test:validation / pnpm test:content 통과.
- pnpm test:backend: 독립 임시 PostgreSQL을 생성·정리하며 실제 DB 저장·조회·서식 보존·삭제 후 조회·참조 보호·충돌·전체 롤백·날짜 재사용·권한을 검증했다. Auth/JWT와 Storage 테이블은 로컬 경계 fixture다. 운영 데이터에 테스트 원본을 만들지 않았다.
- 브라우저: bible 길이 초과와 파송자 기수 오류가 필드 아래에 표시되고, 미로그인 서버 저장 실패가 root·toast에 표시됨을 확인했다. 새로고침 뒤 파송자의 이름·007 기수·소속 순·날짜·기도제목도 복구됐다.
- Next.js 배포 빌드 통과. 동시 UI 작업의 .next와 충돌하지 않도록 `HUMMUNICATION_BUILD_DIR=.next-backend pnpm build`로 분리 검증했다. 일반 배포의 기본 경로는 .next다.
- 운영 재조회: 두 migration 이력 존재, 여섯 테이블 RLS true, anon 주보 SELECT false, authenticated 직접 UPDATE false, Storage 물리 DELETE 정책 없음, PUBLIC/anon 변경·조회 함수 EXECUTE grant 0건, 활성 날짜 부분 UNIQUE 및 bible 컬럼 존재 확인.

## 남은 배포와 확인

웹앱 코드는 현재 작업 브랜치에 있으며 원격 push·main 병합·Vercel 배포는 실행하지 않았다. 운영 DB 적용과 웹앱 배포를 혼동하지 않는다. 기존 deploy.sh는 migration 포함 시 보수적으로 중단하므로, 앱 배포 전 이미 적용한 DB 이력을 확인하고 이 절차를 맞춰야 한다.

실제 팀원 로그인으로 성공 저장·사진 업로드까지 수행하는 전체 흐름은 아직 확인하지 않았다. 파송자·썸네일의 로컬 DB 통합 테스트와 프론트 연결은 검증했고, 실제 팀원 계정의 브라우저 저장·업로드 성공 경로는 미확인이다. 작업 폴더의 동시 UI 변경은 보존했다.
