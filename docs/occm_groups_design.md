# OCCM Groups: Technical Design Document

## 1. Introduction

OCCM Groups adds private, local-only group functionality to this Mastodon fork. Users can create shared spaces where members post, discuss, and interact within a controlled membership boundary. All group content remains on the local instance -- it is never federated to remote servers.

This document explains the system architecture, data flows, key design decisions and their rationale, component interactions, security model, performance strategy, error handling, and testing approach. It is intended for developers who will implement the feature or review the implementation.

### References

- Feature specification: `docs/occm_groups_spec.md`
- Migration and rollback plan: `docs/occm_groups_migration_plan.md`

---

## 2. System Architecture Overview

OCCM Groups integrates into Mastodon's existing layered architecture without modifying core tables or behavior. It adds new tables, services, controllers, and frontend components that follow established patterns (particularly the Lists feature).

### 2.1 High-Level Component Diagram

```
+-----------------------------------------------------------+
|                     Frontend (React/Redux)                  |
|  +----------+  +-----------+  +----------+  +-----------+ |
|  | Group    |  | Group     |  | Group    |  | Group     | |
|  | List UI  |  | Timeline  |  | Members  |  | Reports   | |
|  +----+-----+  +----+------+  +----+-----+  +-----+-----+ |
|       |              |              |              |         |
|  +----v--------------v--------------v--------------v-----+  |
|  |         Redux Store (occm_groups slice)                |  |
|  +----+----------------------------------------------+---+  |
|       |                                              |       |
|  +----v----+  +----------------------------------+   |       |
|  | API     |  | Streaming (WebSocket)            |   |       |
|  | Module  |  | connectOccmGroupStream           |   |       |
|  +----+----+  +--------+-------------------------+   |       |
+-------|----------------|-------------------------------------+
        |                |
        | HTTP (REST)    | WebSocket
        v                v
+-----------------------------------------------------------+
|                  Mastodon Backend (Rails)                   |
|                                                            |
|  +----------------+   +----------------+   +------------+  |
|  | Controllers    |   | Services       |   | Workers    |  |
|  | (Doorkeeper    |   | (Business      |   | (Sidekiq)  |  |
|  |  + Pundit)     |   |  logic)        |   |            |  |
|  +-------+--------+   +-------+--------+   +------+-----+  |
|          |                     |                   |         |
|  +-------v--------+   +-------v--------+          |         |
|  | Serializers    |   | Models          |<---------+         |
|  | (JSON output)  |   | (AR + Enums)   |                    |
|  +----------------+   +-------+--------+                    |
|                               |                              |
+-------------------------------|------------------------------+
                                |
                                v
+-----------------------------------------------------------+
|                    PostgreSQL                               |
|  occm_groups | occm_group_memberships | occm_group_statuses|
|  occm_group_reports | occm_group_dm_rooms (placeholder)    |
+-----------------------------------------------------------+

+-----------------------------------------------------------+
|                    Redis (Pub/Sub + Cache)                  |
|  Channels: timeline:occm_group:{id}                        |
|  Notifications: timeline:{account_id}:notifications        |
+-----------------------------------------------------------+

+-----------------------------------------------------------+
|             Node.js Streaming Server (streaming/index.js)   |
|  - Registers occm_group channel                            |
|  - Authorizes membership before allowing subscription      |
|  - Relays Redis pub/sub events to WebSocket clients        |
+-----------------------------------------------------------+
```

### 2.2 Layer Responsibilities

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| Frontend UI | React components, user interactions | `app/javascript/mastodon/features/occm_groups/` |
| Frontend State | Redux store, actions, reducers | `app/javascript/mastodon/reducers/occm_groups.ts` |
| Frontend API | HTTP client for REST endpoints | `app/javascript/mastodon/api/occm_groups.ts` |
| Streaming Client | WebSocket connection for real-time updates | `app/javascript/mastodon/actions/streaming.js` |
| Controllers | Request handling, auth, parameter validation | `app/controllers/api/v1/occm_groups_controller.rb` |
| Policies | Pundit authorization (role-based access) | `app/policies/occm_group_policy.rb` |
| Services | Business logic, transactions, side effects | `app/services/create_occm_group_service.rb` etc. |
| Models | Data layer, validations, associations, scopes | `app/models/occm_group.rb` etc. |
| Serializers | JSON response formatting | `app/serializers/rest/occm_group_serializer.rb` |
| Workers | Background jobs (counter reconciliation) | `app/workers/occm_group_counter_reconciliation_worker.rb` |
| Streaming Server | WebSocket relay, channel auth | `streaming/index.js` |
| Database | Persistent storage | `occm_*` tables in PostgreSQL |
| Redis | Pub/sub for streaming, notification delivery | Channels prefixed `timeline:occm_group:` |

