# 주보 데이터 구조

2026-11-13 · 사진 편집·정리 migration은 운영 DB에 적용했다. 앱 코드의 웹 배포는 대기 중이다. [적용 절차](photo-workflow.md)와 [DB·웹 적용 상태](backend-implementation-status.md)를 구분해서 확인한다.

```text
weekly
 ├─ sermon_id → sermon           설교 정리 한 건
 ├─ id ← family.weekly_id        새가족 순 여러 개
 └─ id ← sender.weekly_id        파송자 여러 명

sermon.thumbnail_id → files.id → private uploads
family.photo_id → files.id
```

업무 테이블은 **weekly / sermon / family / sender / files** 다섯 개다. 순 하나를 family 한 행, 파송자 한 사람을 sender 한 행으로 저장한다. 별도 파송자 묶음·sender_person·teams·members·cards 테이블은 두지 않는다. 로그인은 기존 Supabase Auth를 사용한다.

## 공통 기록

weekly / sermon / family / sender는 id(uuid PK), created_at, updated_at, updated_by(nullable FK auth.users.id, 계정 삭제 시 SET NULL), deleted_at(nullable)을 갖는다. 시간은 timestamptz이며 DB가 기록한다. 삭제는 deleted_at을 남긴다.

저장 번호를 비교하는 컬럼·API 인수·클라이언트 타입은 없다. 같은 내용을 여러 명이 수정하면 **마지막에 저장한 내용이 반영**된다. updated_at은 표시용이며 저장 조건으로 비교하지 않는다. 주보 전체 저장의 트랜잭션과 입력 검증은 유지한다.

## weekly — 주보

| 컬럼 | 타입 | 의미 |
| --- | --- | --- |
| id | uuid PK | 내부 주보 ID |
| date | date NOT NULL | 발행일. 활성 행에만 UNIQUE |
| sections | text[] NOT NULL | thumbnail / cover / sermon / family / senders, 중복 금지 |
| sermon_id | uuid nullable UNIQUE FK sermon.id | 설교 정리 원본 |
| created_at / updated_at | timestamptz NOT NULL | 생성·수정 시각 |
| updated_by | uuid nullable FK auth.users.id | 수정 팀원 |
| deleted_at | timestamptz nullable | 소프트 삭제 시각 |

주보 썸네일·주보 표지는 date로 생성하는 출력이다. 따로 원본 테이블을 만들지 않는다. 체크 해제는 출력 제외이며 입력 삭제가 아니다. sender_id 컬럼은 두지 않는다.

설교·문답·파송자는 주보 없이도 존재할 수 있다. sermon_id는 UNIQUE FK이며 family와 sender는 weekly_id로 한 주보에 연결한다. 한 원본을 여러 주보가 공유하지 않는다. 다음 주에 쓰려면 복사한다.

## sermon — 설교 정리

공통 기록 외 컬럼:

| 컬럼 | 타입 | 의미 |
| --- | --- | --- |
| date | date nullable | 설교 날짜 |
| speaker | text NOT NULL DEFAULT '' | 설교자, 최대 100자 |
| title | text NOT NULL DEFAULT '' | 설교 제목, 최대 200자 |
| bible | text NOT NULL DEFAULT '' | 성경 구절, 최대 200자 |
| content | jsonb NOT NULL | 허용된 Tiptap 문서 |
| thumbnail_id | uuid nullable FK files.id | 설교 표지의 원본 사진 |
| thumbnail_edit | jsonb nullable | 16:9 크롭·회전·원본 크기·출력 품질 |

content는 bold / italic / underline / strike / textStyle(HEX 색·8~32px)을 보존한다. 본문은 최대 20,000자/2,000문단이다. Enter와 빈 문단을 보존하고 카드 페이지는 생성한다.

## family — 새가족 순 하나

공통 기록 외 컬럼:

| 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| weekly_id | uuid nullable FK weekly.id | 연결된 주보 |
| name | text NOT NULL DEFAULT '', 최대 100자 | 순 이름 |
| photo_id | uuid nullable FK files.id | 단체 사진 원본 |
| photo_edit | jsonb nullable | 원본 크기·회전·크롭 영역·출력 품질 |
| leader_name | text NOT NULL DEFAULT '', 최대 100자 | 순장 이름 |
| leader_answer | text NOT NULL DEFAULT '', 최대 3,000자 | 순장 답변 |
| members | jsonb NOT NULL DEFAULT '[]' | 순원별 name·answer 배열, 최대 30명 |
| position | integer NOT NULL, 0~19 | 주보 안에서 표시 순서 |

weekly 1:N family이며 활성 (weekly_id, position)은 UNIQUE다. 사진은 SQL FK와 활성 파일 검증으로 보호한다. 새 편집은 최종 사진틀의 16:9 비율, 기존 119:71 값도 호환하며 0/90/180/270도 회전과 회전된 원본 기준 0~1 영역을 저장한다. 미연결 원본은 weekly_id=NULL로 보존한다.

