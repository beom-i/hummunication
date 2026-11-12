# 주보 · 설교 · 새가족 문답 · 파송자 DB 설계

> 운영 DB 반영 완료: 실제 구현·적용 내역과 남은 웹 배포는 [운영 적용 상태](backend-implementation-status.md)를 기준으로 확인한다. 아래는 현재 구현한 원본 구조다. 파송자 사람 정보는 JSONB가 아닌 관계형 행으로 저장한다.

2026-11-12 · v0.7. 이전 weekly 한 행에 설교·문답을 모두 넣던 안을 대체한다. **주보는 조합, 세 콘텐츠는 독립 원본**으로 분리한다. 운영 반영 이력은 위 상태 문서를 따른다.

## 관계와 범위

```text
weekly (발행일·출력 구성)
 ├─ sermon_id → sermon (설교 기본 정보·Tiptap 정리)
 ├─ family_id → family (한 묶음의 순별 사진·문답)
 └─ sender_id → sender (파송자 묶음) → sender_person (사람별 행)
sermon.thumbnail_id → files.id → uploads private Storage
family.groups[].photoId → files.id → uploads private Storage
```

업무 테이블은 weekly / sermon / family / sender / sender_person / files 여섯 개다. sender는 묶음의 버전과 생명주기를 관리하고, sender_person은 사람별 입력을 일반 컬럼으로 저장한다. 팀은 하나다. teams·team_id·로그인 members·개별 cards·groups·answers 테이블은 추가하지 않는다. 로그인은 기존 Supabase Auth를 사용한다.

각 weekly는 설교·문답·파송자를 종류별 최대 한 건 연결한다. 각 콘텐츠는 연결된 주보 없이 존재할 수 있다. **현재 제안은 FK마다 UNIQUE를 두어 동일 원본을 여러 주보에서 공유하지 않는다.** 다음 주로 복사할 때 새 콘텐츠 ID를 만들어 과거 주보의 내용이 함께 바뀌는 일을 막는다. 독립 조회·편집은 가능하되 주간 재사용은 복사로 한다. 여러 주보가 같은 원본 수정사항을 함께 반영해야 한다면 이 제약을 별도로 재검토한다. 다대다 연결 테이블은 현재 필요 없다.

weekly.sermon_id / family_id / sender_id는 모두 NULL 허용 FK + UNIQUE + ON DELETE RESTRICT다. 이 FK 제약은 물리 DELETE에 대한 것으로, 소프트 삭제 시 연결 보호는 변경 함수에서 별도로 검사한다. 작성 전 주보·구성 제외 상태를 표현한다. 연결 중인 원본은 삭제할 수 없고 먼저 명시적으로 연결 해제해야 한다. 주보 소프트 삭제는 주보만 숨기고 원본과 연결을 보존하며, 선택 체크 해제도 원본 삭제·연결 해제가 아니다.

## 발행 구성과 출력

실제 콘텐츠 영역은 **설교 정리·새가족 문답·파송자 세 가지**다. 기존 5개 선택 항목은 출력 옵션이다. weekly.sections는 thumbnail / cover / sermon / family / senders 중 선택한 값의 배열로 유지한다. 이름은 현재 UI 계약을 따른다. 테이블 이름은 sender, 기존 출력 키는 senders다.

- 주보 썸네일·주보 표지: weekly.date만 사용한다. 별도 테이블·제목 컬럼을 만들지 않으며 3단계 결과/내려받기에서 선택된 경우 앞 1·2페이지로 출력한다. 둘 중 하나만 선택하면 선택한 항목만 앞에 온다.
- 설교 정리: sermon 기본 정보로 **설교 표지**, sermon.content로 본문 카드를 만든다. 설교 표지는 날짜만 있는 주보 표지와 다른 출력이다.
- 새가족 문답: family.groups에서 순별 사진·문답 카드를 만든다. 현재 문답 템플릿에 들어가는 주차·날짜는 연결한 weekly.date를 사용한다. 독립 출력 시 발행 맥락을 입력받는 범위는 추후 결정한다.
- 파송자: 사람별 이름·기수·기도제목으로 카드를 생성한다. 소속 순·파송 날짜도 입력과 함께 저장하며, 페이지 수·줄바꿈 결과는 생성값이다.
- 출력 순서는 썸네일 → 주보 표지 → 설교 정리 → 새가족 문답 → 파송자다. 자동 생성한 카드/HTML/장수/PNG·JPG/ZIP은 저장 원본이 아니다.