---

## 3. Data Flow Diagrams

### 3.1 Post Creation Flow

A member posts a message to a group. The status is created with `limited` visibility, linked to the group via the junction table, and distributed to active members through streaming.

```
Member (Frontend)
    |
    | POST /api/v1/occm_groups/:group_id/statuses
    |   { status: "Hello group!" }
    v
OccmGroups::StatusesController
    |
    | 1. doorkeeper_authorize! :write, :'write:occm_groups'
    | 2. require_user!
    | 3. set_occm_group (find group by ID)
    | 4. authorize @occm_group, :post? (verify active membership)
    v
PostToOccmGroupService.call(account, occm_group, params)
    |
    | 5. Verify membership is active
    | 6. Call PostStatusService with visibility: :limited, local_only: true
    | 7. Create OccmGroupStatus junction record
    | 8. Call DistributeOccmGroupStatusService
    v
DistributeOccmGroupStatusService.call(status, occm_group)
    |
    | 9. Render status JSON via InlineRenderer
    | 10. Publish to Redis: "timeline:occm_group:{id}"
    v
Redis Pub/Sub  -------->  Node.js Streaming Server
                                |
                                | 11. Relay to subscribed WebSocket clients
                                v
                          Members' Browsers (Timeline updates)
```

### 3.2 Join Request Flow

#### With Approval Required (`approval_required: true`)

```
Requester (Frontend)
    |
    | POST /api/v1/occm_groups/:group_id/members
    v
OccmGroups::MembersController#create
    |
    v
JoinOccmGroupService.call(account, occm_group)
    |
    | 1. Check: not already a member or pending
    | 2. Create OccmGroupMembership (state: :pending, role: :user)
    | 3. Notify admin/moderators (occm_group_join_request)
    v
NotifyOccmGroupService.call(admin, :occm_group_join_request, membership)
    |
    | 4. Create Notification record
    | 5. Push to Redis notification channel
    v
Admin sees notification, clicks Approve
    |
    | POST /api/v1/occm_groups/:group_id/members/:account_id/approve
    v
OccmGroups::MembersController#approve
    |
    | authorize @occm_group, :moderate?
    v
ApproveOccmGroupMemberService.call(occm_group, account_id)
    |
    | 6. Update membership state: pending -> active
    | 7. Increment occm_group.member_count
    | 8. Notify requester (occm_group_join_approved)
    v
NotifyOccmGroupService.call(requester, :occm_group_join_approved, membership)
```

#### Without Approval Required (`approval_required: false`)

```
Requester (Frontend)
    |
    | POST /api/v1/occm_groups/:group_id/members
    v
JoinOccmGroupService.call(account, occm_group)
    |
    | 1. Check: not already a member
    | 2. Create OccmGroupMembership (state: :active, role: :user)
    | 3. Increment occm_group.member_count
    | 4. No notification needed -- instant join
    v
Response: membership (state: "active")
```

### 3.3 Group Timeline Streaming

```
Member opens group timeline page
    |
    v
Frontend dispatches connectOccmGroupStream(groupId)
    |
    | WebSocket: subscribe to channel "occm_group", params: { group: groupId }
    v
Node.js Streaming Server (streaming/index.js)
    |
    | 1. Parse access token from WebSocket connection
    | 2. Verify account has active membership in group (DB query)
    | 3. If authorized: subscribe to Redis channel "timeline:occm_group:{id}"
    | 4. If unauthorized: close connection with 401
    v
Redis subscription active
    |
    | (When new posts arrive via DistributeOccmGroupStatusService)
    v
Redis publishes to "timeline:occm_group:{id}"
    |
    v
Streaming server relays event to subscribed WebSocket clients
    |
    | event: "update", payload: { status JSON }
    | event: "delete", payload: status_id (when post deleted)
    v
Frontend receives event, dispatches to Redux store
    | - "update" -> prepend status to group timeline
    | - "delete" -> remove status from group timeline
```

### 3.4 Notification Delivery

