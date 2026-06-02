# Community Groups implementation plan

This document records the implementation plan for adding a local-only “Groups” feature to this Mastodon fork. It is intended to be used as implementation guidance before writing code.

## References and constraints

- Reference PR: <https://github.com/mastodon/mastodon/pull/19059>
- Mastodon API documentation: <https://docs.joinmastodon.org/>
- First implementation scope is local-only groups. Inviting, joining, posting, and group DMs should support accounts from the same server only.
- Do not copy the reference PR database names directly. The reference PR uses names such as `groups`, `group_memberships`, `group_membership_requests`, `group_account_blocks`, `group_stats`, `group_deletion_requests`, `statuses.group_id`, and `statuses.approval_status`. Use a separate `community_` namespace so a future upstream implementation can coexist.
- Prefer an implementation that can later migrate into upstream's eventual schema, but keep deletion of the local implementation possible if migration is impractical.
- Do not infer unclear Mastodon behavior. Verify uncertain API, timeline, visibility, conversation, federation, and UI behavior against the source tree and official documentation before implementation.

## Goals

1. Allow users to create groups and share groups by link.
2. Allow group administrators to invite accounts on the same server.
3. Implement a group timeline and allow users to publish posts addressed to a specific group.
4. Ensure posts addressed to a group are always group-targeted posts, not normal public, unlisted, followers-only, or direct posts.
5. Allow DMs between group members.
6. Allow users to request membership in a group and allow group administrators to approve or reject requests.
7. Allow group administrators to kick members and ban accounts from rejoining.
8. Keep API shape close to the reference PR where practical.
9. Add “My groups” to the side navigation above lists.

## Non-goals for the first phase

- Remote or federated groups.
- ActivityPub group actors, group inboxes, group outboxes, or remote group membership.
- Full server-admin moderation UI, unless needed for safe operation.
- Redis fan-out optimization for very large groups. Start with SQL pagination, then optimize if needed.

## Database design

Use the `community_` prefix for all local group tables and status columns.

### `community_groups`

Suggested fields:

- `id`
- `owner_account_id`
- `display_name`
- `note`
- `slug` or `share_token`
- `locked` to require membership approval
- `discoverable`
- optional avatar/header attachment columns if existing attachment concerns can be reused safely
- `members_count`
- `statuses_count`
- `last_status_at`
- `created_at`
- `updated_at`

Suggested indexes:

- unique index on `slug`, if used
- unique index on `share_token`
- index on `owner_account_id`
- index on `discoverable`

The creating account should automatically become an administrator member.

### `community_group_memberships`

Suggested fields:

- `community_group_id`
- `account_id`
- `role`, with values such as `admin`, `moderator`, and `member`
- `created_at`
- `updated_at`

Suggested indexes:

- unique index on `[community_group_id, account_id]`
- index on `[account_id, community_group_id]`
- index on `[community_group_id, role]`

### `community_group_invitations`

Suggested fields:

- `community_group_id`
- `inviter_account_id`
- `invitee_account_id`
- `token`
- `status`, with values such as `pending`, `accepted`, `rejected`, `revoked`, and `expired`
- `expires_at`
- `created_at`
- `updated_at`

Rules:

- The invited account must be local.
- Do not create invitations for existing members.
- Do not create invitations for banned accounts.

### `community_group_join_requests`

Suggested fields:

- `community_group_id`
- `account_id`
- `status`, with values such as `pending`, `approved`, `rejected`, and `cancelled`
- `message`
- `reviewed_by_account_id`
- `reviewed_at`
- `created_at`
- `updated_at`

Suggested indexes:

- unique partial index preventing duplicate pending requests for the same account and group
- index on `[community_group_id, status]`

### `community_group_account_blocks`

Suggested fields:

- `community_group_id`
- `account_id`
- `blocked_by_account_id`
- `reason`
- `created_at`
- `updated_at`

Rules:

- Blocking an account should remove any active membership.
- Blocking an account should revoke or reject pending invitations and join requests.
- Blocked accounts cannot join by link, accept invitations, request membership, view the group timeline, post to the group, or participate in group DMs.

### `statuses` additions

Suggested fields:

- `community_group_id`, nullable bigint
- `community_group_approval_status`, nullable integer, for states such as `approved`, `pending`, `rejected`, and `revoked`
- optional `community_group_dm` boolean if a direct status needs an explicit group-DM context

Suggested indexes:

- partial index on `community_group_id` where it is not null
- partial composite index on `[community_group_id, id]` for non-deleted group statuses
- partial index on `community_group_approval_status` where it is not null

Rules:

