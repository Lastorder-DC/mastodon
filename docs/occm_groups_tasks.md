# OCCM Groups: Implementation Task Breakdown

This document breaks the OCCM Groups feature into ordered implementation phases with granular tasks. Each task is self-contained enough for a developer to pick up and implement independently, given its dependencies are satisfied.

## Conventions

- All identifiers use the `occm_` prefix (tables, models, controllers, API paths, scopes, i18n keys, streaming channels)
- Reference pattern: the Lists feature (`app/controllers/api/v1/lists_controller.rb`, `app/models/list.rb`, `app/javascript/mastodon/features/lists/`)
- i18n: all user-facing strings in both English (en) and Korean (ko)
- Full specification: `docs/occm_groups_spec.md`
- Migration/rollback plan: `docs/occm_groups_migration_plan.md`

---

## Phase 1: Database & Models (Foundation)

### Task 1.1: Create Migrations for All `occm_` Tables

**Description**: Create Rails migrations for `occm_groups`, `occm_group_memberships`, `occm_group_statuses`, `occm_group_reports`, and `occm_group_dm_rooms` (placeholder). Include all columns, indexes, and foreign keys as specified in the schema section of the spec.

**Files to create**:
- `db/migrate/YYYYMMDDHHMMSS_create_occm_groups.rb`
- `db/migrate/YYYYMMDDHHMMSS_create_occm_group_memberships.rb`
- `db/migrate/YYYYMMDDHHMMSS_create_occm_group_statuses.rb`
- `db/migrate/YYYYMMDDHHMMSS_create_occm_group_reports.rb`
- `db/migrate/YYYYMMDDHHMMSS_create_occm_group_dm_rooms.rb`

**Dependencies**: None (first task)

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `rails db:migrate` runs without errors
- [ ] `rails db:rollback` for each migration works cleanly
- [ ] All tables exist with correct columns, types, and defaults
- [ ] UNIQUE indexes on `(occm_group_id, account_id)` for memberships and `(occm_group_id, status_id)` for statuses
- [ ] Foreign keys with `ON DELETE CASCADE` where specified
- [ ] `occm_group_reports` has array column `status_ids` (bigint[])

---

### Task 1.2: Create Model Classes

**Description**: Create ActiveRecord model classes with validations, associations, enums, and scopes as defined in the spec. Include the `Paginable` concern where needed.

**Files to create**:
- `app/models/occm_group.rb`
- `app/models/occm_group_membership.rb`
- `app/models/occm_group_status.rb`
- `app/models/occm_group_report.rb`
- `app/models/occm_group_dm_room.rb`
- `app/models/concerns/status/occm_group_visibility.rb`

**Files to modify**:
- `app/models/account.rb` -- add `has_many :occm_groups` association
- `app/models/status.rb` -- add `has_one :occm_group_status` association, include `Status::OccmGroupVisibility`

**Dependencies**: Task 1.1 (migrations must exist)

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] All model validations work (title presence/length, description length, group limit)
- [ ] Enums defined: `role` (admin:0, moderator:1, user:2), `state` (pending:0, active:1, rejected:2), `category` (other:0, spam:1, harassment:2, off_topic:3, rule_violation:4)
- [ ] Scopes work: `.active`, `.pending`, `.admins`, `.moderators`, `.with_moderation_role`, `.unresolved`, `.resolved`
- [ ] Associations are navigable (e.g., `occm_group.members`, `account.occm_groups`)
- [ ] `Status::OccmGroupVisibility` concern provides `visible_to_occm_group_member?` method

---

### Task 1.3: Add Model Specs

**Description**: Write RSpec unit tests for all model validations, associations, enums, scopes, and custom methods.

**Files to create**:
- `spec/models/occm_group_spec.rb`
- `spec/models/occm_group_membership_spec.rb`
- `spec/models/occm_group_status_spec.rb`
- `spec/models/occm_group_report_spec.rb`
- `spec/fabricators/occm_group_fabricator.rb`
- `spec/fabricators/occm_group_membership_fabricator.rb`
- `spec/fabricators/occm_group_status_fabricator.rb`
- `spec/fabricators/occm_group_report_fabricator.rb`

**Dependencies**: Task 1.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] All model specs pass with `bundle exec rspec spec/models/occm_group*`
- [ ] Fabricators produce valid objects
- [ ] Validation edge cases tested (boundary lengths, uniqueness conflicts, group limit)
- [ ] Scope queries verified against test data
- [ ] Enum value mappings verified

---

## Phase 2: OAuth Scopes & Routes (Wiring)

