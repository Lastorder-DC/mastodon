# 커뮤니티 그룹 UI 마스토돈 방식 정렬 계획

## 목적

현재 그룹 UI는 필요한 기능을 한 파일에 빠르게 모아 구현한 형태에 가깝다. 이 문서는 그룹 기능 관련 UI 전반을 점검하고, 마스토돈의 기존 웹 앱 구조와 비교해 어색한 부분을 마스토돈 방식으로 재구현하기 위한 계획을 정리한다.

## 점검 범위

- 그룹 목록, 생성, 가입, 상세, 타임라인, 게시, 관리 UI
- 내비게이션 패널의 그룹 진입점
- API 호출과 상태 관리 방식
- 폼 컴포넌트, 계정 표시, 상태 표시, 모달, 알림, 오류 처리
- 그룹 관련 i18n 메시지와 접근성

## 현재 구현에서 어색한 부분

### 1. 너무 많은 책임을 가진 단일 파일

`app/javascript/mastodon/features/community_groups/index.tsx`가 목록, 생성, 공유 토큰 가입, 상세, 게시, 설정, 멤버 관리, 가입 신청, 초대, 차단, 신고 처리를 모두 담당한다. 마스토돈의 리스트 기능은 목록, 생성/편집, 멤버 관리를 파일과 라우트로 분리하므로 그룹도 기능 단위로 나눠야 한다.

### 2. Redux/Typed action 대신 컴포넌트 내부 API 직접 호출에 의존

그룹 UI는 `api().get/post/put/delete`를 컴포넌트 내부에서 직접 호출하고 로컬 `useState`에 결과를 저장한다. 리스트 기능은 `actions`, `reducers`, `selectors`, typed action, API helper를 조합해 목록 상태를 공유한다. 그룹도 반복 조회와 내비게이션 패널 표시가 필요하므로 최소한 그룹 목록과 상세 기본 정보는 스토어로 이동해야 한다.

### 3. 공용 UI 컴포넌트 미사용

그룹 폼은 `input.setting-text`, `textarea.setting-text`, 직접 만든 `PlainButton`, `SecondaryButton`을 사용한다. 리스트 생성/편집은 `TextInputField`, `SelectField`, `Toggle` 같은 공용 폼 컴포넌트를 사용한다. 그룹도 공용 컴포넌트를 사용해 스타일, 접근성, 오류 상태를 맞춰야 한다.

### 4. 상태 타임라인을 직접 렌더링

그룹 상세 화면은 `ApiStatusJSON`을 직접 순회하면서 `dangerouslySetInnerHTML`로 본문을 렌더링한다. 마스토돈에는 이미 `StatusList`, `Status`, `StatusContainer`, status relationship presenter 기반 렌더링이 있으므로 그룹 타임라인도 기존 타임라인 컴포넌트를 재사용해야 한다. 그래야 미디어, 투표, 카드, 번역, 필터, 경고, 부스트/즐겨찾기 상태, 접근성 처리가 일관된다.

### 5. 그룹 게시 작성기가 기존 compose 흐름과 분리됨

그룹 게시 UI는 단순 textarea와 `/api/v1/statuses` 직접 호출로 구현되어 있다. 마스토돈의 게시 작성기는 미디어, CW, 이모지, 언어, 예약, 설문, draft 경고, 권한 상태를 처리한다. 그룹 전용 visibility와 `community_group_id`를 compose 상태에 통합하는 계획이 필요하다.

### 6. 계정 선택이 ID 수동 입력 방식

초대, 차단, 소유권 이전은 모두 로컬 계정 ID를 직접 입력한다. 리스트 멤버 추가 UI는 계정 검색과 계정 행을 제공한다. 그룹 관리 UI도 `useSearchAccounts`, `Account`, `DisplayName`, `Button`, 확인 모달을 사용해 계정 검색 기반으로 바꿔야 한다.

### 7. 위험한 작업에 확인 모달이 없음

그룹 삭제, 멤버 제거, 차단, 소유권 이전, 그룹 게시물 삭제가 즉시 실행된다. 리스트 삭제는 확인 모달을 사용한다. 그룹도 기존 `openModal`/confirmation modal 패턴으로 위험 작업을 보호해야 한다.