- Statuses with `community_group_id` must not appear in home, public, list, search, trends, e-mail subscription, or ActivityPub distribution paths unless explicitly intended.
- A group status author must be a member of the target group.
- Replies to group statuses must stay in the same group.
- Group statuses should not be boostable or quotable in the first implementation unless policy is explicitly designed.

## Backend implementation plan

### Models

Add these models:

- `CommunityGroup`
- `CommunityGroupMembership`
- `CommunityGroupInvitation`
- `CommunityGroupJoinRequest`
- `CommunityGroupAccountBlock`
- optional `CommunityGroupFeed`

Add `belongs_to :community_group, optional: true` to `Status`.

Useful `CommunityGroup` methods:

- `member?(account)`
- `admin?(account)`
- `moderator?(account)`
- `blocked?(account)`
- `can_post?(account)`
- `can_manage_members?(account)`

### Policies

Add policies for:

- `CommunityGroupPolicy`
- `CommunityGroupMembershipPolicy`
- `CommunityGroupInvitationPolicy`
- `CommunityGroupJoinRequestPolicy`
- `CommunityGroupAccountBlockPolicy`

Update `StatusPolicy#show?` so group statuses are only visible to active group members. Pending or rejected group statuses should be visible only to the author and group moderators or administrators.

### Posting service

Update status creation paths to accept a target group. Current likely source checkpoints are:

- `app/controllers/api/v1/statuses_controller.rb`
- `app/services/post_status_service.rb`
- `app/models/concerns/status/visibility.rb`
- `app/policies/status_policy.rb`

Suggested API parameter:

- `community_group_id`

Validation rules:

- If `community_group_id` is present, the posting account must be an active member.
- If `community_group_id` is present, force group-only behavior. Do not allow the post to behave as public, unlisted, followers-only, or normal direct visibility.
- If implementation uses the existing `limited` visibility internally, ensure all downstream distribution paths exclude the status unless they are group-aware.
- If replying, the parent status must have the same `community_group_id`.
- Scheduled group posts should be rejected in the first phase unless scheduled status serialization is updated too.
- Group statuses should not be sent to public distribution, ActivityPub distribution, trends, or search indexing until dedicated behavior is designed.

## API plan

Add OAuth scopes:

- `read:groups`
- `write:groups`
- optional `admin:read:groups`
- optional `admin:write:groups`

Prefer exposing `/api/v1/groups` for API compatibility with the reference PR while keeping internal database and model names prefixed with `community_`.

### Group endpoints

- `GET /api/v1/groups` — list current account's groups
- `POST /api/v1/groups` — create a group
- `GET /api/v1/groups/:id` — show group details
- `PUT /api/v1/groups/:id` — update group, administrator only
- `DELETE /api/v1/groups/:id` — delete group, administrator only
- `GET /api/v1/groups/:id/share` — retrieve share-link metadata
- `POST /api/v1/groups/:id/share_link` — rotate or create share link
- `POST /api/v1/groups/join_by_token` — join or request to join from a share token

### Invitation endpoints

- `GET /api/v1/groups/:group_id/invitations`
- `POST /api/v1/groups/:group_id/invitations`
- `POST /api/v1/groups/:group_id/invitations/:id/accept`
- `POST /api/v1/groups/:group_id/invitations/:id/reject`
- `DELETE /api/v1/groups/:group_id/invitations/:id`

### Membership request endpoints

- `POST /api/v1/groups/:group_id/join`
- `POST /api/v1/groups/:group_id/leave`
- `GET /api/v1/groups/:group_id/membership_requests`
- `POST /api/v1/groups/:group_id/membership_requests/:id/authorize`
- `POST /api/v1/groups/:group_id/membership_requests/:id/reject`

### Membership and block endpoints

- `GET /api/v1/groups/:group_id/memberships`
- `PUT /api/v1/groups/:group_id/memberships/:id`
- `DELETE /api/v1/groups/:group_id/memberships/:id`
- `GET /api/v1/groups/:group_id/blocks`
- `POST /api/v1/groups/:group_id/blocks`
- `DELETE /api/v1/groups/:group_id/blocks/:account_id`

### Group timeline endpoint

- `GET /api/v1/timelines/group/:group_id`

Use Mastodon's standard timeline pagination parameters:

- `max_id`
- `since_id`
- `min_id`
- `limit`

The response should use the existing status REST serializer and relationship presenter where possible.

## Group DM plan

Use the existing direct-status and conversation infrastructure for the first implementation, but add group-specific validation and display paths.

Suggested write behavior:

- Accept `community_group_id` with `visibility=direct` or a separate `group_dm=true` parameter.
- Require the sender and every mentioned recipient to be active members of the group.
- Reject remote accounts.
- Reject banned accounts.
- Reject group DMs with no recipients.