### Task 2.1: Register OAuth Scopes in Doorkeeper

**Description**: Add `read:occm_groups` and `write:occm_groups` to Doorkeeper's optional_scopes list so they can be requested by OAuth applications.

**Files to modify**:
- `config/initializers/doorkeeper.rb` -- add to `optional_scopes`

**Dependencies**: None (can be done in parallel with Phase 1)

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `Doorkeeper.configuration.optional_scopes` includes `:'read:occm_groups'` and `:'write:occm_groups'`
- [ ] The umbrella `read` scope implicitly includes `read:occm_groups`
- [ ] The umbrella `write` scope implicitly includes `write:occm_groups`
- [ ] Application boots without errors after change

---

### Task 2.2: Add API Routes

**Description**: Register all OCCM Groups API routes in the routes file following the pattern from the spec (Section 13.7).

**Files to modify**:
- `config/routes/api.rb` -- add `resources :occm_groups` block within `namespace :v1`

**Dependencies**: None (can be done in parallel with Phase 1)

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `rails routes | grep occm_group` shows all expected routes
- [ ] Routes match: CRUD for groups, members (index/create/destroy + pending/approve/reject), moderators (create/destroy), statuses (create/destroy), timeline (show), reports (index/create + resolve), transfer
- [ ] Route helpers are available (e.g., `api_v1_occm_groups_path`)

---

## Phase 3: Services & Business Logic (Core)

### Task 3.1: CreateOccmGroupService

**Description**: Service that creates a new group and automatically creates the admin membership for the creator in a single transaction.

**Files to create**:
- `app/services/create_occm_group_service.rb`

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Creates `OccmGroup` with given params
- [ ] Creates `OccmGroupMembership` with role: :admin, state: :active for the creator
- [ ] Sets `member_count` to 1
- [ ] Wraps in `ApplicationRecord.transaction`
- [ ] Raises validation errors if group limit reached or params invalid
- [ ] Follows `BaseService` pattern (inherits from `BaseService`, defines `call` method)

---

### Task 3.2: Join / Approve / Reject Services

**Description**: Implement `JoinOccmGroupService`, `ApproveOccmGroupMemberService`, and `RejectOccmGroupMemberService` to handle the membership request lifecycle.

**Files to create**:
- `app/services/join_occm_group_service.rb`
- `app/services/approve_occm_group_member_service.rb`
- `app/services/reject_occm_group_member_service.rb`

**Dependencies**: Task 1.2, Task 3.8 (NotifyOccmGroupService -- can be stubbed initially)

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `JoinOccmGroupService`: Creates pending membership when `approval_required: true`; creates active membership and increments counter when `approval_required: false`; raises error if already member or already pending
- [ ] `ApproveOccmGroupMemberService`: Updates membership state to active; increments `member_count`; sends `occm_group_join_approved` notification
- [ ] `RejectOccmGroupMemberService`: Updates membership state to rejected; sends `occm_group_join_rejected` notification
- [ ] Notifications dispatched to admin/moderators on join request (when approval required)

---

### Task 3.3: RemoveOccmGroupMemberService

**Description**: Service to remove a member from a group, with the admin-cannot-leave constraint.

**Files to create**:
- `app/services/remove_occm_group_member_service.rb`

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Removes membership and decrements `member_count`
- [ ] Raises error (422) if target account is the group admin
- [ ] Allows self-removal (leaving the group) for non-admin members
- [ ] Allows admin/mod to remove other members

---

### Task 3.4: TransferOccmGroupAdminService

**Description**: Atomically transfers the admin role from the current admin to another active member.

**Files to create**:
- `app/services/transfer_occm_group_admin_service.rb`

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Target account must be an active member of the group
- [ ] Wraps in transaction with row-level locking (`lock!`)
- [ ] Sets target membership role to `:admin`
- [ ] Sets former admin membership role to `:user`
- [ ] Updates `occm_groups.account_id` to new admin
- [ ] Raises error if target is not an active member

---

### Task 3.5: PostToOccmGroupService & DistributeOccmGroupStatusService

**Description**: Service to create a post within a group (limited visibility, local-only, linked via junction table) and distribute it to group members via streaming.

**Files to create**:
- `app/services/post_to_occm_group_service.rb`
- `app/services/distribute_occm_group_status_service.rb`

**Dependencies**: Task 1.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `PostToOccmGroupService`: Verifies active membership; calls `PostStatusService` with `visibility: :limited`, `local_only: true`; creates `OccmGroupStatus` record; calls distribute service
- [ ] `DistributeOccmGroupStatusService`: Renders status JSON via `InlineRenderer`; publishes to Redis channel `timeline:occm_group:{id}` with event type `:update`
- [ ] Status is not federated (verified by limited visibility + local_only)

