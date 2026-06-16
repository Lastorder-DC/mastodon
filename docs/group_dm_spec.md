# 단체 DM 시스템 설계 명세서

> **브랜치**: `occm-groupdm`  
> **최종 수정**: 2025-01  
> **상태**: Draft  

---

## 1. 개요

### 1.1 목표

기존 마스토돈의 "개인 멘션"(Direct Message) 시스템을 유지하면서, 트위터 스타일의 대화방 기반 DM 시스템을 추가한다. 사용자는 `/conversations` 페이지에서 1:1 및 단체 대화방을 통해 메시지를 주고받을 수 있다.

### 1.2 핵심 원칙

1. **기존 DB 스키마 변경 금지**: `conversations`, `account_conversations`, `conversation_mutes` 테이블의 스키마를 절대 변경하지 않는다.
2. **기존 API 응답 변경 금지**: `GET /api/v1/conversations`, `POST /api/v1/conversations/:id/read` 등 기존 API의 응답 형태를 유지한다.
3. **신규 테이블 및 API 추가만 허용**: 새로운 테이블과 API 엔드포인트를 생성하여 단체 DM 기능을 구현한다.
4. **추후 마스토돈 DM 개편 대비**: 마스토돈 공식 DM 시스템 개편 시 호환성을 유지할 수 있도록 설계한다.

### 1.3 기존 시스템 분석

#### 현재 DM 흐름
- 사용자가 `visibility: direct`로 게시글을 작성하면, `FanOutOnWriteService`에서 `AccountConversation.add_status`를 호출하여 대화 항목을 생성한다.
- 수신자에게는 `NotifyService`에서 멘션 알림을 보내고, `push_to_conversation!`으로 대화방 목록을 업데이트한다.
- 프론트엔드에서는 `GET /api/v1/conversations`로 대화 목록을 로드하고, 스트리밍 API(`timeline:direct:{account_id}`)로 실시간 업데이트를 받는다.

#### 현재 테이블 구조 (변경 불가)
```
conversations: id, uri, created_at, updated_at, parent_account_id, parent_status_id
account_conversations: id, account_id, conversation_id, last_status_id, lock_version, participant_account_ids[], status_ids[], unread
conversation_mutes: id, account_id, conversation_id
```

#### 현재 API (변경 불가)
```
GET    /api/v1/conversations          - 대화 목록 조회
DELETE /api/v1/conversations/:id      - 대화 삭제
POST   /api/v1/conversations/:id/read  - 읽음 처리
POST   /api/v1/conversations/:id/unread - 안읽음 처리
```

---

## 2. 신규 DB 스키마

### 2.1 `dm_chat_rooms` (대화방 테이블)

```ruby
# db/migrate/20260602000002_create_dm_chat_rooms.rb
create_table :dm_chat_rooms do |t|
  t.bigint :owner_account_id, null: false    # 대화방 생성자
  t.string :title, default: ''               # 단체DM 시 대화방 이름 (선택)
  t.integer :room_type, null: false, default: 0  # 0: direct(1:1), 1: group(단체)
  t.datetime :last_message_at                # 마지막 메시지 시각 (정렬용)
  t.timestamps
end

add_index :dm_chat_rooms, :owner_account_id
add_index :dm_chat_rooms, :last_message_at
```

### 2.2 `dm_chat_room_accounts` (대화방 참여자 테이블)

```ruby
# db/migrate/20260602000003_create_dm_chat_room_accounts.rb
create_table :dm_chat_room_accounts do |t|
  t.bigint :dm_chat_room_id, null: false
  t.bigint :account_id, null: false
  t.boolean :accepted, null: false, default: false  # 초대 수락 여부
  t.boolean :unread, null: false, default: false    # 미읽 메시지 존재 여부
  t.bigint :last_read_message_id                    # 마지막으로 읽은 메시지 ID
  t.datetime :joined_at
  t.datetime :left_at                               # NULL이면 현재 참여중
  t.timestamps
end

add_index :dm_chat_room_accounts, [:dm_chat_room_id, :account_id], unique: true, name: 'index_dm_room_accounts_unique'
add_index :dm_chat_room_accounts, :account_id
add_index :dm_chat_room_accounts, [:account_id, :unread]
```

### 2.3 `dm_messages` (메시지 테이블)