Suggested read endpoint:

- `GET /api/v1/groups/:group_id/conversations`

Prefer a separate group conversations endpoint over changing the default `/api/v1/conversations` behavior, because existing clients may not understand group context.

## Frontend implementation plan

Likely source checkpoints:

- Side navigation: `app/javascript/mastodon/features/navigation_panel/index.tsx`
- Existing list panel reference: `app/javascript/mastodon/features/navigation_panel/components/list_panel.tsx`
- Compose form: `app/javascript/mastodon/features/compose/components/compose_form.jsx`
- Privacy dropdown: `app/javascript/mastodon/features/compose/components/privacy_dropdown.tsx`
- Compose API: `app/javascript/mastodon/api/compose.ts`
- Compose actions and reducers under `app/javascript/mastodon/actions/` and `app/javascript/mastodon/reducers/`

### Navigation

Add “My groups” above lists in the side navigation. Show it only for authenticated users.

Suggested UI elements:

- My groups heading or menu item
- Short list of joined groups
- Link to all groups
- Link or button to create a group

### Group pages

Suggested routes and feature folders:

- `/groups`
- `/groups/new`
- `/groups/:id`
- `/groups/:id/members`
- `/groups/:id/requests`
- `/groups/:id/blocks`

Suggested frontend feature folders:

- `features/groups`
- `features/group_timeline`
- `features/group_members`
- `features/group_membership_requests`
- `features/group_blocks`

### Compose target selection

Add a compose target selector with at least these modes:

- normal timeline post
- specific group post

When a group is selected:

- Send `community_group_id` to the API.
- Disable the normal privacy dropdown or replace it with a single “Group” target indicator.
- Ensure the UI cannot submit public, unlisted, followers-only, or normal direct group timeline posts.
- When compose is opened from a group timeline, preselect that group.

### Group management UI

Group administrators should have UI for:

- Copying or rotating share links
- Inviting local accounts
- Reviewing join requests
- Changing member roles
- Kicking members
- Banning and unbanning accounts

Account search for invitations should return or allow only local accounts.

## Server administration

Server-admin UI can be implemented after core group functionality, but safe operation may require at least:

- Listing groups
- Searching groups
- Suspending or deleting problematic groups
- Viewing group reports or group statuses

## Upstream migration strategy

Because the local implementation uses `community_` names, a future upstream schema can be introduced without immediate table-name or column-name collisions.

Possible future mapping:

- `community_groups` to `groups`
- `community_group_memberships` to `group_memberships`
- `community_group_join_requests` to `group_membership_requests`
- `community_group_account_blocks` to `group_account_blocks`
- `statuses.community_group_id` to `statuses.group_id`
- `statuses.community_group_approval_status` to `statuses.approval_status`

Do not write this migration until upstream's final schema is known. If migration is impractical, keep the implementation removable by feature flagging group routes and UI and by isolating all tables and status columns.

## Suggested implementation phases

### Phase 1: Backend core

1. Add database migrations.
2. Add models and policies.
3. Add group CRUD API.
4. Add invitation, join request, membership, and block APIs.
5. Add serializers.
6. Add model, policy, request, and service tests.

### Phase 2: Group posts and timeline

1. Add status group columns.
2. Update status creation validation.
3. Update status visibility policy.
4. Exclude group posts from non-group feeds and distribution paths.
5. Add group timeline endpoint.
6. Add tests for visibility, replies, distribution exclusion, and pagination.

### Phase 3: Frontend

1. Add “My groups” navigation.
2. Add group list, creation, detail, and timeline pages.
3. Add compose target selection.
4. Add invitation and membership management screens.
5. Add block management screens.

### Phase 4: Group DMs

1. Add group-DM validation to direct post creation.
2. Add group conversations endpoint.
3. Add group conversations UI.
4. Add tests for member-only recipients and blocked-account rejection.

### Phase 5: Operations and migration readiness

1. Add feature flags if needed.
2. Add server-admin moderation tools if needed.
3. Add migration/export notes once upstream stabilizes.
4. Evaluate SQL timeline performance and add Redis fan-out only if necessary.

## Critical risks

- Adding `group` directly to the existing status `visibility` enum may break API and distribution assumptions. Prefer a dedicated `community_group_id` plus strict distribution exclusion in the first implementation.
- Group posts leaking into public, home, list, search, trend, e-mail, or ActivityPub distribution would be a privacy bug.
- Group DMs leaking into normal conversations without group context may confuse clients.
- Every account path must explicitly reject remote accounts for the first implementation.
- Upstream PR #19059 may change before merge, so keep implementation isolated and migration decisions deferred.
