# 공통 사진 업로드·편집

2026-11-13 · 새가족과 설교 썸네일의 원본·편집값·정리 경로.

## 현재 코드

- `PhotoField`를 두 입력 화면이 공유한다. 빈 상태 → 파일 선택 → 편집 모달 → 적용이며 사진 아래 편집/교체/삭제를 같은 순서로 둔다.
- 교체 파일은 모달에서 적용한 뒤에만 폼으로 반영한다. 취소하면 기존 사진과 편집값을 유지한다. 적용은 DB 저장이 아니며 주보 저장 시 원본 파일을 업로드한다.
- 원본 파일 ID는 크롭·회전·품질 설정 변경으로 바꾸지 않는다. 용량 조절은 원본에서 만든 메모리 출력으로 미리보기·PNG/JPG에 적용한다. 별도 압축 파일을 영구 저장하지 않는다.
- `family.photo_edit`와 `sermon.thumbnail_edit`는 rotation / sourceWidth / sourceHeight / crop / quality 형식을 공유한다. 최종 카드 사진 영역에 맞춰 두 편집 비율은 16:9로 맞춘다. family의 기존 119:71 편집값도 계속 읽고 저장할 수 있으며, 다시 편집할 때 현재 표시 영역을 16:9로 맞춘다. 프론트·서버·DB에서 허용된 비율을 검증한다.
- quality는 null(원본) / 0.85(권장) / 0.65(작게). 기존 편집값에 quality가 없으면 원본으로 읽는다. 압축 시 긴 변은 최대 2400px, 커지면 원본을 사용한다.
- 이전에 압축본으로 저장한 사진의 원본을 자동 복원할 수는 없다. 기존에 연결된 파일을 원본으로 취급한다.

## 사진 교체·삭제

1. 새 원본 업로드 후 주보 저장 트랜잭션에서 연결을 바꾼다. 실패하면 기존 연결과 삭제 상태가 롤백된다.
2. 트랜잭션 마지막에 이전 파일의 모든 참조를 검사한다. 한 트랜잭션 안에서 사진을 맞바꾸어도 잘못 삭제 대기로 바꾸지 않는다.
3. 참조가 없어진 파일은 files.deleted_at을 기록한다. 다른 순·설교와 소프트 삭제 콘텐츠의 참조도 보존한다.
4. 최소 24시간 후 다음 일일 정리에서 실파일을 Storage API로 제거하고 files.purged_at을 기록한다. DB 파일 행은 삭제 기록으로 남긴다.
5. 저장하지 못한 업로드도 24시간 이상 미사용이면 정리한다. 파일 등록에 실패한 Storage 객체는 새 `사용자 UUID/photos/파일 UUID.ext` 경로만 회수해 이전의 미등록 자료는 건드리지 않는다.
6. Storage 제거 실패나 결과 기록 실패는 다음 실행에서 재시도한다. 정리 실패로 이미 성공한 주보 저장을 실패시키지 않는다.

사진 연결·삭제 대기 판정·정리 후보 선정을 같은 DB advisory lock으로 순서화한다. 이 팀의 작은 저장 배치를 위한 선택이며, 실제 삭제 전에는 삭제 대기 상태로 새 참조를 차단한다. 정리 RPC는 service_role만 실행할 수 있다. 클라이언트에 Storage 직접 삭제 권한을 주지 않는다.

## 운영 적용

새 migration은 `supabase/migrations/20261113010000_photo_workflow.sql`과 `20261113020000_family_template_photo_ratio.sql`이다. 2026-11-13 운영 DB에 두 파일을 적용했고, 후속 dry-run에서 미적용 migration이 없음을 확인했다. 새 컬럼·RLS·service_role 전용 정리 권한도 운영 스키마에서 읽기 전용으로 확인했다. 이미 적용한 이전 migration은 수정하지 않았다. 앱 코드는 아직 웹 배포 전이다.

Vercel Production 환경변수에 다음 이름을 등록해야 일일 정리가 활성화된다. 실제 값은 이 문서·코드·채팅에 기록하지 않는다.

- `SUPABASE_SECRET_KEY`: 해당 Supabase 프로젝트의 서버 전용 Secret Key. NEXT_PUBLIC_을 붙이지 않는다.
- `CRON_SECRET`: 무작위로 생성한 16자 이상의 비밀값. Vercel이 정리 요청 Authorization 헤더에 전달한다.
- 기존 `NEXT_PUBLIC_SUPABASE_URL`은 동일 프로젝트를 가리켜야 한다.

`vercel.json`은 매일 18:00 UTC(한국 03:00)에 `/api/cron/photos`를 호출한다. 배포 이후 적용된다. 한 번에 최대 100개를 정리하므로 24시간이 지나도 다음 실행·배치까지 파일이 남을 수 있다. 두 환경변수가 없어도 일반 사진 편집은 가능하지만 정리는 수행되지 않는다. 인증 없는 요청은 401이며, 권한 키가 없는 정상 인증 요청은 503이다. 응답에는 사진 경로·키를 포함하지 않는다.

Supabase의 실제 파일 삭제는 SQL이 아닌 [Storage API](https://supabase.com/docs/guides/storage/management/delete-objects)로 수행한다. 정리 요청 보호는 [Vercel CRON_SECRET 방식](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs#securing-cron-jobs)을 따른다.

## 검증

`pnpm test:weekly`(편집값·원본 ID 보존), `pnpm test:photos`(정리 인증·실패 재시도), `pnpm test:backend`(실제 로컬 PostgreSQL 저장·롤백·파일 참조·유예·권한)를 사용한다. 운영 Storage 파일을 테스트로 삭제하지 않는다. DB 타입은 새 migration을 적용한 로컬 실제 스키마에서 생성했다.

브라우저에서 설교·새가족의 원본 유지, 회전·품질 복원, 교체·초기화 취소, 비로그인 저장 실패 후 입력 유지, 390px 편집 모달과 두 카드의 실제 PNG 다운로드를 확인했다. 실제 팀원 계정으로 운영 업로드·저장하는 경로와 운영 Cron 실행은 아직 확인하지 않았다.