주보 썸네일·표지와 별도로, 설교 표지에 쓰는 업로드 사진은 sermon.thumbnail_id로 보존한다.

## 테이블 명세

모든 원본 테이블 weekly / sermon / family / sender의 공통 컬럼:

| 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| id | uuid PK | 독립 식별자, 서버/DB 생성 |
| version | integer NOT NULL DEFAULT 1, > 0 | 같은 원본의 저장 충돌 비교 |
| created_at | timestamptz NOT NULL DEFAULT now() | 최초 생성 시각 |
| updated_at | timestamptz NOT NULL DEFAULT now() | 마지막 변경 시각 |
| updated_by | uuid nullable FK auth.users.id, ON DELETE SET NULL | 검증한 수정 사용자 |
| deleted_at | timestamptz nullable DEFAULT NULL | 소프트 삭제 시각, NULL이면 활성 |

### weekly — 발행물의 조합

| 추가 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| date | date NOT NULL, 활성 행에만 UNIQUE | 주보 발행일, 월·주차 제목의 원본 |
| sections | text[] NOT NULL DEFAULT '{}' | 다섯 출력 키만 허용, 중복 금지, 저장 시 빈 배열 허용 |
| sermon_id | uuid nullable UNIQUE FK sermon.id | 설교 정리 연결 |
| family_id | uuid nullable UNIQUE FK family.id | 새가족 문답 묶음 연결 |
| sender_id | uuid nullable UNIQUE FK sender.id | 파송자 묶음 연결 |

weekly에는 speaker/title/bible/content/groups를 중복 저장하지 않는다. 섹션 선택 상태와 내용 존재는 다르다. 예를 들어 family_id가 있어도 sections에서 family를 빼면 내용을 보존하고 출력만 제외한다. 저장은 빈 연결을 허용하고, 내보낼 때 지원하는 선택 영역의 원본·필수 값을 검증한다.

### sermon — 설교 정리 한 건

| 추가 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| date | date nullable | 설교 날짜, weekly.date와 다를 수 있음. UNIQUE 아님 |
| speaker | text NOT NULL DEFAULT '' | 설교자 |
| title | text NOT NULL DEFAULT '' | 설교 제목, 주보의 월·주차 제목과 다름 |
| bible | text NOT NULL DEFAULT '' | 성경 본문 구절 표기, 예: 사사기 7:1-8 |
| content | jsonb NOT NULL | 제한된 Tiptap 정리 문서, 기본값은 빈 문단 문서 |
| thumbnail_id | uuid nullable FK files.id, ON DELETE RESTRICT | 설교 표지의 업로드 사진 원본 |

**bible은 성경 구절 표기, content는 서식이 있는 설교 정리**다. 기존 passage/document 로컬 저장본은 읽을 때 변환한다. 썸네일 교체·삭제는 파일 참조를 바꾸며 사진 자체를 물리 삭제하지 않는다.

### family — 새가족 문답 한 묶음

| 추가 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| groups | jsonb NOT NULL DEFAULT '[]' | 순 이름·사진 참조·크롭·순장/순원 문답 배열 |

family 한 행은 한 사람도, 순 하나도 아닌 **여러 순을 담은 문답 원본 전체**다. 독립 관리 경계는 이 묶음까지다. 별도 주보 밖 조회가 필요 없는 순과 답변까지 테이블로 나누지 않는다.

```ts
type Group = {
  name: string;
  photoId: string | null;
  photoEdit: PhotoEdit | null;
  leader: { name: string; answer: string };
  members: { name: string; answer: string }[];
};
```

배열 순서가 순·순원 순서다. PhotoEdit는 sourceWidth/sourceHeight, rotation(0/90/180/270), 회전된 원본 기준 0~1 crop(x/y/width/height)이며 비율은 119:71이다. 사진 해제 시 photoId/photoEdit를 함께 비운다. members는 로그인 계정이 아닌 문답 콘텐츠다. photoId는 SQL FK가 아니므로 저장 시 파일 존재·이용 권한, 물리 삭제 시 모든 family.groups 참조를 검사해야 한다.

### sender — 파송자 한 묶음

공통 id/version/created_at/updated_at/updated_by/deleted_at만 둔다. `people` JSONB 컬럼은 없다. `weekly.sender_id`가 묶음 한 건을 연결하고, 여러 사람은 아래 자식 테이블에서 조회한다.

### sender_person — 파송자 한 사람