---

### Task 3.6: DeleteOccmGroupStatusService

**Description**: Service for admin/moderator to delete a post from the group, notify the author, and publish a delete event to the streaming channel.

**Files to create**:
- `app/services/delete_occm_group_status_service.rb`

**Dependencies**: Task 1.2, Task 3.5

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Removes the `OccmGroupStatus` record
- [ ] Destroys (or soft-deletes) the underlying `Status`
- [ ] Sends `occm_group_post_deleted` notification to the post author
- [ ] Publishes delete event to Redis channel `timeline:occm_group:{id}`

---

### Task 3.7: ResolveOccmGroupReportService

**Description**: Service to resolve a group report with an action (dismiss, delete posts, remove member).

**Files to create**:
- `app/services/resolve_occm_group_report_service.rb`

**Dependencies**: Task 1.2, Task 3.3, Task 3.6

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Sets `action_taken_at` to current time
- [ ] Sets `action_taken_by_account_id` to the resolver
- [ ] If action is `delete_posts`: calls `DeleteOccmGroupStatusService` for each referenced status
- [ ] If action is `remove_member`: calls `RemoveOccmGroupMemberService` for target account
- [ ] If action is `dismiss`: only marks as resolved, no side effects

---

### Task 3.8: OccmGroupCounterReconciliationWorker & NotifyOccmGroupService

**Description**: Background worker for counter cache reconciliation and the notification dispatch service.

**Files to create**:
- `app/workers/occm_group_counter_reconciliation_worker.rb`
- `app/services/notify_occm_group_service.rb`

**Dependencies**: Task 1.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Worker processes groups in batches of 200 via `find_each`
- [ ] Compares `member_count` to actual `occm_group_memberships.active.count`
- [ ] Uses `update_column` for efficiency (no callbacks/validations)
- [ ] Worker configured: `queue: 'scheduler'`, `retry: 0`
- [ ] `NotifyOccmGroupService`: Creates `Notification` record with correct type and activity; publishes to Redis notification channel

---

## Phase 4: Policies & Serializers

### Task 4.1: OccmGroupPolicy (Pundit)

**Description**: Create the Pundit policy class that enforces role-based authorization for all group actions.

**Files to create**:
- `app/policies/occm_group_policy.rb`

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Inherits from `ApplicationPolicy`
- [ ] `update?` and `destroy?` return true only for admin
- [ ] `moderate?` returns true for admin or moderator
- [ ] `transfer?` returns true only for admin
- [ ] `post?` returns true for any active member
- [ ] Policy loads membership once and memoizes
- [ ] Returns false (not error) for non-members

---

### Task 4.2: REST Serializers

**Description**: Create JSON serializers for groups, memberships, and reports following the `REST::ListSerializer` pattern.

**Files to create**:
- `app/serializers/rest/occm_group_serializer.rb`
- `app/serializers/rest/occm_group_membership_serializer.rb`
- `app/serializers/rest/occm_group_report_serializer.rb`

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `OccmGroupSerializer` outputs: id (string), title, description, approval_required, member_count, role, membership_state, created_at
- [ ] `id` is converted to string via `id.to_s`
- [ ] `role` and `membership_state` read from `memberships_map` option (for N+1 prevention) or fall back to query
- [ ] `OccmGroupMembershipSerializer` outputs: id, role, state, created_at, nested account
- [ ] `OccmGroupReportSerializer` outputs: id, occm_group_id, account, target_account, status_ids, comment, category, action_taken_at, action_taken_by_account, created_at

---

## Phase 5: API Controllers

### Task 5.1: OccmGroupsController (CRUD)

**Description**: Main controller for group CRUD operations following the `ListsController` pattern.

**Files to create**:
- `app/controllers/api/v1/occm_groups_controller.rb`

**Dependencies**: Task 1.2, Task 2.1, Task 2.2, Task 3.1, Task 4.1, Task 4.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `index`: Returns groups where current user is an active member; preloads memberships_map for N+1 prevention
- [ ] `show`: Returns single group with role/membership_state
- [ ] `create`: Calls `CreateOccmGroupService`, returns created group
- [ ] `update`: Authorizes via policy (admin only), updates params
- [ ] `destroy`: Authorizes via policy (admin only), destroys group
- [ ] Doorkeeper scopes: read for index/show, write for create/update/destroy
- [ ] `require_user!` before all actions
- [ ] `set_occm_group` before_action for show/update/destroy

---

