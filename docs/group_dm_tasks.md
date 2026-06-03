# 단체 DM 시스템 구현 태스크 문서

> **관련 문서**: [설계 명세서](./group_dm_spec.md) | [디자인 문서](./group_dm_design.md)  
> **브랜치**: `occm-groupdm`  
> **최종 수정**: 2025-01  
> **상태**: Draft  

---

## 개요

설계 명세서의 Phase 1-5 구조를 기반으로, 각 단계를 개별 개발자 태스크로 세분화한 문서이다.
각 태스크에는 체크박스, 예상 소요 시간, 의존성, 주요 작업 내용을 포함한다.

**난이도 범례:**
- 🟢 쉬움 (1-2시간)
- 🟡 보통 (2-4시간)
- 🔴 어려움 (4시간 이상)

**상태 범례:**
- [ ] 미시작
- [x] 완료

---

## Phase 1: 백엔드 기초 (DB + 모델 + API)

### 1.1 데이터베이스 마이그레이션

- [ ] **T-101** 🟢 `dm_chat_rooms` 테이블 마이그레이션 생성
  - 파일: `db/migrate/XXXXXX_create_dm_chat_rooms.rb`
  - 컬럼: owner_account_id, title, room_type, last_message_at, timestamps
  - 인덱스: owner_account_id, last_message_at
  - 의존성: 없음

- [ ] **T-102** 🟢 `dm_chat_room_accounts` 테이블 마이그레이션 생성
  - 파일: `db/migrate/XXXXXX_create_dm_chat_room_accounts.rb`
  - 컬럼: dm_chat_room_id, account_id, accepted, unread, last_read_message_id, joined_at, left_at, timestamps
  - 인덱스: (dm_chat_room_id, account_id) unique, account_id, (account_id, unread)
  - 의존성: T-101

- [ ] **T-103** 🟢 `dm_messages` 테이블 마이그레이션 생성
  - 파일: `db/migrate/XXXXXX_create_dm_messages.rb`
  - 컬럼: dm_chat_room_id, account_id, content, content_plain, in_reply_to_id, status_id, language, hidden, timestamps
  - 인덱스: (dm_chat_room_id, created_at), account_id, status_id(partial)
  - 의존성: T-101

- [ ] **T-104** 🟢 `dm_message_attachments` 테이블 마이그레이션 생성
  - 파일: `db/migrate/XXXXXX_create_dm_message_attachments.rb`
  - 컬럼: dm_message_id, media_attachment_id, timestamps
  - 인덱스: dm_message_id, media_attachment_id
  - 의존성: T-103

- [ ] **T-105** 🟡 마이그레이션 실행 및 schema.rb 업데이트 검증
  - `bin/rails db:migrate` 실행
  - schema.rb에 신규 테이블 반영 확인
  - 롤백 테스트 (`db:rollback STEP=4`)
  - 의존성: T-101, T-102, T-103, T-104

### 1.2 모델 생성

- [ ] **T-106** 🟢 `DmChatRoom` 모델 생성
  - 파일: `app/models/dm_chat_room.rb`
  - 관계: belongs_to :owner_account, has_many :dm_chat_room_accounts, has_many :dm_messages
  - enum: room_type (direct: 0, group: 1)
  - scope: active_for_account, ordered
  - 의존성: T-105

- [ ] **T-107** 🟢 `DmChatRoomAccount` 모델 생성
  - 파일: `app/models/dm_chat_room_account.rb`
  - 관계: belongs_to :dm_chat_room, belongs_to :account
  - scope: active, unread
  - 의존성: T-105

- [ ] **T-108** 🟢 `DmMessage` 모델 생성
  - 파일: `app/models/dm_message.rb`
  - 관계: belongs_to :dm_chat_room, belongs_to :account, has_many :dm_message_attachments
  - scope: visible, ordered, reverse_ordered
  - 콜백: after_create -> update_room_timestamp, mark_others_unread, push_to_streaming
  - 의존성: T-105

