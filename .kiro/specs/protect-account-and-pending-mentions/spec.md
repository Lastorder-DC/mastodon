# 프로텍트 계정 설정 및 보류 멘션 기능 스펙

## 기능 1: 프로텍트 계정 설정 (사용자 셀프 설정)

### 개요

사용자가 프로필 편집 페이지(`/profile/edit`)에서 "프로텍트 계정" 체크박스를 통해 직접 설정하는 기능. 프로텍트를 활성화하면 팔로워 수동 승인(`locked`)이 켜지고, 기본 게시물 공개 범위가 "팔로워(`private`)"로 고정됩니다. 프로텍트 상태에서는 팔로워 수동 승인 설정과 기본 공개 범위 설정을 개별적으로 변경할 수 없습니다 (변경하려면 프로텍트를 먼저 해제해야 함).

참고 구현 방향: https://github.com/long-while/longwhile-mastodon/commit/0ff2e4dd4e83edcbd6b51ea3b1398ef4159941be

### 동작

1. **프로필 편집 페이지** (`/profile/edit`)에 "프로텍트 계정" 체크박스 추가
2. 체크박스에 설명: "프로텍트를 활성화하면 팔로워 수동 승인이 켜지고 기본 게시물 공개 범위가 '팔로워만'으로 설정됩니다."
3. **프로텍트 활성화 시**:
   - `account.locked = true` (팔로워 수동 승인)
   - `user.settings.default_privacy = 'private'` (기본 공개 범위 "팔로워만")
4. **프로텍트 해제 시**:
   - `account.locked = false`
   - `user.settings.default_privacy = 'unlisted'` (기본값 복원)
   - 대기 중인 팔로우 요청이 있으면 모두 승인 (AutoFollowService) 또는 유지 (사용자 선택)
5. **프로텍트 상태에서 설정 잠금**:
   - 프로필 편집 페이지 또는 개인정보 설정 페이지에서 "팔로워 수동 승인" 체크박스 비활성화
   - "기본 게시물 공개 범위" 드롭다운 비활성화
   - 각 항목 아래 안내 메시지: "프로텍트 설정이 활성화되어 있습니다. 이 설정을 변경하려면 프로텍트를 먼저 해제하세요."

### 백엔드 구현

#### 프로텍트 상태 저장

`accounts` 테이블에 `protected_account` (boolean, default: false) 컬럼 추가.

또는 `user_settings`에 `protected_account` 설정 추가. (마스토돈의 기존 UserSettings DSL 패턴 활용)

#### API

`PATCH /api/v1/profile`에서:
- `protected_account` 파라미터 수신
- `protected_account = true`로 설정 시: `locked = true`, `default_privacy = 'private'` 강제 적용
- `protected_account = false`로 설정 시: `locked = false`, `default_privacy = 'public'` 복원
- `protected_account`가 true인 상태에서 `locked` 또는 `default_privacy` 개별 변경 시도 시 무시

#### 마이그레이션

```ruby
# db/migrate/XXXXXXXX_add_protected_account_to_accounts.rb
class AddProtectedAccountToAccounts < ActiveRecord::Migration[8.0]
  def change
    add_column :accounts, :protected_account, :boolean, default: false, null: false
  end
end
```

### 프론트엔드 구현

#### 프로필 편집 페이지

`/profile/edit` 페이지의 적절한 위치에 체크박스 추가:
- 디자인 참고: Advanced settings 아래 Automated account 설정
- 라벨: "프로텍트 계정"
- 설명 텍스트: "프로텍트를 활성화하면 팔로워 수동 승인이 켜지고 기본 게시물 공개 범위가 '팔로워'로 설정됩니다."
- 체크시 locked + default_privacy 연동

#### 개인정보 설정 잠금

프로텍트 활성 상태에서:
- "팔로워 수동 승인" 체크박스: `disabled` + 안내 텍스트
- "기본 공개 범위" 선택: `disabled` + 안내 텍스트
- 안내 텍스트: "프로텍트 설정이 활성화되어 있어 변경할 수 없습니다. 프로필 편집 페이지에서 프로텍트를 해제하세요."

#### API 응답

`GET /api/v1/profile` 응답에 `protected_account: true/false` 필드 포함하여 프론트엔드에서 잠금 여부 판단.

### i18n

```json
{
  "settings.profile.protected_account": "프로텍트 계정",
  "settings.profile.protected_account_hint": "프로텍트를 활성화하면 팔로워 수동 승인이 켜지고 기본 게시물 공개 범위가 '팔로워'로 설정됩니다.",
  "settings.privacy.protected_locked_notice": "프로텍트 설정이 활성화되어 있어 변경할 수 없습니다. 프로필 편집 페이지에서 프로텍트를 해제하세요."
}
```