```ruby
# db/migrate/20260602000004_create_dm_messages.rb
create_table :dm_messages do |t|
  t.bigint :dm_chat_room_id, null: false
  t.bigint :account_id, null: false           # 발신자
  t.text :content, null: false, default: ''    # 메시지 본문 (HTML)
  t.text :content_plain, default: ''           # 평문 (검색/미리보기용)
  t.bigint :in_reply_to_id                     # 답장 대상 메시지 ID (선택)
  t.bigint :status_id                          # 연결된 Status ID (마이그레이션용, nullable)
  t.string :language                           # 메시지 언어
  t.boolean :hidden, null: false, default: false  # 삭제 처리된 메시지
  t.timestamps
end

add_index :dm_messages, [:dm_chat_room_id, :created_at]
add_index :dm_messages, :account_id
add_index :dm_messages, :status_id, where: 'status_id IS NOT NULL'
```

### 2.4 `dm_message_attachments` (메시지 첨부파일 테이블)

```ruby
# db/migrate/20260602000005_create_dm_message_attachments.rb
create_table :dm_message_attachments do |t|
  t.bigint :dm_message_id, null: false
  t.bigint :media_attachment_id, null: false
  t.timestamps
end

add_index :dm_message_attachments, :dm_message_id
add_index :dm_message_attachments, :media_attachment_id
```

### 2.5 ER 다이어그램

```
dm_chat_rooms (1) --- (*) dm_chat_room_accounts (*) --- (1) accounts
dm_chat_rooms (1) --- (*) dm_messages (*) --- (1) accounts
dm_messages   (1) --- (*) dm_message_attachments (*) --- (1) media_attachments
```

---

## 3. 신규 API 엔드포인트

모든 신규 API는 `/api/v1/dm/` 네임스페이스 하에 배치한다.

### 3.1 대화방 관리

#### `GET /api/v1/dm/chat_rooms`
대화방 목록 조회 (현재 사용자가 참여중인 대화방)

**요청 파라미터:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `max_id` | string | 페이지네이션: 이 ID 이전의 대화방 |
| `since_id` | string | 페이지네이션: 이 ID 이후의 대화방 |
| `min_id` | string | 페이지네이션: 이 ID보다 새로운 대화방 |
| `limit` | integer | 반환 개수 (기본: 20, 최대: 40) |

**응답 예시:**
```json
[
  {
    "id": "12345",
    "room_type": "direct",
    "title": "",
    "owner": { /* Account 객체 */ },
    "participants": [
      { /* Account 객체 */ },
      { /* Account 객체 */ }
    ],
    "last_message": {
      "id": "67890",
      "content": "<p>안녕하세요</p>",
      "content_plain": "안녕하세요",
      "account": { /* Account 객체 */ },
      "created_at": "2025-01-15T12:00:00.000Z",
      "attachments": []
    },
    "unread": true,
    "last_message_at": "2025-01-15T12:00:00.000Z",
    "created_at": "2025-01-14T10:00:00.000Z"
  }
]
```

**페이지네이션:** `Link` 헤더를 사용하여 다음/이전 페이지 URL 반환 (기존 마스토돈 패턴)

---

#### `POST /api/v1/dm/chat_rooms`
새 대화방 생성

**요청 본문:**
```json
{
  "account_ids": ["123", "456"],  // 참여시킬 계정 ID 목록
  "title": "프로젝트 논의"          // (선택) 단체DM일 때 대화방 이름
}
```

**비즈니스 로직:**
- `account_ids`가 1개이면 `room_type: direct`(1:1), 2개 이상이면 `room_type: group`(단체)
- 1:1 대화방의 경우: 이미 동일 참여자 조합의 대화방이 있으면 기존 대화방을 반환 (중복 생성 방지)
- 단체 대화방의 경우: 항상 새로 생성
- 차단한 사용자나 차단당한 사용자는 참여자로 추가 불가
- 참여자는 `accepted: false`로 시작 (1:1은 자동 `accepted: true`)

**응답:** 생성된/기존 대화방 객체 (위 형식)

---

#### `GET /api/v1/dm/chat_rooms/:id`
특정 대화방 정보 조회

**응답:** 대화방 객체

---

#### `DELETE /api/v1/dm/chat_rooms/:id`
대화방 나가기 (단체DM) 또는 삭제 (1:1 DM)

**비즈니스 로직:**
- 1:1 대화방: 요청한 사용자의 `dm_chat_room_accounts` 레코드에 `left_at` 설정
- 단체 대화방: 요청한 사용자의 `dm_chat_room_accounts` 레코드에 `left_at` 설정
- 모든 참여자가 나간 경우에만 실제 대화방 데이터 삭제 (배치 작업으로 처리)

---

#### `PATCH /api/v1/dm/chat_rooms/:id`
대화방 정보 수정 (방장만 가능)

**요청 본문:**
```json
{
  "title": "새 제목"
}
```

---

### 3.2 대화방 참여자 관리

#### `POST /api/v1/dm/chat_rooms/:id/members`
참여자 추가 (단체DM, 방장만 가능)