- [ ] **T-109** 🟢 `DmMessageAttachment` 모델 생성
  - 파일: `app/models/dm_message_attachment.rb`
  - 관계: belongs_to :dm_message, belongs_to :media_attachment
  - 의존성: T-105

- [ ] **T-110** 🟡 모델 단위 테스트 작성
  - 파일: `spec/models/dm_chat_room_spec.rb`, `spec/models/dm_message_spec.rb` 등
  - 관계, scope, 콜백 검증
  - 의존성: T-106, T-107, T-108, T-109

### 1.3 서비스 클래스

- [ ] **T-111** 🟡 `CreateDmChatRoomService` 구현
  - 파일: `app/services/create_dm_chat_room_service.rb`
  - 기능: 1:1 중복 방지, 단체 대화방 생성, 차단 검증, 참여자 추가
  - 의존성: T-106, T-107

- [ ] **T-112** 🟡 `SendDmMessageService` 구현
  - 파일: `app/services/send_dm_message_service.rb`
  - 기능: 참여자 확인, 메시지 생성, HTML 처리, 첨부파일, 알림 트리거
  - 의존성: T-108, T-109

- [ ] **T-113** 🟡 서비스 클래스 테스트 작성
  - 파일: `spec/services/create_dm_chat_room_service_spec.rb`, `spec/services/send_dm_message_service_spec.rb`
  - 정상 흐름, 예외 케이스, 차단 시나리오 검증
  - 의존성: T-111, T-112

### 1.4 Serializer

- [ ] **T-114** 🟢 `REST::DmChatRoomSerializer` 구현
  - 파일: `app/serializers/rest/dm_chat_room_serializer.rb`
  - 속성: id, room_type, title, last_message_at, unread, created_at, owner, participants, last_message
  - 의존성: T-106

- [ ] **T-115** 🟢 `REST::DmMessageSerializer` 구현
  - 파일: `app/serializers/rest/dm_message_serializer.rb`
  - 속성: id, dm_chat_room_id, content, content_plain, in_reply_to_id, created_at, language, account, media_attachments
  - 의존성: T-108

### 1.5 API 컨트롤러

- [ ] **T-116** 🟡 라우팅 설정
  - 파일: `config/routes/api.rb`
  - `/api/v1/dm/` 네임스페이스 하에 chat_rooms, messages, members, unread_count 라우트 추가
  - 의존성: 없음

- [ ] **T-117** 🟡 `Api::V1::Dm::ChatRoomsController` 구현
  - 파일: `app/controllers/api/v1/dm/chat_rooms_controller.rb`
  - 액션: index, show, create, update, destroy, read
  - 인증: doorkeeper_authorize!
  - 페이지네이션: Link 헤더 패턴 적용
  - 의존성: T-111, T-114, T-116

- [ ] **T-118** 🟡 `Api::V1::Dm::ChatRoomMessagesController` 구현
  - 파일: `app/controllers/api/v1/dm/chat_room_messages_controller.rb`
  - 액션: index, create, destroy
  - 의존성: T-112, T-115, T-116

- [ ] **T-119** 🟡 `Api::V1::Dm::ChatRoomMembersController` 구현
  - 파일: `app/controllers/api/v1/dm/chat_room_members_controller.rb`
  - 액션: create, destroy, accept
  - 방장 권한 확인 로직
  - 의존성: T-107, T-116

- [ ] **T-120** 🟢 `Api::V1::Dm::UnreadController` 구현
  - 파일: `app/controllers/api/v1/dm/unread_controller.rb`
  - 액션: count
  - 의존성: T-107, T-116

- [ ] **T-121** 🔴 API 요청 테스트 작성
  - 파일: `spec/requests/api/v1/dm/` 디렉토리 하위
  - 모든 엔드포인트의 정상/에러 케이스 검증
  - 인증, 권한, 페이지네이션 테스트
  - 의존성: T-117, T-118, T-119, T-120

---

## Phase 2: 스트리밍 및 알림

