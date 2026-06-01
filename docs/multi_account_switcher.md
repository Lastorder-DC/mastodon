# 계정 전환 (Account Switcher) 기능 가이드

## 개요

계정 전환 기능은 동일한 Mastodon 서버에서 여러 계정을 로그아웃 없이 전환할 수 있는 기능입니다. 브라우저의 WebCrypto API를 사용하여 토큰을 안전하게 암호화하고 IndexedDB에 저장합니다. OAuth 2.0 기반의 팝업 인증을 통해 추가 계정을 등록하고, 클릭 한 번으로 계정을 전환할 수 있습니다.

## 동작 원리

### 계정 추가 플로우

1. 사용자가 "기존 계정 추가" 클릭
2. 현재 계정(A)의 장기 토큰을 발급받아 IndexedDB에 암호화 저장 (사전 보호)
3. `about:blank` 팝업을 열고, 서버에서 OAuth authorize URL 생성 (state/nonce 포함)
4. 팝업을 authorize URL로 이동 (`force_login=true`로 강제 로그인)
5. 서버의 `OAuth::AuthorizationsController`가 현재 세션(A)을 sign_out하여 새 로그인 강제
6. 사용자가 B 계정으로 로그인 후 authorize
7. Doorkeeper가 redirect_uri(`/multi_accounts/callback`)로 code+state 전달
8. 콜백 페이지가 `postMessage`로 code를 부모 창에 전달
9. 부모 창이 code를 서버 API(`/api/v1/multi_accounts/consume`)로 보내 B 계정의 장기 토큰 발급
10. 토큰을 WebCrypto AES-GCM으로 암호화하여 IndexedDB에 저장
11. 페이지 새로고침하여 원래 세션 복원

### 계정 전환 플로우

1. 전환할 계정 클릭
2. IndexedDB에서 암호화된 토큰 로드 및 WebCrypto로 복호화
3. `POST /multi_accounts/switch`로 토큰 전송
4. 서버가 토큰을 검증하고 `sign_in(:user, user)` 호출
5. Warden의 `after_set_user` 훅이 **SessionActivation** 레코드를 생성하고 세션 쿠키 설정
6. 페이지 새로고침 - 새 세션 쿠키로 전환된 계정 표시

### 핵심 설계: SessionActivation 기반 전환

Mastodon의 API는 Doorkeeper 토큰만으로는 동작하지 않습니다. 모든 API 요청에서 세션 쿠키의 `session_id`에 대응하는 `SessionActivation` 레코드가 존재해야 합니다 (Warden 훅에서 검증). 따라서 계정 전환 시 반드시 `sign_in`을 통해 새로운 SessionActivation을 생성해야 합니다.

`MultiAccounts::SwitchController`는 `ApplicationController`를 상속하여 Devise/Warden의 세션 관리 미들웨어가 정상 작동하도록 합니다.

## 사전 준비 (관리자)

### OAuth 앱 설정

계정 전환 기능을 사용하려면 전용 OAuth 애플리케이션을 생성해야 합니다.

**Rails 콘솔에서 생성:**

```ruby
# 여기에 마스토돈 도메인을 입력하세요 (예: 'example.com')
domain = 'your-domain.com'

app = Doorkeeper::Application.create!(
  name: 'Multi-Account Switcher',
  redirect_uri: "https://#{domain}/multi_accounts/callback",
  scopes: 'read write follow push',
  confidential: true
)

puts "Add below to .env file"
puts "MA_MULTI_ACCOUNT_CLIENT_ID=#{app.uid}"
puts "MA_MULTI_ACCOUNT_CLIENT_SECRET=#{app.secret}"
puts "MA_MULTI_ACCOUNT_REDIRECT_URI=https://#{domain}/multi_accounts/callback"
```

### 환경 변수

다음 환경 변수를 서버 환경 설정 파일(`.env.production` 등)에 추가하세요:

| 변수명                           | 필수   | 설명                                                  |
| -------------------------------- | ------ | ----------------------------------------------------- |
| `MA_MULTI_ACCOUNT_CLIENT_ID`     | 예     | OAuth 앱의 Client ID                                  |
| `MA_MULTI_ACCOUNT_CLIENT_SECRET` | 예     | OAuth 앱의 Client Secret                              |
| `MA_MULTI_ACCOUNT_REDIRECT_URI`  | 예     | 콜백 URI (`https://<도메인>/multi_accounts/callback`) |
| `MA_MULTI_ACCOUNT_REFRESH_FLOW`  | 아니오 | 세션 전환 활성화 (기본값: `true`)                     |
| `MA_MULTI_ACCOUNT_RETAIN_TOKENS` | 아니오 | 로그아웃 시 토큰 유지 여부 (기본값: `true`)           |
| `MA_ROLLOUT_PERCENTAGE`          | 아니오 | 기능 노출 비율, 0-100 (기본값: `100`)                 |
| `MA_INTERNAL_USER_IDS`           | 아니오 | 조기 접근 사용자 ID, 쉼표 구분                        |