프론트·서버·DB 모두 families 배열의 photo_id / photo_edit / leader_name / leader_answer / members와 senders 배열의 group_name을 사용한다. photo는 화면 표시용 URL 또는 업로드 전 Data URL이며 DB에 저장하지 않는다. position은 배열 순서에서 DB가 정한다. 기존 groups·leader·photoId·photoEdit 브라우저 원본은 읽을 때 변환한다.

## sender — 파송자 한 사람

| 컬럼 | 타입·제약 | 의미 |
| --- | --- | --- |
| id | uuid PK, DB 생성 | 파송자 콘텐츠 ID |
| weekly_id | uuid nullable FK weekly.id, ON DELETE RESTRICT | 연결된 주보 |
| name | text NOT NULL DEFAULT '', 최대 100자 | 이름 |
| generation | text NOT NULL DEFAULT '', 숫자 0~3자리 | 기수, 007처럼 앞자리 0 보존 |
| group_name | text NOT NULL DEFAULT '', 최대 100자 | 소속 순. 폼 속성도 group_name |
| date | date nullable | 파송 날짜 |
| prayer | text NOT NULL DEFAULT '', 최대 3,000자 | 기도제목, 줄바꿈 보존 |
| position | integer NOT NULL, 0~19 | 주보 안에서 표시 순서 |
| created_at | timestamptz NOT NULL DEFAULT now() | 생성 시각 |
| updated_at | timestamptz NOT NULL DEFAULT now() | 수정 시각 |
| updated_by | uuid nullable FK auth.users.id | 수정한 팀원 |
| deleted_at | timestamptz nullable | 소프트 삭제 시각 |

**weekly 1 : N sender**다. 활성 `(weekly_id, position)`은 UNIQUE이며 주보당 최대 20명이다. 주보 밖에서 작성한 독립 원본은 weekly_id=NULL로 보존한다. 주보 저장은 연결할 ID가 활성 상태이고 같은 주보 소속 또는 미연결인지 확인한다. 다른 주보의 ID를 가져와 수정할 수 없다.

사람 추가·수정·순서 변경·제거를 주보 저장 트랜잭션 안에서 처리한다. 순서를 바꿔도 ID가 유지되고, 명단에서 제거한 사람은 소프트 삭제한다. 미완성 저장을 허용하며 다음 단계에서는 선택한 파송자의 이름·기도제목을 요구한다. 폼 id는 DB ID이며 RHF가 화면에 사용하는 field.id와 구분한다.

## files — 업로드 원본

id(uuid PK), path(text UNIQUE NOT NULL), created_by(nullable Auth FK), created_at(timestamptz), deleted_at(nullable)을 갖는다. 이미지 자체는 기존 private uploads 버킷에 둔다. Data URL·서명 URL은 영구 저장하지 않고 files.id로 연결한다. purged_at(nullable)은 실파일 정리 완료 시각이다.

PNG/JPG/WebP, 최대 5MiB. 파일 형식을 서버에서 다시 검사한다. 서명 URL은 1시간 유효하다. 클라이언트의 원본 덮어쓰기·물리 삭제는 막고, 삭제된 설교·문답의 참조도 보존한다. 교체로 참조가 없어진 파일은 주보 저장 성공 시 삭제 대기로 기록하고 최소 24시간 후 서버가 Storage API로 정리한다.

## 저장·권한·삭제

- Next.js Server Action이 getClaims로 팀원을 확인하고 Zod로 다시 검증한다. 공개 회원가입은 없다.
- 모든 업무 테이블에 RLS와 authenticated SELECT grant를 둔다. anon 조회·직접 테이블 변경은 허용하지 않고 변경은 검증된 RPC를 사용한다.
- save_weekly 한 번으로 설교·문답·파송자·주보를 저장한다. 일부가 실패하면 전체 롤백한다. 파송자 입력은 전송용 배열이며 저장은 sender 일반 컬럼이다.
- 주보 소프트 삭제 시 원본과 연결을 남긴다. 연결된 설교의 소프트 삭제는 거절한다. 순·파송자 제거는 해당 행의 deleted_at을 기록한다.
- 활성 주보 날짜만 부분 UNIQUE이므로 삭제한 날짜로 새 주보를 만들 수 있다.
- 공개 /home·/weekly 진입과 서버 원본의 팀원 권한은 구분한다. 날짜 6자리 편집 확인은 서버 인증이 아니다.
- 오류는 공통 Result<T>와 fields 경로로 반환하며 RHF FieldError·root·toast로 표시한다. 저장 실패 시 입력을 유지한다.

기존에 적용한 migration은 보존하고, 변경은 새 migration으로만 적용한다. 카드 장수·HTML·PNG/JPG·ZIP과 다운로드 선택은 원본에서 생성하므로 별도 DB 테이블이 필요 없다.

## 공통 사진 편집

원본 파일은 편집·품질 변경으로 교체하지 않는다. rotation / sourceWidth / sourceHeight / crop / quality를 두 도메인이 공유한다. quality는 null / 0.85 / 0.65이며 기존 값이 없으면 null로 처리한다. 미리보기·내려받기는 같은 설정을 적용하고, 사진 교체·삭제 때만 파일 연결을 바꾼다. [상세 동작·운영 설정](photo-workflow.md).