### 2.1 스트리밍

- [ ] **T-201** 🟡 `PushDmMessageWorker` 구현
  - 파일: `app/workers/push_dm_message_worker.rb`
  - 기능: Redis pub/sub으로 대화방 참여자들에게 메시지 이벤트 전달
  - Redis 키: `timeline:dm:{account_id}`
  - 의존성: T-108

- [ ] **T-202** 🟡 streaming/index.js에 `dm` 채널 추가
  - 파일: `streaming/index.js`
  - 기능: 'dm' 채널 구독 핸들러 추가
  - 인증 검증 로직 포함
  - 의존성: 없음

- [ ] **T-203** 🟢 스트리밍 이벤트 타입 정의
  - 이벤트: dm_message, dm_message.delete, dm_chat_room.update, dm_chat_room.new
  - InlineRenderer에 dm_message 등록
  - 의존성: T-115, T-201

- [ ] **T-204** 🟡 스트리밍 테스트 작성
  - 파일: `spec/workers/push_dm_message_worker_spec.rb`
  - Redis publish 호출 검증
  - 의존성: T-201, T-203

### 2.2 알림

- [ ] **T-205** 🟡 `NotifyDmService` 구현
  - 파일: `app/services/notify_dm_service.rb`
  - 기능: 뮤트/차단 확인, Web Push 알림 발송
  - 의존성: T-108

- [ ] **T-206** 🟡 `Web::PushDmNotificationWorker` 구현
  - 파일: `app/workers/web/push_dm_notification_worker.rb`
  - 기능: Web Push 구독에 DM 알림 전달
  - 기존 `Web::PushNotificationWorker` 패턴 참고
  - 의존성: T-205

- [ ] **T-207** 🟡 알림 서비스 테스트 작성
  - 파일: `spec/services/notify_dm_service_spec.rb`
  - 정상 알림, 뮤트 시 미전달, 차단 시 미전달 검증
  - 의존성: T-205, T-206

---

## Phase 3: 프론트엔드 기본

### 3.1 상태 관리 (Redux)

- [ ] **T-301** 🟡 DM Redux store 설계 및 구현
  - 파일: `app/javascript/mastodon/reducers/dm.ts`
  - 상태: chatRooms, messages, unreadCount, activeRoomId
  - 의존성: 없음

- [ ] **T-302** 🟡 DM API 클라이언트 함수 작성
  - 파일: `app/javascript/mastodon/api/dm.ts`
  - 함수: fetchChatRooms, createChatRoom, fetchMessages, sendMessage, markAsRead, fetchUnreadCount
  - 의존성: 없음

- [ ] **T-303** 🟡 DM 액션 및 thunk 작성
  - 파일: `app/javascript/mastodon/actions/dm.ts`
  - 비동기 액션: 대화방 목록 로드, 메시지 로드, 메시지 전송, 읽음 처리
  - 의존성: T-301, T-302

- [ ] **T-304** 🟡 DM 스트리밍 연결 구현
  - 파일: `app/javascript/mastodon/actions/streaming_dm.ts`
  - 기능: dm 채널 구독, 이벤트별 Redux 액션 디스패치
  - 의존성: T-301, T-303

### 3.2 대화방 목록 UI

- [ ] **T-305** 🟡 DM 메인 페이지 컨테이너 구현
  - 파일: `app/javascript/mastodon/features/dm/index.tsx`
  - 기능: 2-패널 레이아웃, 반응형 처리
  - 의존성: T-301

- [ ] **T-306** 🟡 대화방 목록 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/chat_room_list.tsx`
  - 기능: 대화방 목록 렌더링, 무한 스크롤, 로딩 상태
  - 의존성: T-303, T-305

- [ ] **T-307** 🟢 대화방 항목 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/chat_room_item.tsx`
  - 기능: 아바타, 이름, 미리보기, 시간, 미읽 표시
  - 의존성: T-305