### 데이터베이스 마이그레이션

```bash
RAILS_ENV=production bundle exec rails db:migrate
```

## 사용 방법

### 계정 추가

1. 사이드바에서 **계정 전환** 메뉴를 클릭합니다.
2. 계정 관리 모달에서 **기존 계정 추가** 버튼을 클릭합니다.
3. 팝업이 열리면 추가할 계정으로 로그인합니다.
4. 인증 후 팝업이 자동으로 닫히고 계정이 목록에 추가됩니다.

### 계정 전환

1. **계정 전환** 메뉴를 클릭하여 모달을 엽니다.
2. 전환할 계정을 클릭합니다 (현재 계정에는 초록색 체크 표시).
3. 페이지가 새로고침되면서 선택한 계정으로 전환됩니다.

### 계정 제거

1. 계정 관리 모달에서 삭제 아이콘을 클릭합니다 (현재 계정은 삭제 불가).
2. 확인 다이얼로그에서 제거를 확인합니다.

### 토큰 만료 시 처리

계정 전환 시 토큰이 만료되거나 무효화된 경우, 알림과 함께 해당 계정을 제거할지 묻는 다이얼로그가 표시됩니다.

### 전체 로그아웃

모달 하단의 **모든 계정 로그아웃** 버튼으로 모든 저장된 계정을 제거하고 로그아웃합니다.

## 보안 설계

### 토큰 암호화

- **WebCrypto API (AES-GCM 256-bit)**: 비추출(non-extractable) CryptoKey 사용
- 키는 브라우저별 IndexedDB에 저장 (XSS로도 키 추출 불가)
- 암호화된 페이로드(iv + cipherText)만 IndexedDB에 기록

### OAuth 보안

- **state/nonce**: Redis에 15분 TTL, 1회성 소비 (`consume!`에서 삭제)
- **force_login**: 팝업에서 현재 계정을 sign_out하여 다른 계정으로 로그인 강제
- **origin 검증**: postMessage 수신 시 hostname 기반 origin 검증
- **CSRF 방지**: state 파라미터로 cross-site request forgery 차단

### 전환 엔드포인트 보안

- `SwitchController`는 Doorkeeper 토큰 값을 직접 검증 (by_token)
- revoked/expired 토큰 거부
- 비활성화/정지된 계정 거부
- 유효한 토큰일 때만 `sign_in` 수행

## 아키텍처

### 백엔드

```
app/controllers/
  multi_accounts/
    entries_controller.rb     # OAuth authorize URL 생성 (state/nonce 발급)
    callbacks_controller.rb   # OAuth 콜백 페이지 (postMessage)
    switch_controller.rb      # 계정 전환 (sign_in으로 SessionActivation 생성)
  api/v1/
    multi_accounts_controller.rb  # consume (code->token), refresh_token
  oauth/
    authorizations_controller.rb  # force_login 시 sign_out 처리

app/services/multi_accounts/
  state_store.rb              # Redis state/nonce 저장소

app/lib/
  multi_account_config.rb     # 설정 헬퍼
  access_token_extension.rb   # long_lived_refresh? 확인, expired? 오버라이드
```

### 프론트엔드

```
app/javascript/mastodon/
  actions/multi_account.ts          # Redux thunks (register, switch, remove)
  api/multi_accounts.ts             # API 클라이언트
  features/
    multi_account/callback_handler.ts   # postMessage 핸들러
    ui/components/account_switcher.tsx  # 모달 UI
  reducers/multi_account.ts         # Redux reducer
  types/multi_account.ts            # TypeScript 타입
  utils/
    multi_account_crypto.ts         # AES-GCM 암호화
    multi_account_db.ts             # IndexedDB 저장
    multi_account_storage.ts        # localStorage + hydration
```

### 라우팅

```ruby
# config/routes.rb
namespace :multi_accounts do
  resource :entry, only: [:show], controller: :entries
  resource :callback, only: [:show], controller: :callbacks
  post 'switch', to: 'switch#create'
end

# config/routes/api.rb
resource :multi_accounts, only: [] do
  post :consume
  post :refresh_token
end
```