### Task 5.2: OccmGroups::MembersController

**Description**: Controller for membership management (list members, join, approve, reject, remove).

**Files to create**:
- `app/controllers/api/v1/occm_groups/members_controller.rb`

**Dependencies**: Task 1.2, Task 2.2, Task 3.2, Task 3.3, Task 4.1, Task 4.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `index`: Lists active members with pagination; requires read scope; requires active membership
- [ ] `pending`: Lists pending members; requires moderate? policy; includes account data
- [ ] `create`: Calls `JoinOccmGroupService`; returns membership
- [ ] `approve`: Calls `ApproveOccmGroupMemberService`; requires moderate?
- [ ] `reject`: Calls `RejectOccmGroupMemberService`; requires moderate?
- [ ] `destroy`: Calls `RemoveOccmGroupMemberService`; handles self-removal and admin/mod removal
- [ ] Pagination via `Link` headers (max_id, since_id, limit)

---

### Task 5.3: OccmGroups::ModeratorsController

**Description**: Controller for promoting/demoting moderators (admin only).

**Files to create**:
- `app/controllers/api/v1/occm_groups/moderators_controller.rb`

**Dependencies**: Task 1.2, Task 2.2, Task 4.1

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `create`: Promotes active member to moderator role; requires admin
- [ ] `destroy`: Demotes moderator to user role; requires admin
- [ ] Returns updated membership via serializer
- [ ] 404 if target is not an active member

---

### Task 5.4: OccmGroups::StatusesController

**Description**: Controller for posting to a group and deleting group posts (admin/mod).

**Files to create**:
- `app/controllers/api/v1/occm_groups/statuses_controller.rb`

**Dependencies**: Task 1.2, Task 2.2, Task 3.5, Task 3.6, Task 4.1

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `create`: Calls `PostToOccmGroupService`; requires active membership; returns status JSON
- [ ] `destroy`: Calls `DeleteOccmGroupStatusService`; requires moderate? policy
- [ ] Accepts params: status (text), media_ids, poll

---

### Task 5.5: OccmGroups::TimelinesController

**Description**: Controller for fetching the group timeline (paginated status list).

**Files to create**:
- `app/controllers/api/v1/occm_groups/timelines_controller.rb`

**Dependencies**: Task 1.2, Task 2.2, Task 4.1

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `show`: Returns paginated statuses for the group
- [ ] Requires active membership (returns 404 for non-members)
- [ ] Supports cursor-based pagination (max_id, since_id, min_id, limit)
- [ ] Returns `Link` headers for next/prev pages
- [ ] Includes status accounts (eager-loaded to prevent N+1)

---

### Task 5.6: OccmGroups::ReportsController

**Description**: Controller for filing and managing group reports.

**Files to create**:
- `app/controllers/api/v1/occm_groups/reports_controller.rb`

**Dependencies**: Task 1.2, Task 2.2, Task 3.7, Task 4.1, Task 4.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] `index`: Lists reports; requires moderate? policy; supports pagination and `resolved` filter
- [ ] `create`: Files a report; requires active membership; validates params
- [ ] `resolve`: Calls `ResolveOccmGroupReportService`; requires moderate? policy
- [ ] Accepts params: target_account_id, status_ids, comment, category
- [ ] Resolve accepts params: action (dismiss, delete_posts, remove_member)

---

### Task 5.7: Admin Transfer Endpoint

**Description**: Add the `transfer` action to the main OccmGroupsController (or a dedicated controller).

**Files to modify**:
- `app/controllers/api/v1/occm_groups_controller.rb` -- add `transfer` action

**Dependencies**: Task 5.1, Task 3.4

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `POST /api/v1/occm_groups/:id/transfer` with `{ account_id: ... }`
- [ ] Calls `TransferOccmGroupAdminService`
- [ ] Requires admin (via policy)
- [ ] Returns updated group (caller now has role: "user")

---

## Phase 6: Notifications

### Task 6.1: Register Notification Types

**Description**: Add OCCM group notification types to the Notification model's PROPERTIES hash.

**Files to modify**:
- `app/models/notification.rb` -- add 4 new types to PROPERTIES hash

**Dependencies**: Task 1.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Types added: `occm_group_join_request`, `occm_group_join_approved`, `occm_group_join_rejected`, `occm_group_post_deleted`
- [ ] All types have `filterable: true` and `baseline: false`
- [ ] Notification model can create records with these types without error
- [ ] Application boots without errors

---

### Task 6.2: NotifyOccmGroupService Integration

**Description**: Ensure `NotifyOccmGroupService` (Task 3.8) is properly integrated with all services that dispatch notifications.