- [ ] **T-308** 🟢 대화방 목록 헤더 구현
  - 파일: `app/javascript/mastodon/features/dm/components/chat_room_list_header.tsx`
  - 기능: 제목, 검색, 새 메시지 버튼
  - 의존성: T-305

- [ ] **T-309** 🟢 그룹 아바타 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/group_avatar.tsx`
  - 기능: 2-4개 아바타 겹침/격자 배치
  - 의존성: 없음

### 3.3 메시지 뷰 UI

- [ ] **T-310** 🟡 메시지 뷰 컨테이너 구현
  - 파일: `app/javascript/mastodon/features/dm/components/chat_room_view.tsx`
  - 기능: 헤더 + 메시지 목록 + 입력 영역 조합
  - 의존성: T-303, T-305

- [ ] **T-311** 🟡 메시지 목록 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/message_list.tsx`
  - 기능: 메시지 렌더링, 무한 스크롤 (위로), 자동 스크롤, 날짜 구분선
  - 의존성: T-310

- [ ] **T-312** 🟡 메시지 말풍선 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/message_item.tsx`
  - 기능: 좌/우 정렬, 연속 메시지 처리, 첨부파일 표시
  - 의존성: T-311

- [ ] **T-313** 🟡 메시지 입력 영역 구현
  - 파일: `app/javascript/mastodon/features/dm/components/message_compose.tsx`
  - 기능: 텍스트 입력, 이모지, 첨부, 전송, Enter/Shift+Enter 동작
  - 의존성: T-310

- [ ] **T-314** 🟢 대화방 헤더 구현
  - 파일: `app/javascript/mastodon/features/dm/components/chat_room_header.tsx`
  - 기능: 참여자 정보, 설정 버튼
  - 의존성: T-310

### 3.4 라우팅 및 연결

- [ ] **T-315** 🟢 라우팅 설정
  - 파일: 기존 라우터 파일 수정
  - 경로: `/conversations` -> DM 메인 페이지, `/conversations/:room_id` -> 특정 대화방
  - 의존성: T-305

- [ ] **T-316** 🟡 스타일시트 작성
  - 파일: `app/javascript/mastodon/features/dm/styles/dm.scss` 등
  - 기능: 전체 DM UI 스타일 (다크/라이트 모드 포함)
  - 의존성: T-305 ~ T-314

---

## Phase 4: 프론트엔드 고급

### 4.1 대화방 생성

- [ ] **T-401** 🟡 새 대화방 생성 모달 구현
  - 파일: `app/javascript/mastodon/features/dm/components/new_chat_room_modal.tsx`
  - 기능: 사용자 검색, 선택 태그, 그룹 이름 입력, 대화방 생성
  - 의존성: T-303

- [ ] **T-402** 🟢 사용자 검색 자동완성 연동
  - 기존 마스토돈 사용자 검색 API 활용
  - 검색 결과 목록 렌더링
  - 의존성: T-401

### 4.2 사이드바 통합

- [ ] **T-403** 🟡 사이드바 미읽 배지 구현
  - 파일: `app/javascript/mastodon/features/navigation_panel/index.tsx` 수정
  - 기능: DM 미읽 카운트 조회, 빨간점 표시, 스트리밍 연동
  - 의존성: T-303, T-304

- [ ] **T-404** 🟢 미읽 카운트 폴링/스트리밍 연동
  - 기능: 앱 초기화 시 미읽 카운트 조회, 스트리밍으로 실시간 업데이트
  - 의존성: T-303, T-304

### 4.3 알림 UI

- [ ] **T-405** 🟢 DM 사운드 알림 구현
  - 파일: `app/javascript/mastodon/features/dm/utils/notification_sound.ts`
  - 기능: 새 메시지 수신 시 사운드 재생 (현재 대화방 외 메시지만)
  - 사용자 설정 연동
  - 의존성: T-304

- [ ] **T-406** 🟢 브라우저 Push 알림 표시
  - 기존 Web Push 시스템 연동
  - 알림 클릭 시 해당 대화방으로 이동
  - 의존성: T-206

### 4.4 모바일 대응

- [ ] **T-407** 🟡 모바일 단일 패널 전환 구현
  - 파일: `app/javascript/mastodon/features/dm/index.tsx` 수정
  - 기능: 768px 미만에서 목록/메시지 뷰 전환, 뒤로가기 동작
  - 의존성: T-305, T-310

- [ ] **T-408** 🟢 모바일 전환 애니메이션 적용
  - slide-left/right 트랜지션
  - 의존성: T-407

### 4.5 UX 개선

- [ ] **T-409** 🟢 빈 상태(Empty State) 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/empty_state.tsx`
  - 대화방 없음, 대화방 미선택, 메시지 없음 상태
  - 의존성: T-305, T-310