**요청 본문:**
```json
{
  "account_ids": ["789"]
}
```

---

#### `DELETE /api/v1/dm/chat_rooms/:id/members/:account_id`
참여자 제거 (단체DM, 방장만 가능)

---

#### `POST /api/v1/dm/chat_rooms/:id/accept`
대화방 초대 수락

---

### 3.3 메시지 관리

#### `GET /api/v1/dm/chat_rooms/:id/messages`
대화방의 메시지 목록 조회

**요청 파라미터:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `max_id` | string | 이 ID 이전의 메시지 |
| `since_id` | string | 이 ID 이후의 메시지 |
| `min_id` | string | 이 ID보다 새로운 메시지 |
| `limit` | integer | 반환 개수 (기본: 20, 최대: 40) |

**응답 예시:**
```json
[
  {
    "id": "67890",
    "dm_chat_room_id": "12345",
    "account": { /* Account 객체 */ },
    "content": "<p>안녕하세요!</p>",
    "content_plain": "안녕하세요!",
    "in_reply_to_id": null,
    "attachments": [
      { /* MediaAttachment 객체 */ }
    ],
    "created_at": "2025-01-15T12:00:00.000Z",
    "language": "ko"
  }
]
```

---

#### `POST /api/v1/dm/chat_rooms/:id/messages`
메시지 전송

**요청 본문:**
```json
{
  "content": "안녕하세요!",
  "in_reply_to_id": null,
  "media_ids": ["111", "222"],
  "language": "ko"
}
```

**비즈니스 로직:**
- 메시지 본문은 HTML 이스케이프 후 간단한 마크업(링크, 멘션, 이모지) 처리
- `dm_chat_rooms.last_message_at`을 현재 시각으로 업데이트
- 다른 참여자들의 `dm_chat_room_accounts.unread`를 `true`로 설정
- 스트리밍 API로 실시간 전달
- **타임라인에 비표시**: 이 메시지로 인한 Status를 생성하지 않음 (기존 마스토돈 DM과의 차이점)

---

#### `DELETE /api/v1/dm/chat_rooms/:id/messages/:message_id`
메시지 삭제 (본인 메시지만 가능)

**비즈니스 로직:**
- 실제 삭제가 아닌 `hidden: true` 설정 (soft delete)
- 스트리밍으로 삭제 이벤트 전달

---

### 3.4 읽음 처리

#### `POST /api/v1/dm/chat_rooms/:id/read`
대화방 읽음 처리

**요청 본문:**
```json
{
  "last_read_message_id": "67890"  // (선택) 특정 메시지까지 읽음 처리. 미지정시 최신 메시지까지.
}
```

**비즈니스 로직:**
- `dm_chat_room_accounts.unread`를 `false`로 설정
- `dm_chat_room_accounts.last_read_message_id`를 업데이트

---

### 3.5 미읽 카운트

#### `GET /api/v1/dm/unread_count`
전체 미읽 대화방 수 조회

**응답:**
```json
{
  "count": 3
}
```

---

## 4. 모델 설계 (Rails)

### 4.1 신규 모델

```ruby
# app/models/dm_chat_room.rb
class DmChatRoom < ApplicationRecord
  belongs_to :owner_account, class_name: 'Account'
  has_many :dm_chat_room_accounts, dependent: :destroy
  has_many :accounts, through: :dm_chat_room_accounts
  has_many :dm_messages, dependent: :destroy

  enum :room_type, { direct: 0, group: 1 }

  scope :active_for_account, ->(account) {
    joins(:dm_chat_room_accounts)
      .where(dm_chat_room_accounts: { account_id: account.id, left_at: nil })
  }

  scope :ordered, -> { order(last_message_at: :desc) }
end
```

```ruby
# app/models/dm_chat_room_account.rb
class DmChatRoomAccount < ApplicationRecord
  belongs_to :dm_chat_room
  belongs_to :account

  scope :active, -> { where(left_at: nil) }
  scope :unread, -> { where(unread: true) }
end
```

```ruby
# app/models/dm_message.rb
class DmMessage < ApplicationRecord
  belongs_to :dm_chat_room
  belongs_to :account
  belongs_to :in_reply_to, class_name: 'DmMessage', optional: true
  belongs_to :status, optional: true
  has_many :dm_message_attachments, dependent: :destroy
  has_many :media_attachments, through: :dm_message_attachments

  scope :visible, -> { where(hidden: false) }
  scope :ordered, -> { order(created_at: :asc) }
  scope :reverse_ordered, -> { order(created_at: :desc) }

  after_create :update_room_timestamp
  after_create :mark_others_unread
  after_create :push_to_streaming

  private

  def update_room_timestamp
    dm_chat_room.update(last_message_at: created_at)
  end

  def mark_others_unread
    dm_chat_room.dm_chat_room_accounts
      .active
      .where.not(account_id: account_id)
      .update_all(unread: true)
  end

  def push_to_streaming
    PushDmMessageWorker.perform_async(id)
  end
end
```