## long-while/longwhile-mastodon과의 비교

이 구현은 [long-while/longwhile-mastodon](https://github.com/long-while/longwhile-mastodon) 포크를 참고하되, 아키텍처를 재설계했습니다.

### 주요 차이점

| 항목                   | long-while (구버전)                                             | 이 구현 (occm)                                              |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| **전환 방식**          | `RefreshService`로 새 Doorkeeper 토큰 발급 후 API 호출에 사용   | `SwitchController`에서 `sign_in`으로 SessionActivation 생성 |
| **세션 처리**          | 토큰 기반 - 세션 쿠키를 직접 조작                               | 서버 측 `sign_in` - Warden이 자동으로 세션/쿠키 관리        |
| **컨트롤러 기반**      | `Api::BaseController` 상속 (세션 미들웨어 미포함)               | `ApplicationController` 상속 (전체 세션 미들웨어 포함)      |
| **팝업 감지**          | `setInterval` 500ms로 `popup.closed` 폴링                       | 폴링 없음, postMessage + 타임아웃만 사용                    |
| **코드베이스**         | JSX, 클래스 컴포넌트 기반                                       | TSX, 함수형 컴포넌트 + hooks                                |
| **CSRF**               | 자체 CSRF 토큰 캐시/갱신 로직                                   | 불필요 (sign_in이 세션을 완전히 재설정)                     |
| **token 라이프사이클** | refreshSession으로 단기 세션 토큰 + 장기 refresh 토큰 이중 구조 | 단일 장기 토큰 + 서버 측 세션 전환                          |

### 이 구현의 장점

1. **SessionActivation 정합성**: Mastodon의 세션 검증 체계(`session_id` + `SessionActivation` 레코드)와 완벽히 호환됩니다. long-while 방식은 Doorkeeper 토큰만 교체하므로 최신 Mastodon에서 401 오류가 발생합니다.

2. **단순한 전환 로직**: 토큰 복호화 -> switch API 호출 -> 페이지 리로드. CSRF 토큰 관리나 쿠키 직접 조작이 필요 없습니다.

3. **팝업 안정성**: `popup.closed` 폴링을 제거하여 OAuth 리다이렉트 과정에서의 false positive를 원천 차단합니다. 5분 타임아웃으로만 비정상 종료를 감지합니다.

4. **최신 Mastodon 호환**: TypeScript + 함수형 컴포넌트 + hooks 패턴으로 현재 Mastodon 코드베이스와 일관됩니다. CSS도 Mastodon의 CSS Custom Properties 디자인 토큰을 사용합니다.

5. **보안 강화**: CryptoKey가 non-extractable로 설정되어 XSS로도 암호화 키를 추출할 수 없습니다 (long-while은 extractable).

### long-while 구현의 장점 (참고)

1. **세션 복원**: 실패 시 원래 세션을 복원하는 `restoreMultiAccountSession` 메커니즘이 있습니다.
2. **토큰 자동 갱신**: `RefreshService`를 통한 토큰 갱신 체계가 있습니다.
3. **상세 로깅**: `SwitchLogger`, `MultiAccounts::Logger`, `MultiAccounts::Metrics` 등 운영 모니터링을 위한 계측이 풍부합니다.

## 문제 해결

### 팝업 차단

**증상**: 계정 추가 시 팝업이 열리지 않습니다.
**해결**: 브라우저의 팝업 차단 설정에서 현재 사이트를 허용하세요.

### 토큰 만료/무효

**증상**: 계정 전환 시 "로그인 정보가 유효하지 않거나 만료되었습니다" 알림이 표시됩니다.
**해결**: 삭제 확인 다이얼로그에서 제거 후, 해당 계정을 다시 추가하세요.

### 시크릿 모드 제한

**증상**: 계정 전환 기능이 작동하지 않습니다.
**해결**: IndexedDB/WebCrypto가 제한되는 시크릿 모드에서는 사용할 수 없습니다.

### OAuth 앱 미설정

**증상**: 계정 추가 시 서버 에러가 발생합니다.
**해결**: 관리자에게 `MA_MULTI_ACCOUNT_*` 환경 변수 설정 확인을 요청하세요.

## 기술 스택

| 계층     | 기술                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | TypeScript, React (함수형 컴포넌트), Redux (Immutable.js), WebCrypto API, IndexedDB |
| Backend  | Ruby on Rails 8, Redis, Doorkeeper OAuth 2.0, Devise/Warden                         |
| Security | AES-GCM 256-bit (non-extractable key), OAuth 2.0 state/nonce, SessionActivation     |