- [ ] **T-410** 🟢 낙관적 업데이트 구현
  - 메시지 전송 시 즉시 UI 반영, 실패 시 에러 표시
  - 의존성: T-303, T-312

- [ ] **T-411** 🟢 스켈레톤 로딩 구현
  - 대화방 목록, 메시지 목록의 로딩 플레이스홀더
  - 의존성: T-306, T-311

- [ ] **T-412** 🟢 날짜 구분선 컴포넌트 구현
  - 파일: `app/javascript/mastodon/features/dm/components/date_separator.tsx`
  - 의존성: T-311

---

## Phase 5: 마이그레이션 및 마무리

### 5.1 기존 대화 마이그레이션

- [ ] **T-501** 🔴 `MigrateConversationsToDmWorker` 구현
  - 파일: `app/workers/migrate_conversations_to_dm_worker.rb`
  - 기능: account_conversations -> dm_chat_rooms/dm_messages 데이터 복제
  - 중복 마이그레이션 방지 (status_id 체크)
  - 의존성: T-106, T-108, T-111

- [ ] **T-502** 🟡 Rake 태스크 구현
  - 파일: `lib/tasks/dm.rake`
  - 태스크: `dm:migrate_all` - 전체 사용자 마이그레이션
  - 의존성: T-501

- [ ] **T-503** 🟡 자동 마이그레이션 트리거 구현
  - 사용자가 DM 페이지 최초 접속 시 백그라운드 마이그레이션 시작
  - Redis를 활용한 마이그레이션 상태 추적
  - 프론트엔드에서 "대화 내역을 불러오는 중..." 표시
  - 의존성: T-501, T-305

- [ ] **T-504** 🟡 마이그레이션 워커 테스트 작성
  - 파일: `spec/workers/migrate_conversations_to_dm_worker_spec.rb`
  - 정상 마이그레이션, 중복 방지, 에러 처리 검증
  - 의존성: T-501

### 5.2 보안 및 권한

- [ ] **T-505** 🟡 OAuth 스코프 등록
  - `read:dm`, `write:dm` 스코프 추가
  - Doorkeeper 설정 업데이트
  - 의존성: T-116

- [ ] **T-506** 🟢 권한 검증 로직 추가
  - 각 컨트롤러에 방장 권한, 참여자 권한 확인 before_action 추가
  - 의존성: T-117, T-118, T-119

- [ ] **T-507** 🟡 차단 관계에 따른 DM 제한 구현
  - 차단 시 대화방 비활성화
  - 차단된 사용자에게 메시지 미전달
  - 의존성: T-111, T-112

### 5.3 성능 최적화

- [ ] **T-508** 🟡 N+1 쿼리 최적화
  - includes/preload 적용
  - bullet gem으로 N+1 감지
  - 의존성: T-117, T-118

- [ ] **T-509** 🟢 Redis 캐싱 구현
  - 미읽 카운트 캐싱 (키: `dm:unread:{account_id}`)
  - 캐시 무효화 로직
  - 의존성: T-120, T-201

- [ ] **T-510** 🟢 페이지네이션 성능 검증
  - 대용량 데이터(10만 메시지) 환경에서 응답 시간 측정
  - 인덱스 활용 확인 (EXPLAIN ANALYZE)
  - 의존성: T-117, T-118

