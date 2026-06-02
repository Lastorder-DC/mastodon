# 커뮤니티 그룹 생성/목록 UI 정비 계획

## 목적

그룹 기능은 API와 단일 React 화면이 이미 존재하지만, 그룹 생성 화면이 리스트 생성 화면처럼 명확히 노출되어 있지 않고 목록/생성/가입 폼이 한 컬럼 안에 섞여 있어 사용자가 "그룹 추가" 진입점을 찾기 어렵다. 이 문서는 기존 리스트 UI를 기준으로 그룹 목록 및 그룹 추가 UI를 마스토돈 웹 UI 방식으로 정비하기 위한 구현 계획이다.

## 현재 확인 내용

- 그룹 웹 라우트는 `/groups`와 `/groups/:id`만 등록되어 있고 `/groups/new` 또는 `/groups/:id/edit` 같은 별도 생성/편집 라우트는 없다.
- 그룹 목록 화면은 `app/javascript/mastodon/features/community_groups/index.tsx`의 `GroupsList` 하나에서 목록 조회, 그룹 생성, 공유 토큰 가입을 모두 처리한다.
- 그룹 생성 폼은 `ScrollableList`의 `prepend` 영역에 항상 표시되며, `setting-text` 입력과 일반 `button`을 직접 조합한다.
- 내비게이션 패널에는 그룹 링크가 있으나 리스트 패널과 달리 접히는 패널이 아니며, 현재 사용자의 그룹을 하위 항목으로 표시하지 않는다.
- 기존 리스트 UI는 다음 구조를 사용한다.
  - `/lists` 목록 컬럼에서 `ColumnHeader.extraButton`의 플러스 버튼으로 `/lists/new`에 진입한다.
  - `/lists/new`와 `/lists/:id/edit`는 `ListEdit` 화면 하나로 생성/편집을 처리한다.
  - 생성 성공 후 `/lists/:id/edit`로 이동하고 이어서 `/lists/:id/members`로 이동해 멤버 추가 플로우를 자연스럽게 이어 준다.
  - 입력 컨트롤은 `TextInputField`, `SelectField`, `Toggle` 등 공용 폼 컴포넌트를 사용한다.

## 사용자 경험 목표

1. 그룹 목록 화면에서 그룹 생성 진입점이 리스트의 플러스 버튼처럼 즉시 보여야 한다.
2. 그룹 생성 폼은 목록과 분리된 `/groups/new` 화면에서 제공해야 한다.
3. 생성 완료 후 사용자가 바로 그룹 상세 또는 멤버/초대 관리 화면으로 이어 갈 수 있어야 한다.
4. 공유 토큰으로 가입하는 기능은 생성 폼과 혼합하지 말고 목록 화면의 보조 액션 또는 별도 섹션으로 분리해야 한다.
5. 모든 입력은 기존 마스토돈 공용 폼 컴포넌트와 i18n 메시지를 사용해야 한다.

## 리스트 UI를 기준으로 한 구현 계획

### 1단계: 그룹 라우트 분리

- `app/javascript/mastodon/features/ui/util/async-components.js`에 그룹 생성/편집용 lazy import를 추가한다.
- `app/javascript/mastodon/features/ui/index.jsx`에 다음 라우트를 추가한다.
  - `/groups/new`: 그룹 생성 화면
  - `/groups/:id/edit`: 그룹 편집 화면
  - 필요 시 `/groups/:id/members`: 멤버/초대/가입 신청 관리 화면
- 기존 `/groups`와 `/groups/:id`는 목록과 상세 타임라인 중심으로 유지한다.

### 2단계: 그룹 목록 화면 정리

- `GroupsList`에서 생성 폼을 제거하고 리스트의 `Lists` 화면처럼 `ColumnHeader.extraButton`에 플러스 버튼을 추가한다.
- 플러스 버튼은 `/groups/new`로 연결하며 `title`과 `aria-label`에 `community_groups.create_group` 메시지를 사용한다.
- 그룹 목록 항목은 `lists__item` 재사용을 유지하되 다음 정보를 명확히 노출한다.
  - 그룹 이름
  - 멤버 수
  - 게시물 수
  - 잠김 여부 또는 가입 승인 필요 여부
- 목록의 빈 상태는 리스트 화면처럼 설명 문구와 생성 유도 문구를 포함한다.
- 공유 토큰 가입 UI는 목록 상단의 간단한 접이식 보조 영역 또는 `ColumnHeader` 보조 액션으로 분리한다.

### 3단계: 그룹 생성 화면 작성

- 리스트의 `ListEdit`와 같은 패턴으로 `app/javascript/mastodon/features/community_groups/new.tsx` 또는 `edit.tsx`를 만든다.
- 생성 화면은 `Column`, `ColumnHeader`, `Helmet`, 공용 폼 컴포넌트를 사용한다.
- 필드 구성:
  - 표시 이름: 필수, 서버 모델 검증에 맞춘 최대 길이 적용
  - 설명: 다중행 입력이 필요하면 기존 공용 textarea 패턴 또는 `TextInputField` 확장 여부 확인
  - 가입 승인 필요: `Toggle`
  - 탐색 화면 노출: `Toggle`
- 제출 버튼은 리스트 생성 화면과 같은 버튼 배치와 비활성화 정책을 적용한다.
- 생성 API 호출은 `/api/v1/groups`를 사용하고, 성공 시 `/groups/:id` 또는 관리 화면으로 이동한다.

### 4단계: 생성 후 다음 행동 설계

- 기본안: 생성 성공 후 `/groups/:id`로 이동하고 상세 화면 상단에 "멤버 초대" 안내를 표시한다.
- 대안: 리스트 생성 후 멤버 화면으로 이동하는 패턴처럼 `/groups/:id/edit` 후 `/groups/:id/members`로 이동한다.
- 그룹은 리스트보다 초대/가입 승인/공유 토큰 설정이 중요하므로, 최종안은 생성 성공 후 관리 화면으로 이동하는 방식을 우선 검토한다.

### 5단계: i18n과 접근성

- 영어 기본 메시지와 `ko.json` 번역을 함께 추가한다.
- 플러스 버튼, 제출 버튼, 공유 토큰 가입 버튼에 `aria-label`을 명시한다.
- 오류 메시지는 단순 `warning-hint` 직접 출력보다 기존 alert 또는 폼 오류 표시 패턴과 맞춘다.
- 폼 제출 중 중복 제출을 막는 `submitting` 상태를 둔다.

## 검증 계획

- `/groups`에서 그룹 생성 폼이 사라지고 플러스 버튼만 표시되는지 확인한다.
- `/groups/new` 직접 접근과 플러스 버튼 접근이 모두 동작하는지 확인한다.
- 표시 이름이 비어 있을 때 제출 버튼이 비활성화되는지 확인한다.
- 생성 성공 후 의도한 화면으로 이동하고 새 그룹이 목록/API에 반영되는지 확인한다.
- 모바일 단일 컬럼과 고급 다중 컬럼에서 라우트 전환, 뒤로 가기, 컬럼 제목이 자연스러운지 확인한다.
- 한국어 로케일에서 그룹 생성, 공유 토큰 가입, 빈 상태 메시지가 번역되어 표시되는지 확인한다.

## 예상 산출물

- 그룹 생성/편집용 React 화면
- 그룹 목록 화면의 `ColumnHeader.extraButton` 추가
- 그룹 생성 폼 제거 및 공유 토큰 가입 UI 분리
- `/groups/new`, 선택적으로 `/groups/:id/edit`, `/groups/:id/members` 라우트
- 그룹 UI i18n 메시지 정리