```ruby
# app/models/dm_message_attachment.rb
class DmMessageAttachment < ApplicationRecord
  belongs_to :dm_message
  belongs_to :media_attachment
end
```

### 4.2 서비스 클래스

```ruby
# app/services/create_dm_chat_room_service.rb
class CreateDmChatRoomService < BaseService
  def call(owner, account_ids:, title: '')
    participants = Account.where(id: account_ids).to_a
    room_type = participants.size == 1 ? :direct : :group

    # 1:1 대화방 중복 체크
    if room_type == :direct
      existing = find_existing_direct_room(owner, participants.first)
      return existing if existing
    end

    # 차단 관계 확인
    validate_no_blocks!(owner, participants)

    dm_chat_room = DmChatRoom.create!(
      owner_account: owner,
      room_type: room_type,
      title: title,
      last_message_at: Time.current
    )

    # 방장은 자동 참여 및 수락
    dm_chat_room.dm_chat_room_accounts.create!(
      account: owner,
      accepted: true,
      joined_at: Time.current
    )

    # 참여자 추가
    participants.each do |participant|
      auto_accept = room_type == :direct
      dm_chat_room.dm_chat_room_accounts.create!(
        account: participant,
        accepted: auto_accept,
        joined_at: Time.current
      )
    end

    dm_chat_room
  end

  private

  def find_existing_direct_room(owner, other)
    owner_rooms = DmChatRoom.direct.active_for_account(owner).pluck(:id)
    other_rooms = DmChatRoom.direct.active_for_account(other).pluck(:id)
    common_room_id = (owner_rooms & other_rooms).first
    DmChatRoom.find_by(id: common_room_id) if common_room_id
  end

  def validate_no_blocks!(owner, participants)
    blocked_ids = Block.where(account: owner).pluck(:target_account_id)
    blocking_ids = Block.where(target_account: owner).pluck(:account_id)
    invalid = participants.select { |p| blocked_ids.include?(p.id) || blocking_ids.include?(p.id) }
    raise ActiveRecord::RecordInvalid if invalid.any?
  end
end
```

```ruby
# app/services/send_dm_message_service.rb
class SendDmMessageService < BaseService
  def call(account, chat_room, content:, media_ids: [], in_reply_to_id: nil, language: nil)
    # 참여자 확인
    membership = chat_room.dm_chat_room_accounts.active.find_by(account: account)
    raise ActiveRecord::RecordNotFound unless membership

    # 메시지 생성
    message = chat_room.dm_messages.create!(
      account: account,
      content: process_content(content),
      content_plain: strip_html(content),
      in_reply_to_id: in_reply_to_id,
      language: language || account.user&.locale
    )

    # 첨부파일 처리
    if media_ids.present?
      media = MediaAttachment.where(id: media_ids, account: account).to_a
      media.each do |attachment|
        message.dm_message_attachments.create!(media_attachment: attachment)
      end
    end

    # 알림 생성
    notify_participants!(chat_room, message, account)

    message
  end

  private

  def process_content(content)
    # 멘션, 링크, 이모지 처리 (기존 StatusFormatter와 유사)
    Formatter.instance.format_dm(content)
  end

  def strip_html(content)
    ActionController::Base.helpers.strip_tags(content)
  end

  def notify_participants!(chat_room, message, sender)
    chat_room.dm_chat_room_accounts
      .active
      .where.not(account_id: sender.id)
      .includes(:account)
      .find_each do |membership|
        NotifyDmService.new.call(membership.account, message)
      end
  end
end
```

---

## 5. 스트리밍 API

### 5.1 신규 스트리밍 채널

기존 `direct` 채널과 별도로 새로운 채널을 추가한다.

**채널명**: `dm`  
**Redis 키**: `timeline:dm:{account_id}`  
**구독 경로**: `/api/v1/streaming/dm`

### 5.2 이벤트 타입

| 이벤트 | 설명 | Payload |
|--------|------|---------|
| `dm_message` | 새 메시지 수신 | DmMessage 객체 (JSON) |
| `dm_message.delete` | 메시지 삭제 | `{ "id": "...", "dm_chat_room_id": "..." }` |
| `dm_chat_room.update` | 대화방 정보 변경 | DmChatRoom 객체 (JSON) |
| `dm_chat_room.new` | 새 대화방 초대 | DmChatRoom 객체 (JSON) |