---

## 기능 2: 보류 멘션 (Pending Mentions)

### 개요

내가 받은 멘션 중 아직 답변하지 않은 것들을 모아보는 전용 페이지. "답변 대기" 목록으로, 멘션에 아직 답글을 달지 않았고 즐겨찾기(북마크 역할)도 하지 않은 항목을 필터링하여 보여줍니다.

참고 구현: https://github.com/long-while/longwhile-mastodon/commit/3e69d3d66684bafa5ae0691f9ad12a4cf074478c

### 동작

1. 사이드바에 "답장할 멘션" (Awaiting reply) 링크 추가 (알림 다음 위치)
2. `/pending-mentions` 경로로 전용 페이지 표시
3. 기존 알림 시스템의 멘션 데이터를 필터링하여 표시 (새 API 없음)

### 필터 조건 (isAwaitingReply)

멘션 알림이 "보류" 상태인지 판별하는 조건:

```typescript
const isAwaitingReply = (group: NotificationGroup, statuses: StatusesMap): boolean => {
  // 멘션 타입만 대상
  if (group.type !== 'mention') return false;
  // statusId 없으면 제외
  if (!group.statusId) return false;
  
  const status = statuses.get(group.statusId);
  // 상태 로드 안됐으면 안전하게 표시 (놓치는 것보다 노출이 나음)
  if (!status) return true;
  // 내가 즐겨찾기 했으면 제외 (처리 완료로 간주)
  if (status.get('favourited') === true) return false;
  // 답글이 1개 이상이면 제외 (누군가 답변함)
  const repliesCount = status.get('replies_count');
  if (typeof repliesCount === 'number' && repliesCount > 0) return false;
  
  return true;
};
```

> **long-while과의 차이**: long-while에서는 `public` 범위 멘션을 제외하지만, 이 구현에서는 공개 범위와 무관하게 모든 멘션(unlisted 포함)을 보류 대상으로 표시합니다.

### 프론트엔드 구현

#### 새 페이지 컴포넌트

`app/javascript/mastodon/features/pending_mentions/index.tsx`:
- 기존 알림 인프라 재사용 (`notification_groups` reducer, actions)
- `selectPendingMentionGroups` selector로 보류 멘션 필터링
- `NotificationGroup` 컴포넌트로 각 항목 표시
- 빈 상태 메시지: "답변을 기다리는 멘션이 없습니다."
- 상단 설명 문구: "즐겨찾기하면 이 목록에서 제거됩니다."

#### Selector 추가

`app/javascript/mastodon/selectors/notifications.ts`에 추가:
- `isAwaitingReply` 헬퍼 함수
- `selectPendingMentionGroups` - active filter와 무관하게 항상 보류 멘션 조건 적용
- `selectPendingNotificationGroupsCount` - 보류 멘션 개수 (사이드바 배지 표시용, 선택사항)

#### 사이드바 통합

네비게이션 패널에서 알림(NotificationsLink) 다음에 추가:
- 아이콘: Material Icon `mark_chat_unread` 또는 `chat_bubble` 계열
- 텍스트: "보류 멘션" / "Awaiting reply"
- 경로: `/pending-mentions`

#### 라우팅

`config/routes/web_app.rb`에 `/pending-mentions` 추가 (SPA 라우트)

프론트엔드 라우터에도 `/pending-mentions` → PendingMentions 컴포넌트 연결

### i18n

```json
{
  "column.pending_mentions": "답장할 멘션",
  "empty_column.pending_mentions": "답변을 기다리는 멘션이 없습니다.",
  "pending_mentions.explanation": "즐겨찾기하면 이 목록에서 제거됩니다.",
  "navigation_bar.pending_mentions": "답장할 멘션"
}
```

### 참고사항

- 새로운 백엔드 API 불필요. 기존 알림 API의 데이터를 프론트에서 필터링.
- `NotificationGroup` 모델의 `statusId` 필드를 활용.
- 즐겨찾기(favourite)를 "처리 완료" 마커로 사용하는 것이 핵심 UX.
- 추후 백엔드 필터를 추가하면 성능 개선 가능 (알림이 많은 경우).

---

## 구현 순서

1. **기능 1** (프로텍트 계정): DB 마이그레이션 → API (`PATCH /api/v1/profile` 수정) → 프로필 편집 페이지(`/profile/edit`) 체크박스 → 개인정보 설정 잠금
2. **기능 2** (보류 멘션): Selector → 페이지 컴포넌트 → 사이드바 → 라우팅
