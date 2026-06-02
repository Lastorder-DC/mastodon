# Community Groups migration and rollback plan

This document records how this fork's local-only `community_` group implementation should be migrated or rolled back if Mastodon later ships an upstream groups feature.

## Scope

The current implementation intentionally uses `community_`-prefixed tables and status columns so upstream tables such as `groups`, `group_memberships`, or `statuses.group_id` can coexist during evaluation.

Local objects covered by this plan:

- `community_groups`
- `community_group_memberships`
- `community_group_invitations`
- `community_group_join_requests`
- `community_group_account_blocks`
- `community_group_reports`
- `statuses.community_group_id`
- `statuses.community_group_approval_status`
- `statuses.community_group_dm`
- API routes under `/api/v1/groups` and `/api/v1/timelines/group/:id`
- group notification types prefixed with `community_group_`

## Migration plan if upstream Mastodon adds groups

### 1. Freeze local schema expansion

Do not add new local `community_` columns or tables once an upstream groups schema is available for review. New work should be limited to data export, compatibility adapters, or bug fixes.

### 2. Compare models and semantics

Before writing a migration, compare these behaviors against upstream source and documentation:

- Whether upstream groups are local-only or federated.
- How upstream represents group ownership, moderators, memberships, bans, invitations, and join requests.
- How upstream stores group-targeted statuses and approval state.
- Whether upstream supports group-specific reports or uses server reports.
- Whether upstream exposes API compatibility with `/api/v1/groups`.
- Whether upstream timelines are SQL-backed, feed-backed, or federated ActivityPub collections.

### 3. Build a field mapping table

Prepare an explicit mapping document before moving data. Likely starting points:

| Local field/table                          | Potential upstream target                    | Notes                                                                                              |
| ------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `community_groups`                         | `groups`                                     | Map display name, note, owner, counters, locked/discoverable flags if compatible.                  |
| `community_group_memberships`              | `group_memberships`                          | Preserve `admin`, `moderator`, and `member` semantics only if upstream roles match.                |
| `community_group_invitations`              | upstream invitation table                    | Migrate only active invitations if token/expires semantics match.                                  |
| `community_group_join_requests`            | upstream join/membership request table       | Preserve status/reviewer fields if upstream supports them.                                         |
| `community_group_account_blocks`           | upstream group blocks/bans table             | Ensure blocked accounts remain unable to rejoin.                                                   |
| `community_group_reports`                  | upstream group reports or moderation reports | Migrate only if upstream has a group-local report concept; otherwise archive or convert carefully. |
| `statuses.community_group_id`              | `statuses.group_id` or join table            | Must preserve privacy: group posts must not become public statuses.                                |
| `statuses.community_group_approval_status` | upstream approval field                      | Map only approved/pending/rejected/revoked states that upstream supports.                          |

### 4. Create an idempotent migration path

Use a staged migration instead of a destructive rename:

1. Add upstream-compatible columns/tables without dropping local data.
2. Backfill upstream tables from `community_` tables in batches.
3. Store old-to-new ID mappings in a temporary migration table if IDs change.
4. Backfill status group references only after group rows are verified.
5. Backfill memberships before exposing timelines.
6. Backfill blocks before enabling joins or invitations.
7. Backfill reports last, because they are operational records rather than timeline privacy primitives.

### 5. Run privacy verification before cutover

Before routing reads/writes to upstream groups, verify:

- Group statuses do not appear in public, home, list, trends, search, email subscriptions, or ActivityPub distribution unless upstream explicitly supports that behavior safely.
- Non-members cannot fetch group statuses through status show, context, or timeline endpoints.
- Banned accounts cannot view, join, be invited, or post.
- Admin/moderator deletion and report notifications still go only to intended local accounts.

### 6. Cut over behind a feature flag

Add a temporary flag such as `COMMUNITY_GROUPS_USE_UPSTREAM_SCHEMA` if the upstream schema can coexist. During the cutover:

- Keep local writes disabled or mirrored, not divergent.
- Prefer read-through adapters that can read old local rows until migration completes.
- Keep `/api/v1/groups` behavior stable for clients where possible.

### 7. Remove local implementation only after validation

Only remove `community_` tables and columns after:

- A full backup exists.
- Counts match for groups, memberships, statuses, blocks, and open requests.
- Spot checks confirm representative group timelines and permissions.
- The codebase no longer references `community_group_id` or local group notification types.

## Rollback plan for this local implementation

Rollback means disabling/removing this fork's local `community_` implementation without migrating into upstream groups.

### 1. Operational freeze

Before rollback:

1. Disable group routes/UI with a feature flag or deployment branch.
2. Stop accepting new group posts, invitations, join requests, blocks, and group reports.
3. Keep read-only access temporarily if users need export time.

### 2. Export user-visible data

Export or archive:

- Group metadata and membership lists.
- Pending invitations and join requests.
- Group reports and resolution state.
- Group status IDs, authors, timestamps, and text/media references.

Do not make group statuses public as a rollback shortcut.

### 3. Remove code paths

Remove or disable:

- `Api::V1::Groups*` controllers and routes.
- `Api::V1::Timelines::GroupController`.
- `CommunityGroup*` models, policies, serializers, and services.
- Notification types prefixed with `community_group_`.
- Frontend `group` visibility handling if no longer emitted by the API.
- OAuth scopes `read:groups` and `write:groups` if they are no longer used.

### 4. Handle existing group statuses safely

Before dropping columns, decide how to handle existing `statuses.community_group_id` rows:

- Preferred: keep rows hidden/archived and exportable to authors and group members.
- Alternative: delete group statuses through the normal status removal pipeline.
- Do **not** null out `community_group_id` while leaving statuses visible in normal timelines.

### 5. Database rollback order

Drop local structures only after code no longer references them:

1. Drop or archive `community_group_reports`.
2. Drop `community_group_account_blocks`.
3. Drop `community_group_invitations`.
4. Drop `community_group_join_requests`.
5. Drop `community_group_memberships`.
6. Drop `community_groups`.
7. Drop `statuses.community_group_id`, `statuses.community_group_approval_status`, and `statuses.community_group_dm` only after group statuses are removed or archived safely.

### 6. Post-rollback verification

Verify:

- `/api/v1/groups` and `/api/v1/timelines/group/:id` are gone or return an intentional disabled response.
- No group notifications are generated.
- Normal posting, reporting, notifications, and status deletion still work.
- No group status appears in public/home/list/search/trends/ActivityPub distribution.

## Emergency privacy rollback

If group posts leak outside groups, prioritize privacy over data retention:

1. Disable status creation with `community_group_id` immediately.
2. Disable group timeline and group status show endpoints if necessary.
3. Stop distribution workers from processing affected status IDs.
4. Identify affected `statuses.community_group_id IS NOT NULL` rows.
5. Remove leaked statuses from public/search/trend indexes and caches.
6. Notify administrators and affected users according to incident policy.