| 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| id | uuid PK, DB 생성 | 사람별 콘텐츠 식별자 |
| sender_id | uuid NOT NULL FK sender.id, ON DELETE RESTRICT | 소속 파송자 묶음 |
| name | text NOT NULL DEFAULT '', 최대 100자 | 이름 |
| generation | text NOT NULL DEFAULT '', 숫자 0~3자리 | 기수, `007`처럼 앞자리 0 보존 |
| group_name | text NOT NULL DEFAULT '', 최대 100자 | 소속 순 이름. UI 속성은 group |
| date | date nullable | 파송 날짜. UI 빈 문자열은 NULL로 저장 |
| prayer | text NOT NULL DEFAULT '', 최대 3,000자 | 기도제목, 줄바꿈 보존 |
| position | integer NOT NULL, 0~19 | 표시 순서 |
| created_at | timestamptz NOT NULL DEFAULT now() | 생성 시각 |
| updated_at | timestamptz NOT NULL DEFAULT now() | 마지막 변경 시각 |
| updated_by | uuid nullable FK auth.users.id | 검증한 수정 사용자 |
| deleted_at | timestamptz nullable | 소프트 삭제 시각 |

활성 행에 `(sender_id, position)` 부분 UNIQUE를 둔다. 한 묶음에 최대 20명이다. 미완성 저장은 빈 항목을 허용하고, 다음 단계에서는 선택된 파송자의 이름·기도제목을 요구한다.

사람별 수정·추가·삭제·순서 변경을 묶음 저장 한 번으로 처리하고 **sender.version 하나로 충돌을 비교**한다. 별도의 사람별 version은 두지 않는다. 순서 변경 시 id를 유지하며, 폼의 personId는 RHF가 만드는 임시 field.id와 구분한다. 다른 묶음의 사람 ID나 이미 삭제한 ID로 저장하면 거절한다. 목록에서 뺀 사람도 deleted_at을 남긴다.

입출력 DTO의 people 배열과 RPC JSON 인수는 전송 형식이다. DB에서는 각 필드를 sender_person의 실제 컬럼으로 분리한다. 별도의 공통 인명부·로그인 계정과 연결하지 않는다.

### files — 업로드 원본 참조

id uuid PK, path text UNIQUE NOT NULL, created_by uuid nullable FK auth.users.id ON DELETE SET NULL, created_at timestamptz DEFAULT now(), deleted_at timestamptz nullable DEFAULT NULL. 버킷은 기존 uploads private 하나다. 실제 이미지는 Storage에 두며 Data URL·만료 signed URL은 영구 저장하지 않는다. 사진 삭제 버튼은 먼저 family의 참조를 해제하며, 실제 파일 삭제는 남은 참조 검증 뒤 별도로 처리한다.

## 소프트 삭제

weekly / sermon / family / sender / files는 deleted_at만 기록하고 행을 물리 삭제하지 않는다. sender_person에도 같은 소프트 삭제 규칙을 적용한다. 사람 목록 변경의 버전은 sender에서 관리한다. 삭제도 updated_at/updated_by를 갱신하고 version을 증가시킨다. 일반 목록·상세와 RLS는 deleted_at IS NULL만 허용하며 저장·연결도 활성 원본에만 허용한다.

주보 삭제는 해당 주보만 숨기며 FK·콘텐츠는 남긴다. 삭제된 주보의 참조도 보존 대상이므로 연결 중인 콘텐츠 삭제는 명시적 연결 해제 전 거절한다. 체크 해제는 연결 해제가 아니다. 파일도 삭제된 설교·문답을 포함한 모든 참조를 확인한 뒤 메타데이터만 숨기고 Storage 원본은 보존한다. 이미 발급한 signed URL은 만료 전 접근 가능하므로 새 발급을 차단하고 만료 시간으로 제한한다.

weekly.date는 일반 UNIQUE 대신 **WHERE deleted_at IS NULL인 부분 UNIQUE 인덱스**로 활성 주보끼리만 유일하다. 삭제한 날짜로 새 주보 생성이 가능하며 새 콘텐츠 ID를 사용한다. 콘텐츠 FK의 UNIQUE는 삭제된 주보까지 유지한다. 휴지통·복원 UI·보존 기간·물리 정리는 아직 추가하지 않는다. 향후 복원 시 활성 날짜 충돌 등을 확인해야 한다.

변경 RPC끼리는 원본 종류·ID 순서 → weekly 순서로 잠금 규약을 통일한다. 연결과 소프트 삭제가 경쟁해 삭제된 콘텐츠가 새로 연결되지 않도록 한다. 인증·참조·버전·활성 상태를 한 트랜잭션에서 확인하고 일반 테이블 쓰기 권한으로 이를 우회하지 못하게 한다.