**Files to modify**:
- `app/services/join_occm_group_service.rb` -- dispatch join_request notification
- `app/services/approve_occm_group_member_service.rb` -- dispatch join_approved notification
- `app/services/reject_occm_group_member_service.rb` -- dispatch join_rejected notification
- `app/services/delete_occm_group_status_service.rb` -- dispatch post_deleted notification

**Dependencies**: Task 3.2, Task 3.6, Task 3.8, Task 6.1

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Join request sends notification to all admin + moderator members
- [ ] Approve sends notification to the requesting user
- [ ] Reject sends notification to the requesting user
- [ ] Post delete sends notification to the post author
- [ ] Notifications appear in user's notification stream

---

## Phase 7: Streaming

### Task 7.1: Backend Redis Publish

**Description**: Ensure `DistributeOccmGroupStatusService` publishes correctly to Redis for the streaming server to pick up.

**Files to verify/modify**:
- `app/services/distribute_occm_group_status_service.rb` (created in Task 3.5)

**Dependencies**: Task 3.5

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Publishes to channel `timeline:occm_group:{group_id}`
- [ ] Payload format matches Mastodon streaming conventions: `{ event: :update, payload: <status_json> }`
- [ ] Delete events published with `{ event: :delete, payload: status_id }`

---

### Task 7.2: Node.js Streaming Server Channel Registration

**Description**: Register the `occm_group` channel in the Node.js streaming server with membership authorization.

**Files to modify**:
- `streaming/index.js` -- add `occm_group` channel handler following `authorizeListAccess` pattern

**Dependencies**: Task 1.1 (needs DB tables for authorization query)

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Client can subscribe to channel `occm_group` with param `group={id}`
- [ ] Server verifies account has active membership in the specified group before subscribing
- [ ] Unauthorized subscriptions are rejected (401)
- [ ] Authorized subscriptions receive Redis events from `timeline:occm_group:{id}`
- [ ] Events relayed: `update` (new post), `delete` (post removed)

---

### Task 7.3: Frontend Streaming Connection Action

**Description**: Add the `connectOccmGroupStream` action following the `connectListStream` pattern.

**Files to modify**:
- `app/javascript/mastodon/actions/streaming.js` -- add `connectOccmGroupStream`

**Dependencies**: Task 7.2

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `connectOccmGroupStream(groupId)` returns a disconnect function
- [ ] Calls `connectTimelineStream('occm_group:{groupId}', 'occm_group', { group: groupId })`
- [ ] Timeline updates and deletes are processed when events arrive

---

## Phase 8: Backend i18n

### Task 8.1: Add Backend Locale Keys

**Description**: Add all `occm_groups` keys to the English and Korean locale files for backend error messages, notification text, report categories, and role names.

**Files to modify**:
- `config/locales/en.yml` -- add `occm_groups` key tree
- `config/locales/ko.yml` -- add `occm_groups` key tree

**Dependencies**: None (can be done anytime)

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] Keys include: title, errors (limit, not_member, already_member, admin_cannot_leave, not_authorized, pending_request), notifications (join_request, join_approved, join_rejected, post_deleted), reports.categories (other, spam, harassment, off_topic, rule_violation), roles (admin, moderator, user)
- [ ] Korean translations are natural/correct
- [ ] `I18n.t('occm_groups.errors.limit')` returns the expected string
- [ ] No missing translation warnings in test output

---

## Phase 9: Frontend - API & State

### Task 9.1: API Types

**Description**: Define TypeScript interfaces for OCCM Groups API responses.

**Files to create**:
- `app/javascript/mastodon/api_types/occm_groups.ts`

**Dependencies**: None (can be done in parallel with backend)

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] `ApiOccmGroupJSON` interface with all fields (id, title, description, approval_required, member_count, role, membership_state, created_at)
- [ ] `ApiOccmGroupMembershipJSON` interface (id, account, role, state, created_at)
- [ ] `ApiOccmGroupReportJSON` interface (id, occm_group_id, account, target_account, status_ids, comment, category, action_taken_at, action_taken_by_account, created_at)
- [ ] Proper use of string union types for enums

---

### Task 9.2: API Module

**Description**: Create the API client module with functions for all OCCM Groups endpoints.

**Files to create**:
- `app/javascript/mastodon/api/occm_groups.ts`

**Dependencies**: Task 9.1

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Functions for all endpoints: CRUD groups, membership actions, timeline, posting, reports, moderator management, admin transfer
- [ ] Uses `apiRequestGet`, `apiRequestPost`, `apiRequestPut`, `apiRequestDelete` from `mastodon/api`
- [ ] Correct TypeScript typing for request params and return types
- [ ] Follows patterns from `app/javascript/mastodon/api/lists.ts`