### 5.3 워커

```ruby
# app/workers/push_dm_message_worker.rb
class PushDmMessageWorker
  include Sidekiq::Worker

  def perform(dm_message_id)
    message = DmMessage.find(dm_message_id)
    chat_room = message.dm_chat_room
    payload = InlineRenderer.render(message, nil, :dm_message)

    chat_room.dm_chat_room_accounts.active.find_each do |membership|
      timeline_id = "timeline:dm:#{membership.account_id}"
      redis.publish(timeline_id, {
        event: :dm_message,
        payload: payload
      }.to_json)
    end
  end
end
```

### 5.4 streaming/index.js 수정

```javascript
// streaming/index.js 에 추가
case 'dm':
  resolve({
    channelIds: [`timeline:dm:${req.accountId}`],
    options: { needsFiltering: false },
  });
  break;
```

---

## 6. 알림 시스템

### 6.1 설계 방향

신규 DM 시스템의 알림은 기존 마스토돈 알림 시스템(Notification 모델)과는 별도로 동작한다. 이유:
- 기존 Notification 모델의 `type` 컬럼에 새 타입을 추가하면 마스토돈 앱 호환성 문제 발생
- DM 알림은 사이드바의 빨간점 + 브라우저 알림으로 충분

### 6.2 알림 전달 방식

1. **실시간 스트리밍**: `dm` 채널을 통해 새 메시지 이벤트 전달
2. **브라우저 Push 알림**: Web Push API를 통한 알림 (기존 `Web::PushNotificationWorker` 패턴 참고)
3. **사이드바 빨간점**: 프론트엔드에서 미읽 카운트 API를 폴링하거나 스트리밍 이벤트로 처리

### 6.3 NotifyDmService

```ruby
# app/services/notify_dm_service.rb
class NotifyDmService < BaseService
  def call(recipient, dm_message)
    return if recipient.id == dm_message.account_id
    return if muting?(recipient, dm_message)
    return if blocking?(recipient, dm_message.account)

    # Web Push 알림
    push_web_notification!(recipient, dm_message)

    # 스트리밍은 PushDmMessageWorker에서 처리
  end

  private

  def muting?(recipient, message)
    # 대화방 뮤트 확인 (향후 구현)
    false
  end

  def blocking?(recipient, sender)
    Block.exists?(account: recipient, target_account: sender)
  end

  def push_web_notification!(recipient, message)
    subscriptions = Web::PushSubscription.where(user_id: recipient.user&.id)
    subscriptions.each do |subscription|
      # DM Push 알림 전송
      Web::PushDmNotificationWorker.perform_async(subscription.id, message.id)
    end
  end
end
```

### 6.4 사운드 알림

프론트엔드에서 `dm_message` 스트리밍 이벤트 수신 시:
- 현재 보고 있는 대화방이 아닌 다른 방의 메시지인 경우 알림 사운드 재생
- `dm_chat_room_accounts.unread` 상태를 Redux store에 반영하여 사이드바에 빨간점 표시

---

## 7. 프론트엔드 UI 설계

### 7.1 전체 레이아웃 (트위터 DM 스타일)

`/conversations` 페이지를 2-패널 레이아웃으로 변경:

```
+------------------------------------------+
|  [검색]  [새 메시지 +]                     |
+------------------------------------------+
|  대화방 목록    |    메시지 뷰              |
|  (좌측 패널)    |    (우측 패널)            |
|                |                          |
|  [User A]      |  [User A 프로필 정보]     |
|  마지막 메시지.. |                          |
|                |  > 메시지 내역            |
|  [Group B]     |  > ...                   |
|  마지막 메시지.. |  > ...                   |
|                |                          |
|                |  [메시지 입력 영역]        |
+------------------------------------------+
```

### 7.2 컴포넌트 구조

```
app/javascript/mastodon/features/dm/
  index.tsx                       # 메인 DM 페이지 (2-패널)
  components/
    chat_room_list.tsx            # 좌측: 대화방 목록
    chat_room_item.tsx            # 개별 대화방 목록 항목
    chat_room_view.tsx            # 우측: 메시지 뷰
    message_item.tsx              # 개별 메시지 말풍선
    message_compose.tsx           # 메시지 입력 영역
    new_chat_room_modal.tsx       # 새 대화방 생성 모달
    chat_room_header.tsx          # 대화방 헤더 (참여자 정보)
    dm_search.tsx                 # 대화방/사용자 검색
```

### 7.3 라우팅

```
/conversations           -> DM 메인 페이지 (대화방 목록만 표시, 모바일에서)
/conversations/:room_id  -> 특정 대화방 열기 (메시지 뷰)
```