### 8. 내비게이션 패널이 리스트 패널과 불균형

계획 문서에는 "My groups"를 리스트 위에 추가한다고 되어 있으나, 현재 내비게이션은 리스트 패널 다음에 단일 그룹 링크만 표시한다. 그룹도 `ListPanel`과 유사한 `GroupPanel`을 만들어 내 그룹을 접이식으로 표시하고, 계획대로 리스트보다 위에 배치해야 한다.

### 9. 신고 UI가 기존 신고 플로우와 분리됨

그룹 신고는 상세 화면 안의 수동 텍스트 입력으로만 처리된다. 기존 마스토돈 신고 모달은 계정, 상태, 규칙, 코멘트, 카테고리 플로우를 제공한다. 그룹 신고가 일반 서버 신고와 정책적으로 다르더라도, UI는 기존 신고 모달의 단계형 구조와 검토 화면을 참고해야 한다.

### 10. 오류, 로딩, 페이지네이션 처리가 부족함

그룹 목록과 상세는 첫 페이지 로딩 중심이며, 그룹 타임라인/멤버/신고/차단 목록의 pagination과 append loading이 없다. 마스토돈 타임라인과 계정 목록은 `ScrollableList`, link header, `isLoading`, `hasMore` 패턴을 사용한다. 그룹 UI도 긴 목록을 전제로 페이지네이션을 구현해야 한다.

## 마스토돈 방식 재구현 계획

### 1단계: 파일 구조 재편

다음과 같이 그룹 기능을 분리한다.

```text
app/javascript/mastodon/features/community_groups/
  index.tsx                 # 그룹 목록
  edit.tsx                  # 생성/편집
  timeline.tsx              # 그룹 상세 타임라인
  members.tsx               # 멤버 검색/추가/역할 관리
  requests.tsx              # 가입 신청 관리
  invitations.tsx           # 초대 관리
  blocks.tsx                # 그룹 차단 관리
  reports.tsx               # 그룹 신고 관리
  components/
    group_list_item.tsx
    group_header.tsx
    group_account_row.tsx
    group_share_token.tsx
```

우선 생성/목록/상세 타임라인을 분리하고, 이후 관리 탭을 단계적으로 나눈다.

### 2단계: API helper와 상태 관리 추가

- `app/javascript/mastodon/api/groups.ts`를 만들어 그룹 REST 호출을 캡슐화한다.
- `app/javascript/mastodon/actions/groups.ts` 또는 typed thunk를 추가한다.
- `app/javascript/mastodon/reducers/groups.ts`와 selector를 추가해 그룹 목록을 캐시한다.
- 내비게이션 패널, 목록 화면, 상세 화면이 같은 그룹 목록 데이터를 공유하게 한다.
- 낙관적 업데이트는 멤버 역할 변경, 초대 취소, 차단 해제처럼 작은 작업부터 제한적으로 적용한다.

### 3단계: 내비게이션 패널 정렬

- `app/javascript/mastodon/features/navigation_panel/components/group_panel.tsx`를 추가한다.
- `ListPanel`과 같은 `CollapsiblePanel` 구조로 내 그룹 목록을 표시한다.
- 위치는 기존 계획에 맞춰 리스트 패널보다 위에 둔다.
- 그룹이 없을 때는 `/groups` 링크와 빈 하위 목록만 표시하거나, 접힘 패널 본문에 생성 안내를 표시한다.

### 4단계: 그룹 생성/편집 UI 정렬

- 리스트의 `ListEdit` 패턴을 참고해 `GroupEdit`을 구현한다.
- 공용 폼 컴포넌트와 `submitting` 상태를 사용한다.
- 성공 후 이동 정책을 명확히 한다.
  - 생성: 관리 또는 상세 화면으로 이동
  - 편집: 현재 편집 화면 유지 또는 상세로 돌아가기
- 삭제는 확인 모달을 통해 실행한다.

### 5단계: 그룹 타임라인을 기존 StatusList로 전환