---

### Task 9.3: Actions

**Description**: Create Redux action creators and action type constants for OCCM Groups.

**Files to create**:
- `app/javascript/mastodon/actions/occm_groups.ts`

**Dependencies**: Task 9.2

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Action types for all async operations: FETCH, CREATE, UPDATE, DELETE (REQUEST/SUCCESS/FAIL pattern)
- [ ] Action types for members: FETCH, JOIN, LEAVE, APPROVE, REJECT
- [ ] Action types for timeline: EXPAND (REQUEST/SUCCESS/FAIL)
- [ ] Thunk action creators that call API module and dispatch appropriate actions
- [ ] Error handling dispatches FAIL actions with error payload

---

### Task 9.4: Reducer

**Description**: Create the Redux reducer for OCCM Groups state management.

**Files to create**:
- `app/javascript/mastodon/reducers/occm_groups.ts`

**Files to modify**:
- `app/javascript/mastodon/reducers/index.ts` -- import and register `occm_groups` reducer

**Dependencies**: Task 9.3

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Handles all action types from Task 9.3
- [ ] State shape uses Immutable.js Maps (matching existing patterns)
- [ ] `items` Map keyed by group ID
- [ ] `isLoading` and `loaded` flags managed correctly
- [ ] Registered in root reducer at `state.occm_groups`
- [ ] Application builds without TypeScript errors

---

## Phase 10: Frontend - UI Components

### Task 10.1: Group List Screen

**Description**: Main screen showing all groups the user belongs to, with a button to create new groups.

**Files to create**:
- `app/javascript/mastodon/features/occm_groups/index.tsx`
- `app/javascript/mastodon/features/occm_groups/components/occm_group_item.tsx`
- `app/javascript/mastodon/features/occm_groups/components/role_badge.tsx`

**Dependencies**: Task 9.3, Task 9.4

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Uses `Column` and `ColumnHeader` components (pattern from `features/lists/index.tsx`)
- [ ] Fetches groups on mount via `fetchOccmGroups` action
- [ ] Renders `ScrollableList` with `OccmGroupItem` for each group
- [ ] Each item shows: title, member count, user's role badge
- [ ] "New Group" button navigates to create screen
- [ ] Clicking a group navigates to its timeline
- [ ] Loading and empty states handled

---

### Task 10.2: Create/Edit Group Screen

**Description**: Form screen for creating a new group or editing an existing one.

**Files to create**:
- `app/javascript/mastodon/features/occm_groups/new.tsx`

**Dependencies**: Task 9.3, Task 9.4

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Title input (max 100 characters)
- [ ] Description textarea (max 500 characters)
- [ ] "Require approval to join" toggle
- [ ] Create button dispatches `createOccmGroup` action
- [ ] Edit mode: pre-fills form, dispatches `updateOccmGroup`
- [ ] Navigates back to group list on success
- [ ] Displays validation errors from API

---

### Task 10.3: Group Timeline Screen

**Description**: Timeline view for a specific group showing posts and enabling real-time streaming.

**Files to create**:
- `app/javascript/mastodon/features/occm_group_timeline/index.tsx`

**Dependencies**: Task 7.3, Task 9.3, Task 9.4

**Complexity**: L (large, 3-8 hours)

**Acceptance criteria**:
- [ ] Displays group posts using `StatusListContainer` pattern
- [ ] Connects to streaming via `connectOccmGroupStream(groupId)` on mount
- [ ] Disconnects streaming on unmount
- [ ] Supports infinite scroll with cursor-based pagination
- [ ] ColumnHeader shows group title with action buttons (settings, members, compose)
- [ ] Compose integration for posting to the group
- [ ] New posts from stream prepended to timeline in real time
- [ ] Deleted posts removed from timeline in real time

---

### Task 10.4: Group Members Screen

**Description**: Screen for viewing and managing group members, including pending join requests.

**Files to create**:
- `app/javascript/mastodon/features/occm_groups/members.tsx`
- `app/javascript/mastodon/features/occm_groups/components/member_item.tsx`

**Dependencies**: Task 9.3, Task 9.4

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Tab navigation: "Active" and "Pending" (pending tab visible only to admin/mod)
- [ ] Active tab: lists members with role badges
- [ ] Admin/mod see action buttons: Remove, Promote/Demote
- [ ] Pending tab: lists pending requests with Approve/Reject buttons
- [ ] Actions dispatch appropriate Redux actions
- [ ] Pagination for large member lists