```
Triggering Action (e.g., join request approved)
    |
    v
Service Layer (e.g., ApproveOccmGroupMemberService)
    |
    | Calls NotifyOccmGroupService.call(recipient, type, activity)
    v
NotifyOccmGroupService
    |
    | 1. Create Notification record in DB
    |      (account: recipient, type: :occm_group_join_approved, activity: membership)
    |
    | 2. Render notification JSON via InlineRenderer:
    |      payload = InlineRenderer.render(notification, recipient, :notification)
    |
    | 3. Publish rendered payload to Redis:
    |      Channel: "timeline:{recipient_account_id}"
    |      Event: "notification"
    |      Payload: rendered notification JSON string
    |
    | 4. Push to web push subscriptions (if configured):
    |      WebPushNotificationWorker.perform_async(...)
    v
Redis  ------->  Node.js Streaming Server
                       |
                       | Relay the rendered notification payload to recipient's WebSocket
                       v
                 Recipient's Browser
                       |
                       | Redux: add notification to notifications list
                       | Display: toast / badge update
```

**Note on delivery pattern:** The notification is rendered server-side and published as a complete JSON payload to Redis. The streaming server does not fetch the notification by ID -- it relays the pre-rendered payload directly to the WebSocket client. This matches Mastodon's existing `NotifyService` behavior where `Redis.publish("timeline:#{recipient.id}", Oj.dump(event: :notification, payload: payload))` delivers the full notification object.

---

## 4. Key Design Decisions and Rationale

### 4.1 Why `limited` Visibility

**Decision**: Group posts use `visibility: :limited` (enum value 4) rather than adding a new visibility level.

**Rationale**:
- The `limited` visibility already exists in Mastodon's status visibility enum (defined in `app/models/concerns/status/visibility.rb`).
- Adding a new enum value would require a migration on the `statuses` table -- one of the largest tables in any Mastodon instance. This is extremely risky for production deployments.
- `limited` already means "not federated, not publicly visible" which matches group post semantics perfectly.
- Discrimination between group posts and other limited-visibility statuses (e.g., circle posts) is handled by the `occm_group_statuses` junction table. A status is a group post if and only if it has a row in that table.

### 4.2 Why `occm_` Prefix

**Decision**: All tables, models, controllers, API paths, OAuth scopes, i18n keys, streaming channels, and notification types use the `occm_` prefix.

**Rationale**:
- PR #19059 is the official Mastodon groups implementation that may eventually merge upstream.
- If this fork pulls upstream changes that include PR #19059, there would be naming collisions on `groups`, `group_memberships`, etc.
- The prefix creates a completely isolated namespace. Both implementations can coexist in the same database and codebase without conflict.
- A documented migration path (`docs/occm_groups_migration_plan.md`) enables transitioning from `occm_` tables to official tables if/when PR #19059 merges.

### 4.3 Why Separate `occm_group_reports` Table

**Decision**: Group reports use their own table rather than extending Mastodon's existing `reports` table.

**Rationale**:
- **Self-moderation model**: Group reports are handled by group admins/moderators, not server administrators. Mixing them into the server `reports` table would surface group disputes in the admin panel, creating noise for instance operators.
- **Separation of concerns**: Group-level moderation (off-topic posts, minor rule violations) is fundamentally different from instance-level moderation (CSAM, legal compliance, ToS violations).
- **Different lifecycle**: Group reports are resolved by group leadership with group-level actions (delete post, remove member). Server reports trigger account-level actions (suspend, silence).
- **Escalation path**: If content is truly harmful, group moderators can file a standard Mastodon report (`POST /api/v1/reports`) to escalate to server admins. This is an intentional boundary.

### 4.4 Why Junction Table `occm_group_statuses`

**Decision**: A separate `occm_group_statuses` table links statuses to groups, rather than adding a `group_id` column to the `statuses` table.

**Rationale**:
- **No schema change to `statuses`**: The `statuses` table is the most critical table in Mastodon. Adding a column requires a potentially long-running migration and affects every existing query plan.
- **Future extensibility**: The junction table design allows a status to belong to multiple groups in the future (cross-posting) without further schema changes.
- **Clean separation**: OCCM Groups can be completely removed by dropping its tables without touching the statuses schema. This makes rollback trivial.
- **Compatible with migration**: When migrating to PR #19059 (which does add `group_id` to statuses), the junction table provides a clear source of truth for which statuses to update.

### 4.5 Why Local-Only / No Federation

**Decision**: Group posts are never federated via ActivityPub.