### 5.4 통합 테스트

- [ ] **T-511** 🔴 전체 흐름 통합 테스트 작성
  - 대화방 생성 -> 메시지 전송 -> 스트리밍 수신 -> 읽음 처리 전체 흐름
  - 의존성: T-121, T-204, T-207

- [ ] **T-512** 🟡 프론트엔드 컴포넌트 테스트 작성
  - Jest를 활용한 주요 컴포넌트 렌더링/인터랙션 테스트
  - 의존성: Phase 3, Phase 4

- [ ] **T-513** 🟡 접근성 테스트
  - 키보드 네비게이션 검증
  - ARIA 속성 검증
  - 스크린 리더 호환성 확인
  - 의존성: Phase 3, Phase 4

### 5.5 문서화

- [ ] **T-514** 🟢 API 문서 작성
  - 신규 API 엔드포인트에 대한 개발자 문서
  - 요청/응답 예시 포함
  - 의존성: Phase 1 완료

- [ ] **T-515** 🟢 배포 가이드 작성
  - 마이그레이션 실행 순서
  - 환경 변수 설정
  - 롤백 절차
  - 의존성: 전체 구현 완료

---

## 태스크 의존성 요약

```
Phase 1 (백엔드 기초)
  T-101 -> T-102, T-103 -> T-104
  T-101~T-104 -> T-105 -> T-106~T-109 -> T-110
  T-106, T-107 -> T-111, T-112 -> T-113
  T-106, T-108 -> T-114, T-115
  T-116 독립 -> T-117~T-120 -> T-121

Phase 2 (스트리밍/알림)
  T-108 -> T-201 -> T-203 -> T-204
  T-202 독립
  T-108 -> T-205 -> T-206 -> T-207

Phase 3 (프론트엔드 기본)
  T-301~T-304 (상태 관리, 독립적으로 시작 가능)
  T-301 -> T-305~T-316

Phase 4 (프론트엔드 고급)
  Phase 3 -> T-401~T-412

Phase 5 (마이그레이션/마무리)
  T-106, T-108 -> T-501 -> T-502, T-503, T-504
  T-116 -> T-505, T-506
  Phase 1~4 -> T-511~T-515
```

---

## 예상 일정

| 단계 | 태스크 수 | 예상 소요 | 병렬 작업 가능 여부 |
|------|----------|----------|-------------------|
| Phase 1 | 21개 | 5-7일 | 모델/서비스/API 일부 병렬 가능 |
| Phase 2 | 7개 | 2-3일 | 스트리밍/알림 병렬 가능 |
| Phase 3 | 16개 | 5-7일 | 상태관리와 UI 컴포넌트 병렬 가능 |
| Phase 4 | 12개 | 3-5일 | 대부분 독립적 |
| Phase 5 | 15개 | 4-6일 | 마이그레이션/보안/성능 병렬 가능 |
| **합계** | **71개** | **19-28일** | 2인 병렬 작업 시 약 14-20일 |

---

## 우선순위 매트릭스

### 반드시 필요 (Must Have)
- Phase 1 전체 (DB, 모델, API)
- Phase 2의 T-201, T-202, T-203 (스트리밍 기본)
- Phase 3의 T-301~T-314 (기본 UI)
- Phase 5의 T-505, T-506 (보안)

### 있으면 좋음 (Should Have)
- Phase 2의 T-205, T-206 (Push 알림)
- Phase 3의 T-315, T-316 (라우팅, 스타일)
- Phase 4의 T-401~T-404 (대화방 생성, 사이드바)
- Phase 5의 T-501~T-504 (마이그레이션)

### 추후 구현 (Nice to Have)
- Phase 4의 T-405~T-412 (사운드, 애니메이션, 빈 상태)
- Phase 5의 T-508~T-510 (성능 최적화)
- Phase 5의 T-511~T-515 (통합 테스트, 문서화)