---

### Task 10.5: Group Reports Screen

**Description**: Screen for admin/moderators to view and manage group reports.

**Files to create**:
- `app/javascript/mastodon/features/occm_groups/reports.tsx`
- `app/javascript/mastodon/features/occm_groups/components/report_item.tsx`

**Dependencies**: Task 9.3, Task 9.4

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] Only accessible by admin/moderators
- [ ] Tab navigation: "Open" and "Resolved"
- [ ] Each report shows: reporter, target account, category, comment, reported status IDs
- [ ] Resolve button with action selection (dismiss, delete posts, remove member)
- [ ] Updates state on successful resolution

---

### Task 10.6: Navigation & Routing Integration

**Description**: Add "Groups" entry to the main navigation sidebar and register frontend routes.

**Files to modify**:
- `app/javascript/mastodon/features/ui/index.tsx` (or equivalent router file) -- add routes for `/groups`, `/groups/new`, `/groups/:id`, `/groups/:id/members`, `/groups/:id/reports`
- Navigation component (sidebar/column links) -- add Groups entry with icon

**Dependencies**: Task 10.1, Task 10.2, Task 10.3, Task 10.4, Task 10.5

**Complexity**: M (medium, 1-3 hours)

**Acceptance criteria**:
- [ ] "Groups" link appears in main navigation
- [ ] All routes resolve to correct components
- [ ] Navigation icon appropriate (people/group icon)
- [ ] Active state shown when on groups pages
- [ ] Back navigation works correctly from sub-screens

---

## Phase 11: Frontend i18n

### Task 11.1: Add Frontend Locale Keys

**Description**: Add all OCCM Groups translation strings to English and Korean locale JSON files.

**Files to modify**:
- `app/javascript/mastodon/locales/en.json` -- add `occm_groups.*` keys
- `app/javascript/mastodon/locales/ko.json` -- add `occm_groups.*` keys

**Dependencies**: Task 10.1-10.5 (to know all strings needed)

**Complexity**: S (small, < 1 hour)

**Acceptance criteria**:
- [ ] All keys from spec Section 10.2 present in both files
- [ ] Includes: title, create, edit, delete, join, leave, pending, members, pending_members, reports, approve, reject, remove_member, promote_mod, demote_mod, transfer_admin, timeline, post, approval_required, description, group_title, confirm_delete, member_count
- [ ] Korean translations are natural/correct
- [ ] `member_count` uses ICU plural syntax
- [ ] No missing translation warnings in UI

---

## Phase 12: Integration Testing & QA

### Task 12.1: Request Specs for All API Endpoints

**Description**: Write comprehensive request specs covering all API endpoints, authentication, authorization, pagination, and error cases.

**Files to create**:
- `spec/requests/api/v1/occm_groups_spec.rb`
- `spec/requests/api/v1/occm_groups/members_spec.rb`
- `spec/requests/api/v1/occm_groups/moderators_spec.rb`
- `spec/requests/api/v1/occm_groups/statuses_spec.rb`
- `spec/requests/api/v1/occm_groups/timelines_spec.rb`
- `spec/requests/api/v1/occm_groups/reports_spec.rb`

**Dependencies**: Phase 5 (all controllers)

**Complexity**: XL (extra large, 8+ hours)

**Acceptance criteria**:
- [ ] Every endpoint tested with: valid auth, missing auth, wrong scope
- [ ] Every endpoint tested with each role (admin, moderator, user, non-member)
- [ ] Pagination tested (max_id, since_id, limit, Link headers)
- [ ] Error responses verified (422, 403, 404)
- [ ] Race condition scenarios tested where applicable
- [ ] All specs pass with `bundle exec rspec spec/requests/api/v1/occm_groups`

---

### Task 12.2: Service Specs for All Services

**Description**: Write unit specs for every service, testing success paths, error paths, and edge cases.

**Files to create**:
- `spec/services/create_occm_group_service_spec.rb`
- `spec/services/join_occm_group_service_spec.rb`
- `spec/services/approve_occm_group_member_service_spec.rb`
- `spec/services/reject_occm_group_member_service_spec.rb`
- `spec/services/remove_occm_group_member_service_spec.rb`
- `spec/services/transfer_occm_group_admin_service_spec.rb`
- `spec/services/post_to_occm_group_service_spec.rb`
- `spec/services/delete_occm_group_status_service_spec.rb`
- `spec/services/distribute_occm_group_status_service_spec.rb`
- `spec/services/resolve_occm_group_report_service_spec.rb`
- `spec/services/notify_occm_group_service_spec.rb`