**Rationale**:
- **Privacy**: Groups are intended as private spaces. Federation would expose content to remote instances where the group admin has no moderation authority.
- **Simplicity**: Federation adds enormous complexity (ActivityPub actor management, remote group discovery, cross-instance membership, inbox forwarding). Local-only avoids all of this.
- **Control**: Instance operators retain full control over group data. There are no concerns about data leaving the server.
- **Implementation**: Using `limited` visibility + `local_only: true` naturally prevents federation through Mastodon's existing delivery pipeline.

### 4.6 Why Group Posts Excluded from Home Feed

**Decision**: Group posts do not appear in members' home timeline. They appear only in the dedicated group timeline.

**Rationale**:
- **Separation of concerns**: Home feed is for follows/subscriptions. Group content is a different consumption context.
- **Volume control**: Active groups could flood a user's home feed, making it unusable. Users opt into group content by visiting the group timeline.
- **Streaming efficiency**: Group timeline has its own streaming channel. Mixing with home would require modifying the existing home feed fanout logic (complex and risky).
- **UX clarity**: Users know exactly where group content lives. No confusion about why certain posts appear or disappear from home.

### 4.7 Why Counter Cache with Reconciliation Worker

**Decision**: `occm_groups.member_count` is a counter cache manually incremented/decremented by service objects, with a periodic reconciliation worker.

**Rationale**:
- **Performance**: Counting active memberships via `COUNT(*)` on every group list request is expensive. The counter cache provides O(1) reads.
- **Rails counter_cache limitation**: Rails' built-in `counter_cache` only fires on create/destroy, not on state changes (pending -> active). Our member count should only reflect `active` memberships.
- **Cascade problem**: If an account is deleted, `ON DELETE CASCADE` removes membership records without firing Rails callbacks. The counter becomes stale.
- **Reconciliation tradeoff**: A daily Sidekiq worker (`OccmGroupCounterReconciliationWorker`) recomputes actual counts in batches. This accepts temporary inaccuracy (within 24 hours) in exchange for consistent performance and simplicity.

---

## 5. Component Interaction

### 5.1 Backend Component Interaction

```
Request arrives at Controller
    |
    +---> doorkeeper_authorize! (OAuth scope check)
    +---> require_user! (session/token validation)
    +---> before_action :set_occm_group (load record)
    |
    v
Controller action
    |
    +---> authorize @occm_group, :action? (Pundit policy check)
    |         |
    |         v
    |     OccmGroupPolicy
    |         |
    |         +---> Loads membership for current_user
    |         +---> Checks role (admin? moderator?)
    |         +---> Returns true/false (raises NotAuthorizedError if false)
    |
    +---> Service.new.call(...) (business logic)
    |         |
    |         v
    |     Service Layer
    |         |
    |         +---> Model validations (ActiveRecord)
    |         +---> Database transaction (if multi-step)
    |         +---> Counter cache updates
    |         +---> Notification dispatch (NotifyOccmGroupService)
    |         +---> Stream publishing (DistributeOccmGroupStatusService)
    |
    +---> render json: @resource, serializer: REST::OccmGroupSerializer
              |
              v
          Serializer
              |
              +---> id.to_s (bigint to string for JS safety)
              +---> membership role/state (from preloaded map or query)
              +---> Nested serializers (account, etc.)
```

### 5.2 Service Dependencies

| Service | Depends On | Side Effects |
|---------|-----------|--------------|
| `CreateOccmGroupService` | OccmGroup, OccmGroupMembership | Creates group + admin membership in transaction |
| `JoinOccmGroupService` | OccmGroupMembership, NotifyOccmGroupService | Creates membership, notifies admin/mods (if approval required) |
| `ApproveOccmGroupMemberService` | OccmGroupMembership, NotifyOccmGroupService | Updates state, increments counter, notifies requester |
| `RejectOccmGroupMemberService` | OccmGroupMembership, NotifyOccmGroupService | Updates state, notifies requester |
| `RemoveOccmGroupMemberService` | OccmGroupMembership, Redis | Validates admin-cannot-leave, decrements counter, publishes revoke event to streaming channel |
| `TransferOccmGroupAdminService` | OccmGroupMembership | Atomically swaps roles in transaction |
| `PostToOccmGroupService` | PostStatusService, OccmGroupStatus, DistributeOccmGroupStatusService | Creates status, links to group, streams |
| `DeleteOccmGroupStatusService` | OccmGroupStatus, NotifyOccmGroupService, DistributeOccmGroupStatusService | Removes post, notifies author, streams delete event |
| `DistributeOccmGroupStatusService` | Redis, InlineRenderer | Publishes to streaming channel |
| `ResolveOccmGroupReportService` | OccmGroupReport | Marks resolved, optionally triggers delete/remove actions |
| `NotifyOccmGroupService` | Notification, Redis, InlineRenderer | Creates notification record, renders via InlineRenderer, publishes rendered payload to Redis |