## 저장·권한·오류

서버에서 getClaims로 사용자를 검증하고 Zod로 입력을 재검증한다. 모든 신규 테이블은 RLS와 명시적 grant를 함께 설계하며 anon 쓰기는 허용하지 않는다. 공개 화면 진입은 유지하고 실제 서버 원본 조회·저장은 관리자 발급 팀원 로그인을 요구한다. 날짜 6자리 UI 확인은 DB 권한이 아니다. 관리자 발급 Auth 계정만 팀원이며 user_metadata.name은 표시용이다.

한 번의 saveWeekly는 weekly와 연결 원본의 **조회한 버전 묶음**(weekly/sermon/family/sender)을 받는다. 현재 연결과 버전을 확인하고 저장한 원본의 version을 증가시킨다. 하나라도 달라졌으면 전체 CONFLICT, 전체 롤백. 독립 콘텐츠 편집도 해당 콘텐츠 version을 확인한다. 서버 Action에서 supabase.from(...).update(...)를 순서대로 여러 번 호출하는 것은 트랜잭션이 아니다. DB 함수/RPC 한 번으로 신규 원본 생성·연결 변경·원본 수정·버전 비교를 원자적으로 처리한다. 같은 저장 함수를 사용해 검증 우회 쓰기 권한을 제한한다. 같은 발행일 신규 생성 경합은 활성 date 부분 UNIQUE 위반을 CONFLICT로 반환한다.

주보당 순 20개·순원 30명·답변 3,000자·본문 20,000자/2,000문단과 허용 노드/서식/색상/폰트 크기/크롭을 서버 검증한다. 미완성 저장과 단계 이동/내려받기 필수 검증은 구분한다. 사진 업로드는 DB 트랜잭션 밖이므로 주보 저장 성공 전 이전 파일·로컬 입력을 지우지 않는다.

오류는 공통 Result<T>: 성공 {ok:true,data}, 실패 {ok:false,error:{code,message,fields?}}. code는 INVALID_INPUT / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / INTERNAL_ERROR. 내부 DB 오류를 그대로 노출하지 않는다.

## feature 단위 구현 순서

src/features/{weekly,sermon,family,sender,files}. 각 도메인에 schemas.ts, queries.ts, actions.ts를 필요한 시점에 둔다. weekly는 조합·저장 트랜잭션을 조율하고, sermon/family/sender는 자기 원본의 검증·카드 생성을 맡는다. 독립 관리 UI/URL은 요구가 생기면 붙인다. 기존 /home /weekly /bulletins는 유지한다. Next.js 서버 조회·Server Action + 기존 supabase-js + Zod + Supabase 생성 DB 타입을 사용한다. JSON 내부 타입은 스키마에서 추론하고 UI camelCase / DB snake_case 경계에서 한 번 매핑한다.

1. sermon/family/weekly 원본 계약과 저장 RPC, RLS·grant·JSON 참조 검증을 설계한다. 파송자 관계형 행·썸네일 FK를 후속 migration으로 추가했다.
2. 현재 로컬 원본을 도메인별로 읽고 저장하는 경계에 연결한다. passage 이관 시 기존 값·서식·빈 줄을 보존한다.
3. 주보 썸네일·주보 표지는 weekly.date만 사용하도록 템플릿을 수정하고, 설교 표지와 구분한다.
4. 저장 후 복원·부분 실패 전체 롤백·동시 저장 충돌·주보 복사 후 과거 원본 보존·사진 참조 삭제 방지를 검증한다.

카드 장수·HTML·이미지는 원본에서 재생성한다. Enter/빈 문단을 보존하고 내용이 넘치면 자동 분할한다. 원본만 저장하므로 미래 템플릿·폰트 변경 후 과거 외형이 달라질 수 있다. 발행 당시 이미지 고정 보관은 별도 요구다.

구체적인 폴더·레이어 코드는 [설교 소프트 삭제 예시](backend-implementation-example.md)에 있다.

근거: [Supabase 관계형 테이블·FK](https://supabase.com/docs/guides/database/tables), [Supabase JSONB](https://supabase.com/docs/guides/database/json). 도메인 경계와 UNIQUE 연결은 이 프로젝트 요구에 맞춘 설계 판단이다. 운영 적용 여부와 앱 배포 상태는 [운영 적용 상태](backend-implementation-status.md)에 기록한다.