**Dependencies**: Phase 3 (all services)

**Complexity**: L (large, 3-8 hours)

**Acceptance criteria**:
- [ ] Each service has specs for: happy path, validation failures, authorization failures, edge cases
- [ ] Transaction rollback behavior verified for multi-step services
- [ ] Notification dispatch verified (with mocks or spy)
- [ ] Redis publish verified (with mocks)
- [ ] Counter cache updates verified
- [ ] All specs pass with `bundle exec rspec spec/services/*occm*`

---

### Task 12.3: Frontend Component Tests

**Description**: Write Jest/React Testing Library tests for frontend components.

**Files to create**:
- `app/javascript/mastodon/features/occm_groups/__tests__/index.test.tsx`
- `app/javascript/mastodon/features/occm_groups/__tests__/new.test.tsx`
- `app/javascript/mastodon/features/occm_groups/__tests__/members.test.tsx`
- `app/javascript/mastodon/features/occm_group_timeline/__tests__/index.test.tsx`

**Dependencies**: Phase 10 (all UI components)

**Complexity**: L (large, 3-8 hours)

**Acceptance criteria**:
- [ ] Components render without crashing with mock Redux store
- [ ] User interactions trigger correct actions (click handlers)
- [ ] Loading states displayed when `isLoading` is true
- [ ] Empty states displayed when no data
- [ ] Error states handled gracefully
- [ ] All tests pass with `yarn test`

---

### Task 12.4: End-to-End Flow Verification

**Description**: Manual and automated verification of complete flows crossing all layers.

**Dependencies**: All previous phases

**Complexity**: L (large, 3-8 hours)

**Acceptance criteria**:
- [ ] Flow: Create group -> automatically becomes admin -> group appears in list
- [ ] Flow: User B requests join -> admin sees notification -> approves -> User B is now member
- [ ] Flow: Member posts to group -> appears in group timeline via streaming -> not in home feed
- [ ] Flow: Moderator deletes post -> author receives notification -> post removed from timeline
- [ ] Flow: Admin transfers to User B -> Admin loses admin actions -> User B gains admin actions
- [ ] Flow: Member files report -> admin resolves with remove_member -> target removed from group
- [ ] Flow: Admin tries to leave -> receives error -> must transfer or delete
- [ ] Policy spec passes for full permission matrix (all roles x all actions)
- [ ] All `bundle exec rspec` tests pass
- [ ] All `yarn test` tests pass

---

## Dependency Graph (Summary)

```
Phase 1 (DB & Models) ----+----> Phase 3 (Services) ----+----> Phase 5 (Controllers) ---+
                          |                              |                               |
                          +----> Phase 4 (Policies/     -+                               |
                          |      Serializers)                                            |
                          |                                                              |
Phase 2 (Scopes/Routes) -+                                                              |
                                                                                         |
Phase 6 (Notifications) <---- Phase 3 + Phase 1                                         |
                                                                                         |
Phase 7 (Streaming) <---- Phase 3 + Phase 1                                             |
                                                                                         |
Phase 8 (Backend i18n) ---- independent, can start anytime                              |
                                                                                         |
Phase 9 (Frontend State) ---- can start after API types defined                         |
                          |                                                              |
                          +----> Phase 10 (Frontend UI) ----+                            |
                                                            |                            |
Phase 11 (Frontend i18n) <---- Phase 10                     |                            |
                                                            v                            v
                                                    Phase 12 (Integration Testing & QA)
```

---

## Complexity Summary

| Complexity | Count | Estimated Hours |
|-----------|-------|----------------|
| S (< 1 hour) | 16 tasks | ~12 hours |
| M (1-3 hours) | 16 tasks | ~32 hours |
| L (3-8 hours) | 4 tasks | ~20 hours |
| XL (8+ hours) | 1 task | ~10 hours |
| **Total** | **37 tasks** | **~74 hours** |

---

## Notes for Implementers

1. **Start with Phase 1** -- everything depends on the database schema and models.
2. **Phases 2 and 8 are independent** -- OAuth scopes, routes, and i18n can be done in parallel with any other phase.
3. **Phase 9 can start early** -- API types and the API module do not depend on the backend being complete (design from spec).
4. **Use Lists as reference** -- every component has an analog in the Lists feature. When in doubt, look at how Lists does it.
5. **Test incrementally** -- write specs alongside implementation, not all at the end.
6. **The `occm_` prefix is non-negotiable** -- it ensures coexistence with PR #19059.
7. **i18n in both en and ko** -- every user-facing string must be translated.