### 5.3 Frontend State Management

**Redux Store Shape:**

```
store
  +-- occm_groups
  |     +-- items: Map<groupId, OccmGroup>
  |     +-- isLoading: boolean
  |     +-- loaded: boolean
  |
  +-- occm_group_memberships
  |     +-- items: Map<groupId, Map<accountId, Membership>>
  |     +-- pending: Map<groupId, Membership[]>
  |     +-- isLoading: boolean
  |
  +-- occm_group_timelines
  |     +-- items: Map<groupId, statusId[]>
  |     +-- isLoading: Map<groupId, boolean>
  |     +-- hasMore: Map<groupId, boolean>
  |
  +-- occm_group_reports
        +-- items: Map<groupId, Report[]>
        +-- isLoading: boolean
```

**Action Flow (example: fetch groups):**

```
Component mounts
    |
    | dispatch(fetchOccmGroups())
    v
Action creator
    |
    | 1. dispatch({ type: OCCM_GROUPS_FETCH_REQUEST })
    | 2. Call apiGetOccmGroups()
    v
API Module (api/occm_groups.ts)
    |
    | GET /api/v1/occm_groups
    v
On success:
    | dispatch({ type: OCCM_GROUPS_FETCH_SUCCESS, groups: data })
    v
Reducer (reducers/occm_groups.ts)
    |
    | Updates items Map with received groups
    | Sets isLoading: false, loaded: true
    v
Component re-renders with new data
```

### 5.4 Frontend Component Hierarchy

```
App Router
  +-- /groups          -> OccmGroupsIndex
  |                         +-- ColumnHeader (title: "Groups")
  |                         +-- NewGroupButton
  |                         +-- ScrollableList
  |                              +-- OccmGroupItem (per group)
  |                                   +-- RoleBadge
  |
  +-- /groups/new      -> OccmGroupNew
  |                         +-- ColumnHeader (title: "New Group")
  |                         +-- GroupForm (title, description, approval toggle)
  |
  +-- /groups/:id      -> OccmGroupTimeline
  |                         +-- ColumnHeader (group title + action buttons)
  |                         +-- StatusListContainer (group statuses)
  |                         +-- ComposeForm (group context)
  |
  +-- /groups/:id/members -> OccmGroupMembers
  |                         +-- ColumnHeader (title: "Members")
  |                         +-- Tabs (Active | Pending)
  |                         +-- ScrollableList
  |                              +-- MemberItem (avatar, name, role, actions)
  |
  +-- /groups/:id/reports -> OccmGroupReports
                            +-- ColumnHeader (title: "Reports")
                            +-- Tabs (Open | Resolved)
                            +-- ScrollableList
                                 +-- ReportItem (reporter, target, category, actions)
```

---

## 6. Security Considerations

### 6.1 Membership Enforcement at API Level

Every endpoint that returns group content or allows group interactions verifies active membership:

- **Controllers**: `before_action :set_occm_group` loads the group, then the service layer or policy checks membership.
- **Timeline**: Returns 403 if the requesting account is not an active member.
- **Post creation**: Service raises `Mastodon::NotPermittedError` if membership is not active.
- **Status viewing**: Individual group statuses return 404 (not 403) to non-members to avoid leaking group existence.

### 6.2 Visibility Checks for Statuses

Group statuses use `limited` visibility which already excludes them from:
- Public timelines (local, federated, hashtag)
- Search indexes
- ActivityPub delivery

Additional checks:
- The `Status::OccmGroupVisibility` concern adds `visible_to_occm_group_member?` which is called whenever a limited-visibility status with a group association is accessed.
- Home feed queries must exclude group posts (they have `occm_group_statuses` records).

### 6.3 Pundit Policy Authorization

All mutating actions go through `OccmGroupPolicy`:

| Policy Method | Checks |
|---------------|--------|
| `update?` | Current user is group admin |
| `destroy?` | Current user is group admin |
| `moderate?` | Current user is admin or moderator |
| `transfer?` | Current user is group admin |
| `post?` | Current user has active membership |

Policy loads membership once and caches it for the request lifecycle.

### 6.4 Streaming Channel Access Control