기존 `/conversations` 경로를 재사용하되, 내부 컴포넌트를 완전히 교체한다.

### 7.4 좌측 패널: 대화방 목록

- 상단: 검색 바 + "새 메시지" 버튼
- 각 항목: 참여자 아바타, 이름, 마지막 메시지 미리보기, 시간, 미읽 표시(빨간점)
- 1:1 대화방: 상대방 아바타 1개
- 단체 대화방: 참여자 아바타 그룹 (최대 4개) + 대화방 제목
- 클릭 시 우측 패널에 해당 대화방 메시지 표시

### 7.5 우측 패널: 메시지 뷰

- 상단 헤더: 상대방(또는 그룹) 이름, 참여자 수, 설정 아이콘
- 중앙 메시지 영역: 시간순 메시지 목록 (위로 스크롤하면 이전 메시지 로드)
  - 본인 메시지: 우측 정렬, 파란색 말풍선
  - 상대 메시지: 좌측 정렬, 회색 말풍선
  - 각 메시지: 아바타, 이름, 내용, 시간, 첨부파일
- 하단 입력 영역: 텍스트 입력, 이모지 선택, 미디어 첨부, 전송 버튼

### 7.6 사이드바 변경

기존 네비게이션 패널의 "개인 멘션" 링크를 유지하되, 미읽 DM이 있을 때 빨간점을 표시한다.

```tsx
// features/navigation_panel/index.tsx 수정
<ColumnLink
  transparent
  to='/conversations'
  icon='at'
  iconComponent={AlternateEmailIcon}
  text={intl.formatMessage(messages.direct)}
  badge={unreadDmCount > 0}  // 빨간점 표시
/>
```

### 7.7 Redux Store 구조

```typescript
// reducers/dm.ts
interface DmState {
  chatRooms: {
    items: Map<string, DmChatRoom>;
    isLoading: boolean;
    hasMore: boolean;
  };
  messages: {
    [roomId: string]: {
      items: DmMessage[];
      isLoading: boolean;
      hasMore: boolean;
    };
  };
  unreadCount: number;
  activeRoomId: string | null;
}
```

### 7.8 모바일 대응

- 모바일에서는 좌측 패널(대화방 목록)과 우측 패널(메시지 뷰)을 각각 전체 화면으로 표시
- 대화방 클릭 시 메시지 뷰로 전환, 뒤로가기 버튼으로 목록으로 복귀

---

## 8. 기존 DM 마이그레이션 전략

### 8.1 마이그레이션 목표

기존 `account_conversations`에 있는 1:1 대화 내역을 신규 `dm_chat_rooms` / `dm_messages`로 복제한다.

**중요**: 기존 테이블의 데이터를 삭제하거나 변경하지 않는다. 복제만 수행한다.

### 8.2 마이그레이션 워커 (Sidekiq)

```ruby
# app/workers/migrate_conversations_to_dm_worker.rb
class MigrateConversationsToDmWorker
  include Sidekiq::Worker
  sidekiq_options queue: :low

  def perform(account_id)
    account = Account.find(account_id)

    AccountConversation.where(account: account).find_each do |ac|
      migrate_conversation(account, ac)
    end
  end

  private

  def migrate_conversation(account, account_conversation)
    participants = Account.where(id: account_conversation.participant_account_ids).to_a
    return if participants.empty?

    # 1:1 대화방 생성 (또는 기존 것 찾기)
    chat_room = find_or_create_room(account, participants)

    # Status들을 DmMessage로 복제
    statuses = Status.where(id: account_conversation.status_ids)
                     .order(created_at: :asc)
    statuses.find_each do |status|
      next if DmMessage.exists?(status_id: status.id, dm_chat_room_id: chat_room.id)

      chat_room.dm_messages.create!(
        account: status.account,
        content: status.text,
        content_plain: strip_tags(status.text),
        status_id: status.id,
        language: status.language,
        created_at: status.created_at
      )
    end
  end

  def find_or_create_room(account, participants)
    # CreateDmChatRoomService 로직 재사용
    CreateDmChatRoomService.new.call(
      account,
      account_ids: participants.map(&:id)
    )
  end
end
```

### 8.3 마이그레이션 트리거

1. **자동 트리거**: 사용자가 처음 `/conversations` 페이지에 접속할 때 해당 사용자의 기존 대화를 백그라운드에서 마이그레이션
2. **배치 트리거**: 관리자가 `bin/rails dm:migrate_all` Rake 태스크로 전체 사용자의 대화를 마이그레이션