- 그룹 타임라인 액션을 추가해 `/api/v1/timelines/group/:id`를 확장 조회한다.
- `StatusList`/status container를 사용해 렌더링하고, 직접 `dangerouslySetInnerHTML` 렌더링을 제거한다.
- 그룹 관리자가 볼 수 있는 삭제/신고 액션은 status action menu에 그룹 권한 기반 항목으로 추가하는 방식을 검토한다.
- group visibility, approval status, group badge를 기존 status 메타 영역에 자연스럽게 표시한다.

### 6단계: 그룹 compose 통합

- compose 상태에 `community_group_id`와 그룹 컨텍스트를 추가한다.
- 그룹 타임라인에서 compose를 열면 대상 그룹이 고정되게 한다.
- 그룹 게시물은 일반 공개 범위 선택으로 바뀌지 않도록 visibility selector를 제한한다.
- 기존 draft loss warning, media upload, emoji picker, content warning, poll 기능과 충돌하지 않는지 확인한다.

### 7단계: 계정 검색 기반 관리 UI

- 초대/차단/소유권 이전은 계정 ID 입력 대신 계정 검색을 사용한다.
- 리스트 멤버 화면의 검색 결과/현재 멤버 토글 구조를 참고하되, 그룹에서는 역할과 권한을 함께 표시한다.
- 소유권 이전, 차단, 멤버 제거는 확인 모달을 거친다.
- 차단 목록과 초대 목록은 계정 행, 상태 배지, 생성일, 취소/해제 버튼을 일관되게 표시한다.

### 8단계: 신고/가입 신청/초대 관리 정리

- 가입 신청은 `follow_requests` 화면처럼 계정 행과 승인/거절 버튼을 사용한다.
- 그룹 신고는 기존 신고 모달 구조를 참고해 별도 그룹 신고 모달 또는 그룹 신고 관리 화면으로 분리한다.
- 초대 수락/거절 API가 있으므로 사용자가 받은 초대 화면 또는 알림에서 수락/거절 UI를 제공한다.

### 9단계: i18n, 접근성, 스타일 점검

- 메시지 ID는 `community_groups.*`로 유지하되 화면 분리에 맞게 누락 메시지를 추가한다.
- 아이콘 버튼은 `title`과 `aria-label`을 모두 제공한다.
- 스타일은 가능한 기존 `lists__item`, `account`, `column-link`, `app-form` 계열을 재사용하고, 새 SCSS는 최소화한다.
- 한국어 번역을 우선 보완하고, 영어 기본 메시지와 불일치하지 않게 유지한다.

### 10단계: 테스트 및 회귀 확인

- TypeScript/ESLint로 새 화면과 액션 타입을 확인한다.
- 그룹 생성, 편집, 삭제, 가입, 탈퇴, 초대, 차단, 신고, 타임라인 페이지네이션을 브라우저에서 확인한다.
- 리스트 UI와 비교해 모바일 단일 컬럼, 고급 웹 UI, 뒤로 가기, 빈 상태, 로딩 상태가 일관적인지 확인한다.
- 비멤버, 멤버, 운영자, 관리자 권한별로 표시되는 버튼이 올바른지 확인한다.

## 우선순위

1. 그룹 목록에서 생성 폼 제거 및 `/groups/new` 추가
2. `GroupPanel` 추가 및 리스트 위 배치
3. 그룹 생성/편집 화면의 공용 폼 컴포넌트 전환
4. 그룹 타임라인의 기존 `StatusList` 전환
5. 계정 검색 기반 멤버/초대/차단 관리
6. compose 통합
7. 신고 모달/관리 화면 정비
8. 페이지네이션과 긴 목록 처리

## 리스크와 결정 필요 사항

- 그룹 게시물 visibility를 API에는 `limited`로 보낼지, 프론트엔드 타입의 `group` visibility와 정렬할지 결정해야 한다.
- 그룹 신고를 서버 전체 신고와 완전히 분리할지, 기존 신고 플로우에 그룹 컨텍스트를 추가할지 정책 결정이 필요하다.
- 그룹 초대 수락/거절을 알림에서 처리할지, 별도 "받은 그룹 초대" 화면을 만들지 결정해야 한다.
- 내비게이션 패널에 모든 그룹을 표시할 경우 많은 그룹을 가진 사용자의 성능과 UI 길이를 제한해야 한다.