The Node.js streaming server (`streaming/index.js`) must verify group membership before allowing a client to subscribe to `occm_group:{id}`:

```
1. Client connects with access_token
2. Server resolves token -> account_id
3. Server queries: OccmGroupMembership.active.exists?(occm_group_id, account_id)
4. If not member: reject subscription (close WebSocket or send error frame)
5. If member: subscribe to Redis channel
```

This mirrors the existing `authorizeListAccess` pattern used for list timeline streams.

### 6.4.1 Streaming Revocation on Member Removal

Authorization at subscribe time is not sufficient for a private-group feature. If a member is removed or kicked while they have an active WebSocket subscription, they will continue receiving group events until they disconnect or reload the page. This creates a fail-open window for private content.

**Mechanism: Revoke Event via Redis**

When `RemoveOccmGroupMemberService` removes a member, it publishes a `revoke` event on the group streaming channel that the Node.js streaming server intercepts:

```
RemoveOccmGroupMemberService
    |
    | 1. Destroy OccmGroupMembership record
    | 2. Decrement member_count
    | 3. Publish revoke event to Redis:
    |      Channel: "timeline:occm_group:{group_id}"
    |      Payload: { event: "revoke", payload: { account_id: removed_account_id } }
    v
Redis Pub/Sub  -------->  Node.js Streaming Server
                                |
                                | 4. Intercept "revoke" event before relaying
                                | 5. Look up active WebSocket sessions for this channel
                                | 6. For matching account_id: force-unsubscribe the client
                                |    (send a "disconnect" frame, then close the channel subscription)
                                | 7. Do NOT relay the "revoke" event to other subscribers
                                v
                          Removed member's WebSocket is closed for this channel
```

**Implementation details:**

- The streaming server maintains a mapping of `(channel, account_id) -> WebSocket session`. On receiving a `revoke` event, it finds the matching session and terminates the subscription.
- The removed client receives a WebSocket close frame with a reason code indicating revoked access. The frontend handles this by removing the group from its active streams and displaying an appropriate message.
- The `revoke` event is never forwarded to other subscribers -- it is consumed exclusively by the streaming server.
- This approach adds minimal latency (single Redis publish) and requires no periodic polling or re-authentication cycles.

**Fallback: Periodic re-authorization** (defense in depth)

As a secondary safeguard, the streaming server should periodically re-verify membership for long-lived subscriptions (e.g., every 5 minutes). If membership no longer exists, the subscription is terminated. This handles edge cases where the revoke event is missed due to a transient Redis failure.

### 6.5 Prevention of Content Leaking

| Vector | Mitigation |
|--------|-----------|
| Federation | `limited` visibility + `local_only: true` prevents AP delivery |
| Public timelines | `limited` visibility excludes from public/local/hashtag |
| Search | Group posts excluded from search indexing |
| Embeds/OEmbed | `limited` visibility returns 404 for anonymous/remote requests |
| RSS feeds | `limited` visibility excluded from account RSS |
| API status lookup | `GET /api/v1/statuses/:id` returns 404 for non-members |
| Boosts | `limited` visibility cannot be boosted |
| Home feed | Group posts explicitly excluded from home fanout |

### 6.6 Admin-Cannot-Leave Constraint

The admin is the single point of accountability for a group. The `RemoveOccmGroupMemberService` explicitly rejects requests where the target is the group admin, returning a 422 error. The only paths for an admin to exit are:
1. Transfer admin role to another active member
2. Delete the group entirely

---

## 7. Performance Considerations

### 7.1 Counter Caches

`occm_groups.member_count` avoids `COUNT(*)` queries on the memberships table:
- Updated synchronously by services (increment on approve/join, decrement on remove/leave)
- Reconciled daily by `OccmGroupCounterReconciliationWorker` (batch of 200, `find_each`)
- Uses `update_column` (skips callbacks/validations) for efficiency during reconciliation

### 7.2 N+1 Prevention

The serializer supports a `memberships_map` option for batch-loading:

```ruby
# In controller index action:
memberships = OccmGroupMembership.where(
  occm_group_id: @occm_groups.select(:id),
  account_id: current_account.id
).index_by(&:occm_group_id)

render json: @occm_groups,
       each_serializer: REST::OccmGroupSerializer,
       memberships_map: memberships
```

This preloads the current user's membership for all groups in a single query, avoiding N+1 on the `index` action. The serializer checks the map first, falling back to a per-object query only on `show` actions.

Similarly, member list endpoints use `.includes(:account)` to eager-load account data for serialization.