```ruby
# lib/tasks/dm.rake
namespace :dm do
  desc 'Migrate all existing conversations to new DM system'
  task migrate_all: :environment do
    Account.local.find_each do |account|
      MigrateConversationsToDmWorker.perform_async(account.id)
    end
  end
end
```

### 8.4 마이그레이션 상태 추적

```ruby
# account_settings 또는 별도 Redis 키를 사용
# 사용자별로 마이그레이션 완료 여부를 기록
Redis.current.set("dm_migration:#{account_id}", "completed")
```

프론트엔드에서 대화방 목록을 로드할 때:
1. 마이그레이션 완료 여부 확인
2. 미완료 시 마이그레이션 워커 트리거 + "대화 내역을 불러오는 중..." 표시
3. 완료 시 정상적으로 대화방 목록 표시

---

## 9. 타임라인 비표시 처리

### 9.1 핵심 원리

신규 DM 시스템에서 보내는 메시지는 **Status를 생성하지 않는다**. 따라서 타임라인에 자연스럽게 표시되지 않는다.

### 9.2 기존 시스템과의 공존

| 시스템 | 작성 방법 | 타임라인 표시 | 대화방 표시 |
|--------|----------|--------------|-------------|
| 기존 개인 멘션 | 게시글 작성 > 공개범위 "멘션한 사람만" | O (direct visibility) | 기존 API로 조회 가능 |
| 신규 DM | /conversations 페이지에서 직접 전송 | X (Status 미생성) | 신규 API로 조회 |

### 9.3 분기 로직

```ruby
# 신규 DM 메시지 전송 시
# SendDmMessageService에서는 Status를 생성하지 않음
# 따라서 FanOutOnWriteService가 호출되지 않음
# 따라서 타임라인에 표시되지 않음
```

### 9.4 마이그레이션된 메시지

기존에 `visibility: direct`로 작성된 Status가 마이그레이션되어 `dm_messages.status_id`로 연결되더라도:
- 원본 Status는 그대로 존재하며, 기존 API에서는 기존처럼 조회 가능
- 신규 DM UI에서는 `dm_messages` 테이블만 참조

---

## 10. 보안 및 권한

### 10.1 접근 제어

| 동작 | 권한 |
|------|------|
| 대화방 생성 | 로그인한 사용자 |
| 메시지 전송 | 대화방 참여자 (active, accepted) |
| 메시지 조회 | 대화방 참여자 (active) |
| 대화방 수정 | 방장 (owner_account_id) |
| 참여자 추가/제거 | 방장 |
| 대화방 나가기 | 본인 |
| 메시지 삭제 | 메시지 작성자 본인 |

### 10.2 차단 처리

- 차단한 사용자를 대화방에 초대 불가
- 차단당한 사용자가 포함된 대화방에서 메시지 전송 시 해당 사용자에게는 미전달
- 1:1 대화방에서 상대를 차단하면 해당 대화방은 양쪽 모두에서 비활성화

### 10.3 OAuth 스코프

신규 API에 대한 OAuth 스코프:
- 읽기: `read:dm` 또는 `read`
- 쓰기: `write:dm` 또는 `write`

```ruby
# doorkeeper_authorize! :read, :'read:dm'  (조회 API)
# doorkeeper_authorize! :write, :'write:dm' (생성/수정/삭제 API)
```

---

## 11. 컨트롤러 구조

### 11.1 라우팅

```ruby
# config/routes/api.rb 에 추가
namespace :dm do
  resources :chat_rooms, only: [:index, :show, :create, :update, :destroy] do
    member do
      post :read
    end
    resources :messages, only: [:index, :create, :destroy], controller: 'chat_room_messages'
    resources :members, only: [:create, :destroy], controller: 'chat_room_members' do
      collection do
        post :accept
      end
    end
  end
  get :unread_count, to: 'unread#count'
end
```

### 11.2 컨트롤러 파일 구조

```
app/controllers/api/v1/dm/
  chat_rooms_controller.rb
  chat_room_messages_controller.rb
  chat_room_members_controller.rb
  unread_controller.rb
```

---

## 12. Serializer 설계

### 12.1 DmChatRoomSerializer

```ruby
# app/serializers/rest/dm_chat_room_serializer.rb
class REST::DmChatRoomSerializer < ActiveModel::Serializer
  attributes :id, :room_type, :title, :last_message_at, :unread, :created_at

  has_one :owner, serializer: REST::AccountSerializer
  has_many :participants, serializer: REST::AccountSerializer
  has_one :last_message, serializer: REST::DmMessageSerializer

  def id
    object.id.to_s
  end

  def unread
    # 현재 사용자의 unread 상태
    object.dm_chat_room_accounts.find_by(account_id: current_user_account_id)&.unread || false
  end

  def participants
    object.dm_chat_room_accounts.active.includes(:account).map(&:account)
  end

  def last_message
    object.dm_messages.visible.reverse_ordered.first
  end
end
```

