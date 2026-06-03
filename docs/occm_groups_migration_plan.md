# OCCM Groups: Migration and Rollback Plan

## 1. Overview

This document defines the procedures for:

1. **Migration**: Transitioning data and functionality from the OCCM Groups implementation (`occm_` prefixed tables, endpoints, and scopes) to the official Mastodon groups system defined in PR #19059 if/when it merges upstream.
2. **Rollback**: Cleanly removing the OCCM Groups feature entirely, leaving the database and application in a consistent state.

Both procedures are designed to be safe, reversible at each step, and to minimize disruption to end users.

### References

- OCCM Groups specification: `docs/occm_groups_spec.md`
- Official groups implementation: [PR #19059](https://github.com/mastodon/mastodon/pull/19059)
- Mastodon migration conventions: `db/migrate/` with `ActiveRecord::Migration[8.0]`

---

## 2. Data Mapping

### 2.1 Table-Level Mapping

| OCCM Table | PR #19059 Table | Notes |
|---|---|---|
| `occm_groups` | `groups` | Direct mapping with additional columns in official |
| `occm_group_memberships` | `group_memberships` | Role values align; state model differs slightly |
| `occm_group_statuses` | *(no direct equivalent)* | Official uses `group` visibility on statuses directly |
| `occm_group_reports` | *(no direct equivalent)* | Official may use standard `reports` table with group context |
| `occm_group_dm_rooms` | *(no equivalent)* | Placeholder table, no official counterpart |

### 2.2 Column-Level Mapping: `occm_groups` -> `groups`

| OCCM Column | Official Column | Transformation |
|---|---|---|
| `id` | `id` | Preserve if possible, or generate new IDs with mapping table |
| `title` | `display_name` | Direct copy (rename column) |
| `description` | `note` | Direct copy (rename column) |
| `account_id` | `owner_account_id` | Direct copy (rename column) |
| `approval_required` | `membership_request_required` | Direct copy (boolean) |
| `member_count` | `members_count` | Direct copy (rename column) |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |
| *(none)* | `domain` | Set to `NULL` (local group) |
| *(none)* | `uri` | Generate: `https://{domain}/groups/{id}` |
| *(none)* | `url` | Same as `uri` for local groups |
| *(none)* | `inbox_url` | Generate: `https://{domain}/groups/{id}/inbox` |
| *(none)* | `visibility` | Default to `"everyone"` |
| *(none)* | `discoverable` | Default to `false` |
| *(none)* | `suspended_at` | Default to `NULL` |
| *(none)* | `avatar_file_name` | Default to `NULL` |
| *(none)* | `header_file_name` | Default to `NULL` |

### 2.3 Column-Level Mapping: `occm_group_memberships` -> `group_memberships`

| OCCM Column | Official Column | Transformation |
|---|---|---|
| `id` | `id` | Preserve or remap |
| `occm_group_id` | `group_id` | Map to new group ID |
| `account_id` | `account_id` | Direct copy |
| `role` | `role` | Direct copy (both use admin:0, moderator:1, user:2) |
| `state` | *(handled differently)* | See note below |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |

**State handling**: The official implementation separates pending membership requests into a `group_membership_requests` table rather than using a `state` column on memberships. Only `active` memberships should be migrated to `group_memberships`. Pending requests should be migrated to `group_membership_requests`.

### 2.4 Column-Level Mapping: `occm_group_statuses`

The official PR #19059 does not use a junction table for group statuses. Instead, it adds a `group_id` column directly to the `statuses` table and uses a new `"group"` visibility level. Migration requires:

1. Adding `group_id` column to `statuses` (done by PR #19059 migration)
2. Updating each status referenced in `occm_group_statuses`:
   - Set `statuses.group_id = mapped_group_id`
   - Change `statuses.visibility` from `4` (limited) to the new `"group"` visibility value

### 2.5 Tables Without Direct Mapping

| OCCM Table | Recommended Action |
|---|---|
| `occm_group_reports` | Migrate to standard `reports` table with `group_id` context if supported, otherwise export as CSV backup and discard |
| `occm_group_dm_rooms` | Drop (placeholder only, no data expected) |

---

## 3. Migration Strategy

### 3.1 Prerequisites

Before beginning migration, ensure:

- [ ] PR #19059 has been merged into upstream Mastodon
- [ ] The official groups migrations have been run successfully
- [ ] A full database backup has been created
- [ ] The application is in maintenance mode (or read-only mode)
- [ ] The OCCM groups feature flag is disabled for new writes

### 3.2 Pre-Migration Checks

Run these verification queries to assess data integrity before migration:

```sql
-- Count groups to migrate
SELECT COUNT(*) AS total_groups FROM occm_groups;

-- Count active memberships
SELECT COUNT(*) AS total_memberships
FROM occm_group_memberships
WHERE state = 1; -- active

-- Count pending membership requests
SELECT COUNT(*) AS pending_requests
FROM occm_group_memberships
WHERE state = 0; -- pending

-- Count group statuses to migrate
SELECT COUNT(*) AS total_group_statuses FROM occm_group_statuses;

-- Verify referential integrity - no orphaned memberships
SELECT COUNT(*) AS orphaned_memberships
FROM occm_group_memberships ogm
LEFT JOIN occm_groups og ON ogm.occm_group_id = og.id
WHERE og.id IS NULL;

-- Verify referential integrity - no orphaned statuses
SELECT COUNT(*) AS orphaned_statuses
FROM occm_group_statuses ogs
LEFT JOIN statuses s ON ogs.status_id = s.id
WHERE s.id IS NULL;

-- Check for accounts that no longer exist
SELECT COUNT(*) AS orphaned_accounts
FROM occm_groups og
LEFT JOIN accounts a ON og.account_id = a.id
WHERE a.id IS NULL;
```

If any orphaned records are found, clean them up before proceeding:

```sql
-- Remove orphaned memberships
DELETE FROM occm_group_memberships
WHERE occm_group_id NOT IN (SELECT id FROM occm_groups);

-- Remove orphaned statuses references
DELETE FROM occm_group_statuses
WHERE status_id NOT IN (SELECT id FROM statuses);
```

### 3.3 Migration Procedure

#### Step 1: Create ID Mapping Table

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_migration_mapping.rb
class CreateOccmMigrationMapping < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_migration_mappings do |t|
      t.string :source_table, null: false
      t.bigint :source_id, null: false
      t.string :target_table, null: false
      t.bigint :target_id, null: false
      t.datetime :migrated_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }
    end

    add_index :occm_migration_mappings, [:source_table, :source_id], unique: true
  end
end
```

#### Step 2: Migrate Groups

```ruby
# db/migrate/YYYYMMDDHHMMSS_migrate_occm_groups_to_official.rb
class MigrateOccmGroupsToOfficial < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    local_domain = Rails.configuration.x.local_domain

    OccmGroup.find_each(batch_size: 100) do |occm_group|
      group = Group.create!(
        display_name: occm_group.title,
        note: occm_group.description,
        owner_account_id: occm_group.account_id,
        membership_request_required: occm_group.approval_required,
        members_count: occm_group.member_count,
        domain: nil,
        uri: "https://#{local_domain}/groups/#{occm_group.id}",
        url: "https://#{local_domain}/groups/#{occm_group.id}",
        discoverable: false,
        created_at: occm_group.created_at,
        updated_at: occm_group.updated_at
      )

      OccmMigrationMapping.create!(
        source_table: 'occm_groups',
        source_id: occm_group.id,
        target_table: 'groups',
        target_id: group.id
      )
    end
  end

  def down
    OccmMigrationMapping.where(source_table: 'occm_groups').find_each do |mapping|
      Group.where(id: mapping.target_id).destroy_all
    end
    OccmMigrationMapping.where(source_table: 'occm_groups').delete_all
  end
end
```

#### Step 3: Migrate Memberships

```ruby
# db/migrate/YYYYMMDDHHMMSS_migrate_occm_group_memberships_to_official.rb
class MigrateOccmGroupMembershipsToOfficial < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    # Migrate active memberships
    OccmGroupMembership.where(state: :active).find_each(batch_size: 500) do |membership|
      mapping = OccmMigrationMapping.find_by(
        source_table: 'occm_groups',
        source_id: membership.occm_group_id
      )
      next unless mapping

      GroupMembership.create!(
        group_id: mapping.target_id,
        account_id: membership.account_id,
        role: membership.role, # Same enum values: admin(0), moderator(1), user(2)
        created_at: membership.created_at,
        updated_at: membership.updated_at
      )
    end

    # Migrate pending requests to group_membership_requests
    OccmGroupMembership.where(state: :pending).find_each(batch_size: 500) do |membership|
      mapping = OccmMigrationMapping.find_by(
        source_table: 'occm_groups',
        source_id: membership.occm_group_id
      )
      next unless mapping

      GroupMembershipRequest.create!(
        group_id: mapping.target_id,
        account_id: membership.account_id,
        created_at: membership.created_at,
        updated_at: membership.updated_at
      )
    end
  end

  def down
    OccmMigrationMapping.where(source_table: 'occm_groups').find_each do |mapping|
      GroupMembership.where(group_id: mapping.target_id).delete_all
      GroupMembershipRequest.where(group_id: mapping.target_id).delete_all
    end
  end
end
```

#### Step 4: Migrate Group Statuses

```ruby
# db/migrate/YYYYMMDDHHMMSS_migrate_occm_group_statuses_to_official.rb
class MigrateOccmGroupStatusesToOfficial < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  GROUP_VISIBILITY = 5 # PR #19059 "group" visibility value (verify actual value)

  def up
    OccmGroupStatus.find_each(batch_size: 1000) do |group_status|
      mapping = OccmMigrationMapping.find_by(
        source_table: 'occm_groups',
        source_id: group_status.occm_group_id
      )
      next unless mapping

      Status.where(id: group_status.status_id).update_all(
        group_id: mapping.target_id,
        visibility: GROUP_VISIBILITY
      )
    end
  end

  def down
    # Revert statuses back to limited visibility and remove group_id
    OccmGroupStatus.find_each(batch_size: 1000) do |group_status|
      Status.where(id: group_status.status_id).update_all(
        group_id: nil,
        visibility: 4 # limited
      )
    end
  end
end
```

### 3.4 Post-Migration Verification

Run these queries after migration to confirm data integrity:

```sql
-- Verify group count matches
SELECT
  (SELECT COUNT(*) FROM occm_groups) AS occm_count,
  (SELECT COUNT(*) FROM groups WHERE domain IS NULL) AS official_count;

-- Verify membership counts match
SELECT
  (SELECT COUNT(*) FROM occm_group_memberships WHERE state = 1) AS occm_active,
  (SELECT COUNT(*) FROM group_memberships gm
   INNER JOIN groups g ON gm.group_id = g.id
   WHERE g.domain IS NULL) AS official_active;

-- Verify pending request counts match
SELECT
  (SELECT COUNT(*) FROM occm_group_memberships WHERE state = 0) AS occm_pending,
  (SELECT COUNT(*) FROM group_membership_requests gmr
   INNER JOIN groups g ON gmr.group_id = g.id
   WHERE g.domain IS NULL) AS official_pending;

-- Verify status migration
SELECT
  (SELECT COUNT(*) FROM occm_group_statuses) AS occm_statuses,
  (SELECT COUNT(*) FROM statuses WHERE group_id IS NOT NULL) AS official_statuses;

-- Spot-check: verify a sample group's data
SELECT g.id, g.display_name, g.members_count, g.owner_account_id
FROM groups g
INNER JOIN occm_migration_mappings omm
  ON omm.target_table = 'groups' AND omm.target_id = g.id
LIMIT 10;
```

### 3.5 Cleanup After Successful Migration

Once migration is verified and the system is stable (recommended: wait 1-2 weeks):

```ruby
# db/migrate/YYYYMMDDHHMMSS_drop_occm_groups_tables.rb
class DropOccmGroupsTables < ActiveRecord::Migration[8.0]
  def up
    drop_table :occm_group_dm_rooms, if_exists: true
    drop_table :occm_group_reports, if_exists: true
    drop_table :occm_group_statuses, if_exists: true
    drop_table :occm_group_memberships, if_exists: true
    drop_table :occm_groups, if_exists: true
    drop_table :occm_migration_mappings, if_exists: true
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
      'Cannot reverse OCCM table drop. Restore from backup if needed.'
  end
end
```

---

## 4. API Migration

### 4.1 Endpoint Mapping

| OCCM Endpoint | Official Endpoint |
|---|---|
| `GET /api/v1/occm_groups` | `GET /api/v1/groups` |
| `POST /api/v1/occm_groups` | `POST /api/v1/groups` |
| `GET /api/v1/occm_groups/:id` | `GET /api/v1/groups/:id` |
| `PUT /api/v1/occm_groups/:id` | `PUT /api/v1/groups/:id` |
| `DELETE /api/v1/occm_groups/:id` | `DELETE /api/v1/groups/:id` |
| `GET /api/v1/occm_groups/:id/members` | `GET /api/v1/groups/:id/memberships` |
| `POST /api/v1/occm_groups/:id/join` | `POST /api/v1/groups/:id/join` |
| `POST /api/v1/occm_groups/:id/leave` | `POST /api/v1/groups/:id/leave` |
| `GET /api/v1/occm_groups/:id/timeline` | `GET /api/v1/timelines/group/:id` |
| `POST /api/v1/occm_groups/:id/statuses` | *(post with group_id param)* |
| `POST /api/v1/occm_groups/:id/reports` | `POST /api/v1/reports` (with group context) |

### 4.2 Deprecation Strategy

The migration follows a three-phase approach:

#### Phase 1: Dual Endpoints (Weeks 1-4)

Both OCCM and official endpoints are active simultaneously. OCCM endpoints respond normally but include deprecation headers.

```ruby
# app/controllers/concerns/occm_deprecation_header.rb
module OccmDeprecationHeader
  extend ActiveSupport::Concern

  included do
    after_action :set_deprecation_headers
  end

  private

  def set_deprecation_headers
    response.headers['Deprecation'] = 'true'
    response.headers['Sunset'] = 4.weeks.from_now.httpdate
    response.headers['Link'] = %(<https://#{Rails.configuration.x.local_domain}/api/v1/groups>; rel="successor-version")
  end
end
```

Add to all OCCM controllers:

```ruby
class Api::V1::OccmGroupsController < Api::BaseController
  include OccmDeprecationHeader
  # ... existing controller code
end
```

#### Phase 2: Redirect (Weeks 5-8)

OCCM endpoints return `301 Moved Permanently` pointing to the official endpoints.

```ruby
# config/routes/api.rb - replace OCCM routes with redirects
namespace :v1 do
  # Deprecated OCCM routes - redirect to official
  get 'occm_groups', to: redirect('/api/v1/groups', status: 301)
  get 'occm_groups/:id', to: redirect('/api/v1/groups/%{id}', status: 301)
  # ... additional redirects for all endpoints
end
```

#### Phase 3: Removal (Week 9+)

OCCM routes, controllers, serializers, and related code are deleted.

### 4.3 Client Notification

During Phase 1, API responses include a JSON warning field:

```json
{
  "data": [...],
  "_deprecation": {
    "message": "The /api/v1/occm_groups/ endpoints are deprecated. Migrate to /api/v1/groups/ before the sunset date.",
    "sunset_date": "2025-04-01T00:00:00Z",
    "documentation_url": "https://docs.example.com/migration"
  }
}
```

---

## 5. OAuth Scope Migration

### 5.1 Scope Mapping

| OCCM Scope | Official Scope |
|---|---|
| `read:occm_groups` | `read:groups` |
| `write:occm_groups` | `write:groups` |
| *(none)* | `admin:read:groups` |
| *(none)* | `admin:write:groups` |

### 5.2 Token Migration Strategy

Existing OAuth tokens with OCCM scopes need to be updated to grant the equivalent official scopes.

```ruby
# db/migrate/YYYYMMDDHHMMSS_migrate_occm_oauth_scopes.rb
class MigrateOccmOauthScopes < ActiveRecord::Migration[8.0]
  def up
    # Update access tokens
    execute <<~SQL
      UPDATE oauth_access_tokens
      SET scopes = REPLACE(
        REPLACE(scopes, 'read:occm_groups', 'read:groups'),
        'write:occm_groups', 'write:groups'
      )
      WHERE scopes LIKE '%occm_groups%';
    SQL

    # Update application registrations
    execute <<~SQL
      UPDATE oauth_applications
      SET scopes = REPLACE(
        REPLACE(scopes, 'read:occm_groups', 'read:groups'),
        'write:occm_groups', 'write:groups'
      )
      WHERE scopes LIKE '%occm_groups%';
    SQL
  end

  def down
    execute <<~SQL
      UPDATE oauth_access_tokens
      SET scopes = REPLACE(
        REPLACE(scopes, 'read:groups', 'read:occm_groups'),
        'write:groups', 'write:occm_groups'
      )
      WHERE scopes LIKE '%groups%'
        AND scopes NOT LIKE '%occm_groups%';
    SQL

    execute <<~SQL
      UPDATE oauth_applications
      SET scopes = REPLACE(
        REPLACE(scopes, 'read:groups', 'read:occm_groups'),
        'write:groups', 'write:occm_groups'
      )
      WHERE scopes LIKE '%groups%'
        AND scopes NOT LIKE '%occm_groups%';
    SQL
  end
end
```

### 5.3 Doorkeeper Configuration Update

After migration, remove OCCM scopes from `config/initializers/doorkeeper.rb`:

```ruby
# Remove these lines:
# optional_scopes += %w(
#   read:occm_groups
#   write:occm_groups
# )
```

### 5.4 Transition Period

During the dual-endpoint phase (Section 4.2, Phase 1), both scope sets are accepted:

```ruby
# Temporary: accept both scope names
doorkeeper_authorize! :read, :'read:groups', :'read:occm_groups'
doorkeeper_authorize! :write, :'write:groups', :'write:occm_groups'
```

---

## 6. Feature Rollback Plan

This section describes how to completely remove the OCCM Groups feature if it needs to be disabled without migrating to the official implementation.

### 6.1 Rollback Checklist

- [ ] Disable feature flag / block new group creation
- [ ] Notify users of upcoming removal (provide export if possible)
- [ ] Remove streaming channels
- [ ] Remove API routes
- [ ] Remove OAuth scopes
- [ ] Drop database tables
- [ ] Remove model/controller/serializer/service code
- [ ] Remove frontend components
- [ ] Clean up Redis keys
- [ ] Clean up notification types
- [ ] Remove i18n keys
- [ ] Deploy and verify

### 6.2 Database Rollback Migration

```ruby
# db/migrate/YYYYMMDDHHMMSS_drop_occm_groups_feature.rb
class DropOccmGroupsFeature < ActiveRecord::Migration[8.0]
  def up
    # Drop tables in dependency order (children first)
    drop_table :occm_group_dm_rooms, if_exists: true
    drop_table :occm_group_reports, if_exists: true
    drop_table :occm_group_statuses, if_exists: true
    drop_table :occm_group_memberships, if_exists: true
    drop_table :occm_groups, if_exists: true
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
      'OCCM Groups tables cannot be automatically recreated. Use the original creation migrations.'
  end
end
```

### 6.3 Route Removal

Remove from `config/routes/api.rb`:

```ruby
# DELETE this entire block:
namespace :v1 do
  resources :occm_groups, only: [:index, :create, :show, :update, :destroy] do
    member do
      post :join
      post :leave
      get :timeline
      post :statuses
    end
    resources :members, only: [:index, :destroy], controller: 'occm_groups/members' do
      collection do
        post :approve
        post :reject
      end
    end
    resources :moderators, only: [:create, :destroy], controller: 'occm_groups/moderators'
    resources :reports, only: [:index, :create], controller: 'occm_groups/reports' do
      member do
        post :resolve
      end
    end
    post :transfer, to: 'occm_groups/transfer#create'
  end
end
```

### 6.4 OAuth Scope Removal

Update `config/initializers/doorkeeper.rb`:

```ruby
# Remove from optional_scopes:
# read:occm_groups
# write:occm_groups

# Also clean up any tokens that still reference these scopes:
```

```ruby
# Run in Rails console or via migration:
Doorkeeper::AccessToken.where("scopes LIKE '%occm_groups%'").find_each do |token|
  new_scopes = token.scopes.to_a.reject { |s| s.include?('occm_groups') }
  token.update_column(:scopes, new_scopes.join(' '))
end

Doorkeeper::Application.where("scopes LIKE '%occm_groups%'").find_each do |app|
  new_scopes = app.scopes.to_a.reject { |s| s.include?('occm_groups') }
  app.update_column(:scopes, new_scopes.join(' '))
end
```

### 6.5 Frontend Removal

Remove the following directories and files:

```bash
# Feature components
rm -rf app/javascript/mastodon/features/occm_groups/
rm -rf app/javascript/mastodon/features/occm_group_timeline/

# API layer
rm -f app/javascript/mastodon/api/occm_groups.ts
rm -f app/javascript/mastodon/api_types/occm_groups.ts

# State management
rm -f app/javascript/mastodon/reducers/occm_groups.ts
rm -f app/javascript/mastodon/actions/occm_groups.js

# Remove from root reducer
# Edit app/javascript/mastodon/reducers/index.ts - remove occm_groups import and entry
```

Remove navigation entries and route registrations that reference OCCM groups in the frontend router.

### 6.6 Backend Code Removal

```bash
# Models
rm -f app/models/occm_group.rb
rm -f app/models/occm_group_membership.rb
rm -f app/models/occm_group_status.rb
rm -f app/models/occm_group_report.rb
rm -f app/models/occm_group_dm_room.rb

# Controllers
rm -rf app/controllers/api/v1/occm_groups_controller.rb
rm -rf app/controllers/api/v1/occm_groups/

# Serializers
rm -f app/serializers/rest/occm_group_serializer.rb
rm -f app/serializers/rest/occm_group_membership_serializer.rb
rm -f app/serializers/rest/occm_group_report_serializer.rb

# Services
rm -f app/services/occm_group_service.rb
rm -f app/services/add_accounts_to_occm_group_service.rb
rm -f app/services/remove_accounts_from_occm_group_service.rb

# Workers
rm -f app/workers/occm_group_cleanup_worker.rb

# Policies
rm -f app/policies/occm_group_policy.rb
```

### 6.7 Redis Key Cleanup

Clean up streaming channel subscriptions and cached data:

```ruby
# Run in Rails console
redis = Redis.current

# Remove streaming channel keys
redis.keys('timeline:occm_group:*').each { |key| redis.del(key) }

# Remove any cached group data
redis.keys('occm_group:*').each { |key| redis.del(key) }
```

### 6.8 Notification Type Cleanup

Remove OCCM notification types from the database and configuration:

```ruby
# Remove existing OCCM group notifications
Notification.where(type: [
  'occm_group_join_request',
  'occm_group_join_approved',
  'occm_group_join_rejected',
  'occm_group_post_deleted'
]).delete_all
```

Update `app/models/notification.rb` to remove OCCM entries from the `PROPERTIES` hash:

```ruby
# Remove these entries from PROPERTIES:
# occm_group_join_request: { ... }
# occm_group_join_approved: { ... }
# occm_group_join_rejected: { ... }
# occm_group_post_deleted: { ... }
```

### 6.9 Locale File Cleanup

Remove all `occm_groups` keys from locale files:

```bash
# Remove OCCM groups sections from backend locales
# Edit config/locales/en.yml - remove occm_groups key tree
# Edit config/locales/ko.yml - remove occm_groups key tree

# Remove frontend locale files
rm -f app/javascript/mastodon/locales/occm_groups.en.json
rm -f app/javascript/mastodon/locales/occm_groups.ko.json
```

### 6.10 Status Visibility Cleanup

If any statuses were created with `limited` visibility for group posts, decide on handling:

```ruby
# Option A: Convert group-only statuses to direct messages
Status.joins('INNER JOIN occm_group_statuses ON statuses.id = occm_group_statuses.status_id')
      .update_all(visibility: :direct)

# Option B: Delete group-only statuses entirely
status_ids = OccmGroupStatus.pluck(:status_id)
Status.where(id: status_ids).destroy_all
```

**Recommendation**: Option A is safer as it preserves user content. Inform users that their group posts have been converted to direct messages visible only to mentioned participants.

---

## 7. Compatibility Notes

### 7.1 Federation Differences

| Aspect | OCCM Groups | PR #19059 Official |
|---|---|---|
| Federation | Local-only, never federated | Fully federated via ActivityPub |
| Actor type | None (internal feature) | `PublicGroup` (ActivityPub actor) |
| Remote groups | Not supported | Supported (remote group discovery) |
| Group inbox | None | ActivityPub inbox for group actor |

**Migration impact**: When migrating to official groups, previously local-only content will potentially become federable. Administrators must decide whether to:
- Keep migrated groups as local-only (if official supports this flag)
- Allow federation of existing group content
- Mark all migrated groups as non-discoverable initially

### 7.2 Visibility Model Differences

| Aspect | OCCM Groups | PR #19059 Official |
|---|---|---|
| Post visibility | `limited` (value: 4) | `group` (new visibility level) |
| Visibility enforcement | Application-level (junction table) | Database-level (status.group_id) |
| Timeline query | JOIN on occm_group_statuses | Direct WHERE on group_id |
| Status ownership | Tracked via junction table | Implicit via group_id on status |

**Migration impact**: The status visibility integer value must be updated during migration. The `limited` visibility is used for other purposes in Mastodon (e.g., circle posts), so only statuses that exist in `occm_group_statuses` should be changed to `group` visibility.

### 7.3 Report System Differences

| Aspect | OCCM Groups | PR #19059 Official |
|---|---|---|
| Report target | Group admins/moderators | May integrate with server-level moderation |
| Report table | Separate `occm_group_reports` | Likely extends standard `reports` |
| Categories | other, spam, harassment, off_topic, rule_violation | Standard report categories |
| Resolution | Group-level action | Potentially server-level action |

**Migration impact**: OCCM group reports have no guaranteed equivalent in the official implementation. Options:
1. Archive reports as CSV before dropping the table
2. Migrate to standard `reports` table if schema is compatible
3. Discard resolved reports, migrate only unresolved ones

### 7.4 DM Room Differences

The OCCM `occm_group_dm_rooms` table is a schema placeholder with no data. PR #19059 does not include group DM functionality. This table can be safely dropped during both migration and rollback with no data loss.

### 7.5 Membership State Model

| Aspect | OCCM Groups | PR #19059 Official |
|---|---|---|
| State tracking | `state` column (pending/active/rejected) | Separate tables for members vs. requests |
| Rejected state | Stored in memberships table | No explicit rejected state tracked |
| Role values | admin(0), moderator(1), user(2) | admin, moderator, user (compatible) |

**Migration impact**: The `rejected` state has no equivalent in the official system. Rejected membership records should be discarded during migration (users can re-request).

---

## 8. Timeline Considerations

### 8.1 Decision Matrix

| Scenario | Recommended Action |
|---|---|
| PR #19059 merges within 3 months | Begin migration planning immediately, deprecate OCCM in 2 weeks |
| PR #19059 merges within 6 months | Maintain OCCM, begin migration when official is stable |
| PR #19059 merges after 6+ months | Continue OCCM development, plan migration for next major version |
| PR #19059 is closed/abandoned | Continue OCCM as the permanent implementation, remove migration tooling |

### 8.2 Recommended Timeline

```
Week 0:   PR #19059 merges upstream
Week 1:   Merge upstream changes, run official migrations
Week 2:   Deploy data migration (Section 3) to staging
Week 3:   QA verification on staging, fix issues
Week 4:   Deploy data migration to production
          Begin API deprecation Phase 1 (dual endpoints)
Week 5-8: Monitor deprecation headers, notify app developers
Week 9:   Switch to Phase 2 (redirects)
Week 12:  Remove OCCM code and tables (Phase 3)
Week 14:  Drop migration mapping table
```

### 8.3 Parallel Operation Guidelines

During the transition period (Weeks 4-12), both systems may operate simultaneously:

1. **New groups**: Created only via official `/api/v1/groups/` endpoints
2. **Existing OCCM groups**: Readable via both endpoint sets (data served from official tables)
3. **Writes to OCCM endpoints**: Proxied to official controllers internally
4. **Streaming**: Both `occm_group:{id}` and `group:{id}` channels active, publishing identical events

### 8.4 Rollback Triggers

Execute the rollback plan (Section 6) if any of these occur:

- Data corruption detected during migration verification
- More than 5% data loss identified in post-migration checks
- Critical user-facing bugs that cannot be fixed within 48 hours
- Official groups implementation introduces breaking changes incompatible with migrated data

### 8.5 Communication Plan

| Timing | Audience | Message |
|---|---|---|
| Migration start | Instance admins | Maintenance window notification, backup confirmation |
| Phase 1 start | App developers | Deprecation notice with timeline and new endpoint docs |
| Phase 2 start | All API consumers | Final warning, redirect behavior explanation |
| Phase 3 complete | All users | Feature update announcement, new groups UI guide |

---

## Appendix A: Quick Reference Commands

### Verify OCCM tables exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'occm_%';
```

### Count all OCCM data

```sql
SELECT 'occm_groups' AS tbl, COUNT(*) AS cnt FROM occm_groups
UNION ALL
SELECT 'occm_group_memberships', COUNT(*) FROM occm_group_memberships
UNION ALL
SELECT 'occm_group_statuses', COUNT(*) FROM occm_group_statuses
UNION ALL
SELECT 'occm_group_reports', COUNT(*) FROM occm_group_reports
UNION ALL
SELECT 'occm_group_dm_rooms', COUNT(*) FROM occm_group_dm_rooms;
```

### Emergency rollback (single command)

```bash
# Only use in emergency - drops all OCCM tables without migration
bin/rails runner "
  ActiveRecord::Base.connection.execute('DROP TABLE IF EXISTS occm_group_dm_rooms CASCADE')
  ActiveRecord::Base.connection.execute('DROP TABLE IF EXISTS occm_group_reports CASCADE')
  ActiveRecord::Base.connection.execute('DROP TABLE IF EXISTS occm_group_statuses CASCADE')
  ActiveRecord::Base.connection.execute('DROP TABLE IF EXISTS occm_group_memberships CASCADE')
  ActiveRecord::Base.connection.execute('DROP TABLE IF EXISTS occm_groups CASCADE')
  puts 'All OCCM tables dropped.'
"
```

### Check OAuth tokens with OCCM scopes

```sql
SELECT COUNT(*) AS tokens_with_occm_scopes
FROM oauth_access_tokens
WHERE scopes LIKE '%occm_groups%';
```