### 7.3 Streaming vs Polling

Group timelines use real-time streaming (Redis pub/sub -> Node.js -> WebSocket) rather than polling:
- No repeated HTTP requests
- Instant delivery of new posts and deletions
- Connection authenticated once at subscribe time
- Matches existing pattern (`connectListStream`)

### 7.4 Cursor-Based Pagination

All list endpoints (members, timeline, reports) use cursor-based pagination with `max_id`, `since_id`, `min_id`:
- No `OFFSET` queries (which degrade with large datasets)
- Uses indexed `id` column for efficient seeks
- `Link` headers provide next/prev URIs
- Default limit: 40, maximum: 80

### 7.5 Batch Processing in Workers

The reconciliation worker processes groups in batches of 200 (`find_each(batch_size: 200)`):
- Prevents memory bloat on instances with many groups
- Uses `update_column` (single SQL UPDATE per stale group) rather than full model save
- Runs in low-priority `scheduler` queue with `retry: 0` (idempotent, will run again tomorrow)

### 7.6 Redis Pub/Sub Efficiency

Group streaming uses one Redis channel per group (`timeline:occm_group:{id}`):
- Publish is O(1) regardless of subscriber count -- Redis handles fan-out
- Only members with an active WebSocket receive events
- No need to enumerate members or maintain delivery lists
- Delete events are tiny (just the status ID string)

### 7.7 Database Indexes

Critical indexes for query performance:
- `(occm_group_id, account_id)` UNIQUE on memberships -- membership lookups
- `(occm_group_id, status_id)` UNIQUE on group_statuses -- timeline queries
- `account_id` on memberships -- "my groups" query
- `status_id` on group_statuses -- status-to-group reverse lookup
- `action_taken_at` on reports -- unresolved/resolved filtering

---

## 8. Error Handling Strategy

### 8.1 Validation Errors (422 Unprocessable Entity)

| Scenario | Error Source | Response |
|----------|-------------|----------|
| Title too long (>100 chars) | Model validation | `{ "error": "Validation failed: Title is too long (maximum is 100 characters)" }` |
| Description too long (>500 chars) | Model validation | Same pattern |
| Group limit reached (50 per account) | Custom validation | `{ "error": "You have reached the maximum number of groups" }` |
| Already a member | Service check | `{ "error": "You are already a member of this group" }` |
| Pending request exists | Service check | `{ "error": "You already have a pending join request" }` |
| Admin cannot leave | Service check | `{ "error": "Admin cannot leave the group. Transfer admin role or delete the group." }` |

### 8.2 Authorization Failures (403 Forbidden)

Raised by Pundit when a policy method returns `false`:

| Scenario | Policy Method |
|----------|--------------|
| Non-admin tries to update group settings | `OccmGroupPolicy#update?` |
| Non-admin tries to delete group | `OccmGroupPolicy#destroy?` |
| Non-admin/mod tries to approve/reject members | `OccmGroupPolicy#moderate?` |
| Non-admin tries to transfer ownership | `OccmGroupPolicy#transfer?` |
| Non-member tries to post | `OccmGroupPolicy#post?` |

Mastodon's `Api::BaseController` rescues `Pundit::NotAuthorizedError` and returns `{ "error": "This action is not allowed" }` with status 403.

### 8.3 Not Found (404)

| Scenario | Behavior |
|----------|----------|
| Group ID does not exist | `ActiveRecord::RecordNotFound` -> 404 |
| Non-member requests group timeline | 404 (not 403, to avoid leaking group existence) |
| Non-member requests specific group status | 404 |
| Member ID does not exist in group | 404 |

### 8.4 Race Conditions

**Admin Transfer Race:**

Two concurrent requests to transfer admin to different accounts:
- The `TransferOccmGroupAdminService` wraps the role swap in a database transaction with row-level locking (`lock!`).
- Only one transaction succeeds; the other gets a stale state and the policy check fails (caller is no longer admin).

**Duplicate Join Requests:**

Two concurrent join requests from the same account:
- The UNIQUE index on `(occm_group_id, account_id)` prevents duplicate records.
- The second request raises `ActiveRecord::RecordNotUnique`, caught and returned as 422.

**Counter Cache Drift:**

Concurrent joins/leaves can lead to incorrect counter:
- Service objects use `increment!`/`decrement!` (atomic SQL) rather than read-modify-write.
- The reconciliation worker corrects any remaining drift daily.

### 8.5 Error Response Format