### 12.2 DmMessageSerializer

```ruby
# app/serializers/rest/dm_message_serializer.rb
class REST::DmMessageSerializer < ActiveModel::Serializer
  attributes :id, :dm_chat_room_id, :content, :content_plain, :in_reply_to_id, :created_at, :language

  has_one :account, serializer: REST::AccountSerializer
  has_many :media_attachments, serializer: REST::MediaAttachmentSerializer

  def id
    object.id.to_s
  end

  def dm_chat_room_id
    object.dm_chat_room_id.to_s
  end

  def in_reply_to_id
    object.in_reply_to_id&.to_s
  end

  def media_attachments
    object.dm_message_attachments.includes(:media_attachment).map(&:media_attachment)
  end
end
```

---

## 13. 성능 고려사항

### 13.1 인덱스 전략

- `dm_chat_rooms`: `last_message_at` 인덱스로 정렬 성능 확보
- `dm_chat_room_accounts`: `(account_id, unread)` 인덱스로 미읽 카운트 빠르게 조회
- `dm_messages`: `(dm_chat_room_id, created_at)` 인덱스로 메시지 목록 조회 최적화

### 13.2 N+1 방지

- 대화방 목록 조회 시 `includes(:dm_chat_room_accounts, :accounts)` 사용
- 메시지 목록 조회 시 `includes(:account, :media_attachments)` 사용

### 13.3 캐싱

- 미읽 카운트: Redis 캐시 사용 (키: `dm:unread:#{account_id}`)
- 대화방 목록의 마지막 메시지: 쿼리 시 서브쿼리로 처리

### 13.4 페이지네이션

모든 목록 API는 ID 기반 커서 페이지네이션을 사용한다 (기존 마스토돈 패턴과 동일).

---

## 14. 테스트 전략

### 14.1 모델 테스트

```
spec/models/dm_chat_room_spec.rb
spec/models/dm_chat_room_account_spec.rb
spec/models/dm_message_spec.rb
```

### 14.2 서비스 테스트

```
spec/services/create_dm_chat_room_service_spec.rb
spec/services/send_dm_message_service_spec.rb
spec/services/notify_dm_service_spec.rb
```

### 14.3 컨트롤러 테스트

```
spec/requests/api/v1/dm/chat_rooms_spec.rb
spec/requests/api/v1/dm/chat_room_messages_spec.rb
spec/requests/api/v1/dm/chat_room_members_spec.rb
spec/requests/api/v1/dm/unread_spec.rb
```

### 14.4 워커 테스트

```
spec/workers/push_dm_message_worker_spec.rb
spec/workers/migrate_conversations_to_dm_worker_spec.rb
```

---

## 15. 구현 순서 (단계별)

### Phase 1: 백엔드 기초
1. DB 마이그레이션 생성 (신규 테이블 4개)
2. 모델 생성 및 관계 설정
3. 서비스 클래스 구현 (CreateDmChatRoomService, SendDmMessageService)
4. API 컨트롤러 구현
5. Serializer 구현

### Phase 2: 스트리밍 & 알림
6. PushDmMessageWorker 구현
7. streaming/index.js에 dm 채널 추가
8. NotifyDmService 및 Web Push 알림 구현

### Phase 3: 프론트엔드 기본
9. Redux store 및 actions 구현
10. 대화방 목록 UI
11. 메시지 뷰 UI
12. 메시지 입력/전송 UI

### Phase 4: 프론트엔드 고급
13. 새 대화방 생성 모달
14. 사이드바 미읽 표시
15. 사운드 알림
16. 모바일 반응형 대응

### Phase 5: 마이그레이션 & 마무리
17. 마이그레이션 워커 구현
18. Rake 태스크 구현
19. 기존 대화 자동 마이그레이션 트리거
20. 통합 테스트

---

## 16. 향후 고려사항

- **E2E 암호화**: 향후 마스토돈에서 DM E2E 암호화가 구현되면 연동 필요
- **연합(Federation)**: 현재는 로컬 사용자 간 DM만 지원. 향후 ActivityPub을 통한 원격 사용자 DM 지원 검토
- **읽음 확인(Read Receipts)**: 상대방이 메시지를 읽었는지 표시하는 기능 (선택적)
- **타이핑 인디케이터**: 상대방이 입력 중임을 표시하는 기능
- **메시지 검색**: 대화방 내 메시지 전문 검색
- **마스토돈 DM 개편 대응**: 마스토돈 공식 DM 시스템 개편 시 스키마 통합 전략 수립 필요