All errors follow Mastodon's standard error response format:

```json
{
  "error": "Human-readable error message"
}
```

For validation errors with multiple issues:

```json
{
  "error": "Validation failed: Title can't be blank, Description is too long (maximum is 500 characters)"
}
```

---

## 9. Testing Strategy

### 9.1 Model Specs

Location: `spec/models/occm_group_spec.rb`, `spec/models/occm_group_membership_spec.rb`, etc.

| What to Test | Examples |
|-------------|---------|
| Validations | Title presence, length limits, description length, group limit per account |
| Associations | `belongs_to :account`, `has_many :occm_group_memberships` |
| Enums | Role values (admin/moderator/user), state values (pending/active/rejected) |
| Scopes | `.active`, `.pending`, `.admins`, `.moderators`, `.with_moderation_role`, `.unresolved`, `.resolved` |
| Uniqueness | Duplicate membership prevented, duplicate group_status prevented |
| Callbacks | Counter cache behavior (if any model-level callbacks exist) |

### 9.2 Service Specs

Location: `spec/services/create_occm_group_service_spec.rb`, etc.

| Service | Key Test Cases |
|---------|---------------|
| `CreateOccmGroupService` | Creates group + admin membership in transaction; respects group limit; rolls back on failure |
| `JoinOccmGroupService` | Creates pending membership (approval required); creates active membership (no approval); rejects duplicate; rejects existing member |
| `ApproveOccmGroupMemberService` | Changes state to active; increments counter; sends notification; rejects non-pending |
| `RejectOccmGroupMemberService` | Changes state to rejected; sends notification; rejects non-pending |
| `RemoveOccmGroupMemberService` | Removes member; decrements counter; blocks admin self-removal |
| `TransferOccmGroupAdminService` | Swaps roles atomically; target must be active member; only admin can call |
| `PostToOccmGroupService` | Creates limited-visibility status; creates junction record; distributes; rejects non-member |
| `DeleteOccmGroupStatusService` | Removes status; notifies author; publishes delete event |
| `DistributeOccmGroupStatusService` | Publishes to correct Redis channel |
| `ResolveOccmGroupReportService` | Sets action_taken_at; records resolver; triggers side effects based on action |

### 9.3 Request Specs (API Integration)

Location: `spec/requests/api/v1/occm_groups_spec.rb`, etc.

| Endpoint | Test Cases |
|----------|-----------|
| `GET /api/v1/occm_groups` | Returns user's groups; empty when no groups; requires auth |
| `POST /api/v1/occm_groups` | Creates group; validates params; respects limit |
| `PUT /api/v1/occm_groups/:id` | Updates as admin; 403 for non-admin |
| `DELETE /api/v1/occm_groups/:id` | Deletes as admin; 403 for non-admin; cascades memberships |
| `POST .../members` | Join flow (pending/active); duplicate rejection |
| `POST .../members/:id/approve` | Approves as admin/mod; 403 for user |
| `GET .../timeline` | Returns statuses for member; 404 for non-member; pagination |
| `POST .../statuses` | Creates post as member; 403 for non-member |
| `POST .../transfer` | Transfers as admin; 403 for non-admin; target must be active member |

### 9.4 Policy Specs

Location: `spec/policies/occm_group_policy_spec.rb`

Test each policy method with each role (admin, moderator, user, non-member) to verify the permission matrix from the spec.

### 9.5 Serializer Specs

Location: `spec/serializers/rest/occm_group_serializer_spec.rb`

- Verify `id` is a string (not integer)
- Verify `role` and `membership_state` reflect current user's membership
- Verify `memberships_map` optimization works correctly
- Verify nested account serialization in membership serializer

### 9.6 Frontend Component Tests

Location: `app/javascript/mastodon/features/occm_groups/__tests__/`

- Component rendering with mock data
- User interactions (click create, click join, click approve)
- Loading states
- Error states
- Empty states

### 9.7 Integration Tests

End-to-end flows that cross component boundaries:
- Create group -> join as another user -> approve -> post -> verify streaming delivery
- Create group -> post -> delete post by moderator -> verify notification
- Transfer admin -> verify old admin loses admin actions
- File report -> resolve report -> verify state changes

### 9.8 Test Helpers

Create shared test helpers:
- `create(:occm_group)` factory (FactoryBot)
- `create(:occm_group_membership, :active)` trait
- `create(:occm_group_membership, :pending)` trait
- `create(:occm_group_status)` factory
- Helper method to set up a group with N members for timeline tests
