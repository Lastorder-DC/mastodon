# OCCM Groups Feature Specification

## 1. Overview and Goals

### Purpose

The OCCM Groups feature adds private, local-only group functionality to this Mastodon fork. Groups allow users to create shared spaces where members can post, discuss, and interact within a controlled membership boundary. All group content is visible only to group members and is never federated to remote instances.

### Design Goals

1. **Local-only communication**: Group posts are never federated. They remain on the local instance and are visible only to group members.
2. **Self-moderation**: Groups have their own admin/moderator hierarchy. Internal reports go to group leadership, not server administrators.
3. **Familiar UX**: The UI follows existing Mastodon patterns, particularly the Lists feature, to maintain consistency.
4. **Future extensibility**: The schema accommodates future group DM rooms without requiring destructive migrations.
5. **PR #19059 compatibility**: All database tables, API endpoints, OAuth scopes, and internal identifiers use the `occm_` prefix to avoid any naming conflicts with the official Mastodon groups implementation (PR #19059).

### Non-Goals

- Federation of group content to remote instances
- Server-admin-level moderation of group content (groups are self-moderated)
- Replacing existing direct message functionality
- Public discoverability of group posts outside membership

---

## 2. Database Schema

All tables use the `occm_` prefix to avoid conflicts with PR #19059. Primary keys are `bigint` following Mastodon conventions. Timestamps follow Rails conventions (`created_at`, `updated_at`).

### 2.1 `occm_groups`

The main group entity. Created by a single account who becomes the permanent admin.

```ruby
# == Schema Information
#
# Table name: occm_groups
#
#  id                :bigint(8)        not null, primary key
#  title             :string           default(""), not null
#  description       :text             default(""), not null
#  account_id        :bigint(8)        not null
#  approval_required :boolean          default(TRUE), not null
#  member_count      :integer          default(0), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class OccmGroup < ApplicationRecord
  include Paginable

  belongs_to :account

  has_many :occm_group_memberships, dependent: :destroy
  has_many :members, through: :occm_group_memberships, source: :account
  has_many :occm_group_statuses, dependent: :destroy
  has_many :occm_group_reports, dependent: :destroy

  validates :title, presence: true, length: { maximum: 100 }
  validates :description, length: { maximum: 500 }

  validate :validate_group_limit

  GROUP_LIMIT = 50

  private

  def validate_group_limit
    errors.add(:base, I18n.t('occm_groups.errors.limit')) if account.occm_groups.count >= GROUP_LIMIT
  end
end
```

**Indexes:**

```sql
CREATE INDEX index_occm_groups_on_account_id ON occm_groups (account_id);
```

**Migration:**

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_groups.rb
class CreateOccmGroups < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_groups do |t|
      t.string :title, default: '', null: false
      t.text :description, default: '', null: false
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.boolean :approval_required, default: true, null: false
      t.integer :member_count, default: 0, null: false
      t.timestamps
    end
  end
end
```

### 2.2 `occm_group_memberships`

Tracks membership state and role for each account in a group.

```ruby
# == Schema Information
#
# Table name: occm_group_memberships
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  account_id    :bigint(8)        not null
#  role          :integer          default("user"), not null
#  state         :integer          default("pending"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class OccmGroupMembership < ApplicationRecord
  belongs_to :occm_group
  belongs_to :account

  enum :role, { admin: 0, moderator: 1, user: 2 }, prefix: true
  enum :state, { pending: 0, active: 1, rejected: 2 }, prefix: true

  validates :account_id, uniqueness: { scope: :occm_group_id }

  scope :active, -> { where(state: :active) }
  scope :pending, -> { where(state: :pending) }
  scope :admins, -> { where(role: :admin) }
  scope :moderators, -> { where(role: :moderator) }
  scope :with_moderation_role, -> { where(role: [:admin, :moderator]) }
end
```

**Indexes:**

```sql
CREATE UNIQUE INDEX index_occm_group_memberships_on_group_and_account
  ON occm_group_memberships (occm_group_id, account_id);
CREATE INDEX index_occm_group_memberships_on_account_id
  ON occm_group_memberships (account_id);
```

**Migration:**

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_group_memberships.rb
class CreateOccmGroupMemberships < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_group_memberships do |t|
      t.references :occm_group, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.integer :role, default: 2, null: false
      t.integer :state, default: 0, null: false
      t.timestamps
    end

    add_index :occm_group_memberships, [:occm_group_id, :account_id], unique: true
  end
end
```

### 2.3 `occm_group_statuses`

Junction table linking statuses to groups. Enables the group timeline query.

```ruby
# == Schema Information
#
# Table name: occm_group_statuses
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  status_id     :bigint(8)        not null
#  account_id    :bigint(8)        not null
#  created_at    :datetime         not null
#

class OccmGroupStatus < ApplicationRecord
  include Paginable

  belongs_to :occm_group
  belongs_to :status
  belongs_to :account

  validates :status_id, uniqueness: { scope: :occm_group_id }
end
```

**Indexes:**

```sql
CREATE UNIQUE INDEX index_occm_group_statuses_on_group_and_status
  ON occm_group_statuses (occm_group_id, status_id);
CREATE INDEX index_occm_group_statuses_on_status_id
  ON occm_group_statuses (status_id);
CREATE INDEX index_occm_group_statuses_on_account_id
  ON occm_group_statuses (account_id);
```

**Migration:**

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_group_statuses.rb
class CreateOccmGroupStatuses < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_group_statuses do |t|
      t.references :occm_group, null: false, foreign_key: { on_delete: :cascade }
      t.references :status, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.datetime :created_at, null: false
    end

    add_index :occm_group_statuses, [:occm_group_id, :status_id], unique: true
  end
end
```

### 2.4 `occm_group_reports`

Internal group report system. Reports are handled by group admin/moderators, not server admins.

```ruby
# == Schema Information
#
# Table name: occm_group_reports
#
#  id                          :bigint(8)        not null, primary key
#  occm_group_id               :bigint(8)        not null
#  account_id                  :bigint(8)        not null
#  target_account_id           :bigint(8)        not null
#  status_ids                  :bigint(8)        default([]), not null, is an Array
#  comment                     :text             default(""), not null
#  category                    :integer          default("other"), not null
#  action_taken_at             :datetime
#  action_taken_by_account_id  :bigint(8)
#  created_at                  :datetime         not null
#  updated_at                  :datetime         not null
#

class OccmGroupReport < ApplicationRecord
  belongs_to :occm_group
  belongs_to :account
  belongs_to :target_account, class_name: 'Account'
  belongs_to :action_taken_by_account, class_name: 'Account', optional: true

  enum :category, { other: 0, spam: 1, harassment: 2, off_topic: 3, rule_violation: 4 }, prefix: true

  validates :comment, length: { maximum: 1000 }

  scope :unresolved, -> { where(action_taken_at: nil) }
  scope :resolved, -> { where.not(action_taken_at: nil) }
end
```

**Indexes:**

```sql
CREATE INDEX index_occm_group_reports_on_occm_group_id
  ON occm_group_reports (occm_group_id);
CREATE INDEX index_occm_group_reports_on_target_account_id
  ON occm_group_reports (target_account_id);
CREATE INDEX index_occm_group_reports_on_action_taken_at
  ON occm_group_reports (action_taken_at);
```

**Migration:**

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_group_reports.rb
class CreateOccmGroupReports < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_group_reports do |t|
      t.references :occm_group, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.bigint :target_account_id, null: false
      t.bigint :status_ids, array: true, default: [], null: false
      t.text :comment, default: '', null: false
      t.integer :category, default: 0, null: false
      t.datetime :action_taken_at
      t.bigint :action_taken_by_account_id
      t.timestamps
    end

    add_index :occm_group_reports, :target_account_id
    add_index :occm_group_reports, :action_taken_at
    add_foreign_key :occm_group_reports, :accounts, column: :target_account_id, on_delete: :cascade
    add_foreign_key :occm_group_reports, :accounts, column: :action_taken_by_account_id, on_delete: :nullify
  end
end
```

### 2.5 `occm_group_dm_rooms` (Future Placeholder)

This table is a schema-level placeholder for future group DM room functionality. It will not be implemented in the initial release but is included to ensure forward-compatible schema design.

```ruby
# == Schema Information
#
# Table name: occm_group_dm_rooms
#
#  id            :bigint(8)        not null, primary key
#  occm_group_id :bigint(8)        not null
#  title         :string           default(""), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class OccmGroupDmRoom < ApplicationRecord
  belongs_to :occm_group

  # Future: has_many :occm_group_dm_messages
  # Future: has_many :occm_group_dm_room_memberships

  validates :title, presence: true, length: { maximum: 100 }
end
```

**Migration (deferred to future release):**

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_occm_group_dm_rooms.rb
class CreateOccmGroupDmRooms < ActiveRecord::Migration[8.0]
  def change
    create_table :occm_group_dm_rooms do |t|
      t.references :occm_group, null: false, foreign_key: { on_delete: :cascade }
      t.string :title, default: '', null: false
      t.timestamps
    end
  end
end
```

---

## 3. API Endpoints

All endpoints are under `/api/v1/occm_groups/` and require authentication via `doorkeeper_authorize!`. Controllers follow the pattern established in `app/controllers/api/v1/lists_controller.rb`.

### 3.1 Groups CRUD

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/occm_groups` | `read:occm_groups` | List groups the current user is a member of |
| GET | `/api/v1/occm_groups/:id` | `read:occm_groups` | Show a single group |
| POST | `/api/v1/occm_groups` | `write:occm_groups` | Create a new group |
| PUT | `/api/v1/occm_groups/:id` | `write:occm_groups` | Update group settings (admin only) |
| DELETE | `/api/v1/occm_groups/:id` | `write:occm_groups` | Delete a group (admin only) |

**Create Request:**

```json
POST /api/v1/occm_groups
{
  "title": "Ruby Developers",
  "description": "A group for Ruby enthusiasts",
  "approval_required": true
}
```

**Response (all group endpoints):**

```json
{
  "id": "12345",
  "title": "Ruby Developers",
  "description": "A group for Ruby enthusiasts",
  "approval_required": true,
  "member_count": 1,
  "role": "admin",
  "membership_state": "active",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Controller pattern** (following `app/controllers/api/v1/lists_controller.rb`):

```ruby
# app/controllers/api/v1/occm_groups_controller.rb
class Api::V1::OccmGroupsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }, except: [:index, :show]
  before_action :require_user!
  before_action :set_occm_group, except: [:index, :create]

  def index
    @occm_groups = current_account.occm_groups
    render json: @occm_groups, each_serializer: REST::OccmGroupSerializer
  end

  def show
    render json: @occm_group, serializer: REST::OccmGroupSerializer
  end

  def create
    @occm_group = CreateOccmGroupService.new.call(current_account, occm_group_params)
    render json: @occm_group, serializer: REST::OccmGroupSerializer
  end

  def update
    authorize @occm_group, :update?
    @occm_group.update!(occm_group_params)
    render json: @occm_group, serializer: REST::OccmGroupSerializer
  end

  def destroy
    authorize @occm_group, :destroy?
    @occm_group.destroy!
    render_empty
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:id])
  end

  def occm_group_params
    params.permit(:title, :description, :approval_required)
  end
end
```

### 3.2 Membership Management

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/occm_groups/:group_id/members` | `read:occm_groups` | List active members |
| GET | `/api/v1/occm_groups/:group_id/members/pending` | `read:occm_groups` | List pending join requests (admin/mod) |
| POST | `/api/v1/occm_groups/:group_id/members` | `write:occm_groups` | Request to join the group |
| POST | `/api/v1/occm_groups/:group_id/members/:account_id/approve` | `write:occm_groups` | Approve join request (admin/mod) |
| POST | `/api/v1/occm_groups/:group_id/members/:account_id/reject` | `write:occm_groups` | Reject join request (admin/mod) |
| DELETE | `/api/v1/occm_groups/:group_id/members/:account_id` | `write:occm_groups` | Remove member (admin/mod) or leave group (self) |

**Join Request:**

```json
POST /api/v1/occm_groups/12345/members
```

**Response (when approval_required is true):**

```json
{
  "id": "67890",
  "account": { "id": "1001", "username": "user1", "display_name": "User One" },
  "role": "user",
  "state": "pending",
  "created_at": "2024-01-15T11:00:00.000Z"
}
```

**Response (when approval_required is false):**

```json
{
  "id": "67890",
  "account": { "id": "1001", "username": "user1", "display_name": "User One" },
  "role": "user",
  "state": "active",
  "created_at": "2024-01-15T11:00:00.000Z"
}
```

**Approve Request:**

```json
POST /api/v1/occm_groups/12345/members/1001/approve
```

**Response:**

```json
{
  "id": "67890",
  "account": { "id": "1001", "username": "user1", "display_name": "User One" },
  "role": "user",
  "state": "active",
  "created_at": "2024-01-15T11:00:00.000Z"
}
```

**Controller pattern** (following `app/controllers/api/v1/lists/accounts_controller.rb`):

```ruby
# app/controllers/api/v1/occm_groups/members_controller.rb
class Api::V1::OccmGroups::MembersController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:occm_groups' }, only: [:index, :pending]
  before_action -> { doorkeeper_authorize! :write, :'write:occm_groups' }, except: [:index, :pending]
  before_action :require_user!
  before_action :set_occm_group

  def index
    @memberships = @occm_group.occm_group_memberships.active.includes(:account)
    render json: @memberships, each_serializer: REST::OccmGroupMembershipSerializer
  end

  def pending
    authorize @occm_group, :moderate?
    @memberships = @occm_group.occm_group_memberships.pending.includes(:account)
    render json: @memberships, each_serializer: REST::OccmGroupMembershipSerializer
  end

  def create
    @membership = JoinOccmGroupService.new.call(current_account, @occm_group)
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def approve
    authorize @occm_group, :moderate?
    @membership = ApproveOccmGroupMemberService.new.call(@occm_group, params[:account_id])
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def reject
    authorize @occm_group, :moderate?
    @membership = RejectOccmGroupMemberService.new.call(@occm_group, params[:account_id])
    render json: @membership, serializer: REST::OccmGroupMembershipSerializer
  end

  def destroy
    RemoveOccmGroupMemberService.new.call(@occm_group, params[:account_id], current_account)
    render_empty
  end

  private

  def set_occm_group
    @occm_group = OccmGroup.find(params[:occm_group_id])
  end
end
```

### 3.3 Group Timeline

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/occm_groups/:group_id/timeline` | `read:occm_groups` | Get group timeline (paginated) |

**Response:**

```json
[
  {
    "id": "109876543210",
    "created_at": "2024-01-15T12:00:00.000Z",
    "content": "<p>Hello group!</p>",
    "account": { "id": "1001", "username": "user1" },
    "visibility": "limited",
    "occm_group_id": "12345"
  }
]
```

The timeline uses standard Mastodon status pagination with `Link` headers (`max_id`, `since_id`, `min_id`).

### 3.4 Post to Group

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/occm_groups/:group_id/statuses` | `write:occm_groups` | Create a post in the group |

**Request:**

```json
POST /api/v1/occm_groups/12345/statuses
{
  "status": "Hello everyone in the group!",
  "media_ids": [],
  "poll": null
}
```

**Response:** Standard status JSON with additional `occm_group_id` field.

The post is created with `visibility: :limited` and linked to the group via `occm_group_statuses`. The status is NOT federated. Only group members can see it in their timelines.

### 3.5 Admin Actions

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/occm_groups/:group_id/transfer` | `write:occm_groups` | Transfer admin role (admin only) |
| POST | `/api/v1/occm_groups/:group_id/moderators/:account_id` | `write:occm_groups` | Promote to moderator (admin only) |
| DELETE | `/api/v1/occm_groups/:group_id/moderators/:account_id` | `write:occm_groups` | Demote from moderator (admin only) |
| DELETE | `/api/v1/occm_groups/:group_id/statuses/:status_id` | `write:occm_groups` | Delete a group post (admin/mod) |

**Transfer Admin:**

```json
POST /api/v1/occm_groups/12345/transfer
{
  "account_id": "2002"
}
```

**Response:**

```json
{
  "id": "12345",
  "title": "Ruby Developers",
  "role": "user",
  "membership_state": "active"
}
```

After transfer, the former admin becomes a regular user. The new admin account must already be an active member of the group.

**Delete Group Post (admin/mod action):**

```json
DELETE /api/v1/occm_groups/12345/statuses/109876543210
```

This triggers an `occm_group_post_deleted` notification to the post author.

### 3.6 Group Reports

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/occm_groups/:group_id/reports` | `read:occm_groups` | List reports (admin/mod) |
| POST | `/api/v1/occm_groups/:group_id/reports` | `write:occm_groups` | File a report |
| POST | `/api/v1/occm_groups/:group_id/reports/:id/resolve` | `write:occm_groups` | Resolve a report (admin/mod) |

**Create Report:**

```json
POST /api/v1/occm_groups/12345/reports
{
  "target_account_id": "3003",
  "status_ids": ["109876543210"],
  "comment": "This post violates group rules",
  "category": "rule_violation"
}
```

**Response:**

```json
{
  "id": "555",
  "occm_group_id": "12345",
  "account": { "id": "1001", "username": "reporter" },
  "target_account": { "id": "3003", "username": "reported_user" },
  "status_ids": ["109876543210"],
  "comment": "This post violates group rules",
  "category": "rule_violation",
  "action_taken_at": null,
  "created_at": "2024-01-15T13:00:00.000Z"
}
```

---

## 4. OAuth Scopes

Following the pattern in `config/initializers/doorkeeper.rb`, new scopes are registered:

```ruby
# config/initializers/doorkeeper.rb additions
optional_scopes += %w(
  read:occm_groups
  write:occm_groups
)
```

**Scope mapping:**

| Scope | Allows |
|-------|--------|
| `read:occm_groups` | View groups, members, timeline, reports (if admin/mod) |
| `write:occm_groups` | Create/update/delete groups, join/leave, post, manage members, file reports |
| `read` | Implicitly includes `read:occm_groups` |
| `write` | Implicitly includes `write:occm_groups` |

The scopes follow Mastodon's granular permission model where `read` and `write` are umbrella scopes that include all sub-scopes.

---

## 5. Permissions and Roles

### 5.1 Role Definitions

| Role | Value | Assignment |
|------|-------|------------|
| Admin | 0 | Automatically assigned to group creator. Exactly one per group. |
| Moderator | 1 | Appointed by admin. Multiple allowed. |
| User | 2 | Default role for approved members. |

### 5.2 Permission Matrix

| Action | Admin | Moderator | User | Non-member |
|--------|:-----:|:---------:|:----:|:----------:|
| View group info | Yes | Yes | Yes | Yes |
| View group timeline | Yes | Yes | Yes | No |
| Post to group | Yes | Yes | Yes | No |
| Edit group settings | Yes | No | No | No |
| Delete group | Yes | No | No | No |
| Approve join requests | Yes | Yes | No | No |
| Reject join requests | Yes | Yes | No | No |
| Remove members | Yes | Yes (not admin) | No | No |
| Promote to moderator | Yes | No | No | No |
| Demote moderator | Yes | No | No | No |
| Transfer admin role | Yes | No | No | No |
| Delete any group post | Yes | Yes | No | No |
| File group report | Yes | Yes | Yes | No |
| View group reports | Yes | Yes | No | No |
| Resolve group reports | Yes | Yes | No | No |
| Leave group | No* | Yes | Yes | N/A |
| Request to join | N/A | N/A | N/A | Yes |

*Admin cannot leave the group. They must either delete the group or transfer admin to another member first.

### 5.3 Admin Constraints

1. **Cannot leave**: The admin cannot remove themselves from the group. Attempting to call `DELETE /api/v1/occm_groups/:group_id/members/:admin_account_id` returns `422 Unprocessable Entity` with an error message.
2. **Must transfer or delete**: The only way for an admin to exit is to transfer the admin role to another active member, or to delete the entire group.
3. **Transfer restrictions**: Admin can only be transferred to an active member (not pending or rejected). After transfer, the former admin becomes a regular user (role: 2).
4. **Single admin**: There is exactly one admin per group at all times.

---

## 6. Notification Types

Following the pattern in `app/models/notification.rb` with the `PROPERTIES` hash:

```ruby
# app/models/notification.rb additions
PROPERTIES = {
  # ... existing properties ...
  occm_group_join_request: {
    filterable: true,
    baseline: false,
  }.freeze,
  occm_group_join_approved: {
    filterable: true,
    baseline: false,
  }.freeze,
  occm_group_join_rejected: {
    filterable: true,
    baseline: false,
  }.freeze,
  occm_group_post_deleted: {
    filterable: true,
    baseline: false,
  }.freeze,
}.freeze
```

### 6.1 Notification Definitions

| Type | Recipient | Trigger | Activity |
|------|-----------|---------|----------|
| `occm_group_join_request` | Group admin and moderators | User requests to join a group with `approval_required: true` | `OccmGroupMembership` (pending) |
| `occm_group_join_approved` | Requesting user | Admin/mod approves a join request | `OccmGroupMembership` (active) |
| `occm_group_join_rejected` | Requesting user | Admin/mod rejects a join request | `OccmGroupMembership` (rejected) |
| `occm_group_post_deleted` | Post author | Admin/mod deletes a group post | `OccmGroupStatus` (deleted record reference) |

### 6.2 Notification Service Integration

```ruby
# app/services/notify_occm_group_service.rb
class NotifyOccmGroupService < BaseService
  def call(recipient, type, activity)
    notification = Notification.create!(
      account: recipient,
      type: type,
      activity: activity
    )
    push_notification(notification)
    push_to_streaming_api(notification)
  end

  private

  def push_notification(notification)
    Redis.current.publish("timeline:#{notification.account_id}:notifications", Oj.dump(event: :notification, payload: notification.id))
  end

  def push_to_streaming_api(notification)
    InlineRenderer.render(notification, notification.account, :notification)
  end
end
```

### 6.3 Frontend Notification Types

```typescript
// app/javascript/mastodon/api_types/notifications.ts additions
interface OccmGroupJoinRequestNotification {
  type: 'occm_group_join_request';
  occm_group_membership: ApiOccmGroupMembershipJSON;
}

interface OccmGroupJoinApprovedNotification {
  type: 'occm_group_join_approved';
  occm_group_membership: ApiOccmGroupMembershipJSON;
}

interface OccmGroupJoinRejectedNotification {
  type: 'occm_group_join_rejected';
  occm_group_membership: ApiOccmGroupMembershipJSON;
}

interface OccmGroupPostDeletedNotification {
  type: 'occm_group_post_deleted';
  occm_group_id: string;
  status_id: string;
}
```

---

## 7. Group Report System

### 7.1 Design Principles

1. **Internal moderation**: Group reports are handled entirely by the group's admin and moderators. They do NOT appear in the server admin interface.
2. **Separation from server reports**: The `occm_group_reports` table is completely separate from Mastodon's `reports` table. This prevents interference with server-level moderation.
3. **Member-only reporting**: Only active group members can file reports.
4. **Status attachment**: Reports can reference specific statuses (group posts) that violated rules.

### 7.2 Report Categories

Following the pattern from Mastodon's `Report` model:

| Category | Value | Description |
|----------|-------|-------------|
| `other` | 0 | Other/unspecified reason |
| `spam` | 1 | Spam or unwanted commercial content |
| `harassment` | 2 | Harassment or bullying |
| `off_topic` | 3 | Content unrelated to the group purpose |
| `rule_violation` | 4 | Violation of group-specific rules |

### 7.3 Report Resolution Actions

When resolving a report, admin/moderators can take the following actions:

1. **Dismiss**: Mark as resolved with no action
2. **Delete posts**: Remove the reported statuses from the group
3. **Remove member**: Kick the reported account from the group
4. **Remove and ban** (future): Remove and prevent rejoining (requires `occm_group_bans` table in future)

### 7.4 Report Resolution Endpoint

```json
POST /api/v1/occm_groups/12345/reports/555/resolve
{
  "action": "delete_posts"
}
```

**Response:**

```json
{
  "id": "555",
  "action_taken_at": "2024-01-15T14:00:00.000Z",
  "action_taken_by_account": { "id": "1001", "username": "admin_user" }
}
```

### 7.5 Future Extensibility: Group Rules

The report system is designed to support future "group rules" functionality:

```ruby
# Future: occm_group_rules table
# - id: bigint
# - occm_group_id: bigint
# - text: string
# - position: integer
# This allows groups to define their own rules, which can be referenced in reports
```

---

## 8. Group DM Room Considerations

### 8.1 Schema Placeholder

The `occm_group_dm_rooms` table (Section 2.5) provides the foundation for future group DM functionality. This section documents the intended design direction.

### 8.2 Future Design Direction

Group DM rooms would enable real-time chat within a group, separate from the group timeline:

- **Room types**: General chat, topic-specific rooms
- **Room membership**: Could be subset of group members (invite-only rooms within a group)
- **Message model**: Separate from Mastodon statuses (lighter weight, no federation consideration)
- **Streaming**: Dedicated WebSocket channels per room

### 8.3 Additional Future Tables

```ruby
# occm_group_dm_room_memberships
# - id: bigint
# - occm_group_dm_room_id: bigint
# - account_id: bigint
# - created_at: datetime

# occm_group_dm_messages
# - id: bigint
# - occm_group_dm_room_id: bigint
# - account_id: bigint
# - content: text
# - created_at: datetime
```

### 8.4 Current Implementation Status

For the initial Groups release, the DM rooms table is created but no API endpoints, UI, or logic are implemented. This ensures:

1. The schema is stable from day one
2. No future migrations need to alter the core group tables
3. The foreign key relationship is established early

---

## 9. UI/UX Flow

All UI components follow patterns from the existing Lists feature in `app/javascript/mastodon/features/lists/`.

### 9.1 Group List Screen

**Reference pattern**: `app/javascript/mastodon/features/lists/index.tsx`

```
+----------------------------------+
|  Column: Groups                  |
|  [ColumnHeader: "Groups"]        |
|  [+ New Group button]            |
|----------------------------------|
|  ScrollableList                  |
|  - Ruby Developers (12 members)  |
|  - Design Team (5 members)       |
|  - Book Club (8 members)         |
+----------------------------------+
```

- Uses `Column` wrapper component
- `ColumnHeader` with title "Groups" and back navigation
- `ScrollableList` for the group list with infinite scroll
- Each group item shows title, member count, and user's role badge
- "New Group" button at the top (or in ColumnHeader actions)

### 9.2 Create/Edit Group Screen

**Reference pattern**: `app/javascript/mastodon/features/lists/new.tsx`

```
+----------------------------------+
|  Column: New Group               |
|  [ColumnHeader: "New Group"]     |
|----------------------------------|
|  Form:                           |
|  [Title input]                   |
|  [Description textarea]         |
|  [Approval required toggle]     |
|  [Create button]                 |
+----------------------------------+
```

- Title input (max 100 chars)
- Description textarea (max 500 chars)
- Toggle for "Require approval to join"
- Submit button ("Create Group" or "Save Changes")

### 9.3 Group Timeline Screen

**Reference pattern**: `app/javascript/mastodon/features/list_timeline/index.jsx`

```
+----------------------------------+
|  Column: Ruby Developers         |
|  [ColumnHeader with actions]     |
|  Actions: Settings, Members,     |
|           Compose                |
|----------------------------------|
|  StatusListContainer             |
|  - Post from user1               |
|  - Post from user2               |
|  - Post from user3               |
|                                  |
|  [Compose area / FAB]            |
+----------------------------------+
```

- `ColumnHeader` shows group title with action buttons
- Action buttons: Settings (gear icon), Members (people icon), Compose (pen icon)
- Timeline uses `StatusListContainer` with group-specific feed
- Streaming connection for real-time updates
- Floating action button or inline compose for posting

### 9.4 Group Members Screen

**Reference pattern**: `app/javascript/mastodon/features/lists/members.tsx`

```
+----------------------------------+
|  Column: Members                 |
|  [ColumnHeader: "Members"]       |
|  [Tab: Active | Pending]         |
|----------------------------------|
|  ScrollableList                  |
|  - admin_user [Admin badge]      |
|  - mod_user [Mod badge] [Demote] |
|  - user1 [Remove]               |
|  - user2 [Remove]               |
+----------------------------------+
```

- Tab navigation: "Active" (current members) and "Pending" (join requests, admin/mod only)
- Each member shows: avatar, display name, username, role badge
- Admin/mod actions: Remove button, Promote/Demote button
- Pending tab shows Approve/Reject buttons for each request
- Search functionality to find members

### 9.5 Pending Members (Join Requests)

```
+----------------------------------+
|  Tab: Pending                    |
|----------------------------------|
|  - requesting_user1              |
|    [Approve] [Reject]            |
|  - requesting_user2              |
|    [Approve] [Reject]            |
+----------------------------------+
```

### 9.6 Group Reports Screen (Admin/Mod Only)

```
+----------------------------------+
|  Column: Group Reports           |
|  [ColumnHeader: "Reports"]       |
|  [Tab: Open | Resolved]          |
|----------------------------------|
|  ScrollableList                  |
|  - Report #1: user3 reported     |
|    by user1 - "harassment"       |
|    [View] [Resolve]              |
+----------------------------------+
```

- Only visible to admin and moderators
- Shows reporter, reported account, category, comment
- Actions: View details, Resolve (with action selection)

### 9.7 Compose Mode for Groups

When composing a post for a group, the compose UI is modified:

```
+----------------------------------+
|  Compose                         |
|  [Group indicator: Ruby Devs]    |
|----------------------------------|
|  [Text area]                     |
|  [Media attachments]             |
|  [Poll option]                   |
|----------------------------------|
|  [Post to Group button]          |
|  Visibility: Group only (locked) |
+----------------------------------+
```

- Group context indicator shown above the compose textarea
- Visibility selector is locked to "Group only" (limited visibility)
- Mentions autocomplete restricted to group members only
- "Post to Group" button replaces standard "Post" button
- Can be triggered from group timeline or a dedicated compose action

### 9.8 Navigation

Groups are accessible from:
1. Main navigation sidebar (new "Groups" icon)
2. URL route: `/groups` (list), `/groups/:id` (timeline), `/groups/:id/members`, `/groups/:id/reports`

---

## 10. i18n Requirements

All user-facing strings must be translated in both English (en) and Korean (ko). Translation keys follow Mastodon's existing patterns in `config/locales/`.

### 10.1 Backend Translations (Rails)

```yaml
# config/locales/en.yml (additions)
en:
  occm_groups:
    title: "Groups"
    errors:
      limit: "You have reached the maximum number of groups"
      not_member: "You are not a member of this group"
      already_member: "You are already a member of this group"
      admin_cannot_leave: "Admin cannot leave the group. Transfer admin role or delete the group."
      not_authorized: "You do not have permission to perform this action"
      pending_request: "You already have a pending join request"
    notifications:
      join_request: "%{name} requested to join your group %{group}"
      join_approved: "Your request to join %{group} has been approved"
      join_rejected: "Your request to join %{group} has been rejected"
      post_deleted: "Your post in %{group} was removed by a moderator"
    reports:
      categories:
        other: "Other"
        spam: "Spam"
        harassment: "Harassment"
        off_topic: "Off-topic"
        rule_violation: "Rule violation"
    roles:
      admin: "Admin"
      moderator: "Moderator"
      user: "Member"
```

```yaml
# config/locales/ko.yml (additions)
ko:
  occm_groups:
    title: "그룹"
    errors:
      limit: "그룹 최대 개수에 도달했습니다"
      not_member: "이 그룹의 멤버가 아닙니다"
      already_member: "이미 이 그룹의 멤버입니다"
      admin_cannot_leave: "관리자는 그룹을 떠날 수 없습니다. 관리자 권한을 이전하거나 그룹을 삭제하세요."
      not_authorized: "이 작업을 수행할 권한이 없습니다"
      pending_request: "이미 가입 요청이 대기 중입니다"
    notifications:
      join_request: "%{name}님이 그룹 %{group}에 가입을 요청했습니다"
      join_approved: "%{group} 그룹 가입 요청이 승인되었습니다"
      join_rejected: "%{group} 그룹 가입 요청이 거절되었습니다"
      post_deleted: "%{group} 그룹에서 게시물이 관리자에 의해 삭제되었습니다"
    reports:
      categories:
        other: "기타"
        spam: "스팸"
        harassment: "괴롭힘"
        off_topic: "주제와 무관"
        rule_violation: "규칙 위반"
    roles:
      admin: "관리자"
      moderator: "운영자"
      user: "멤버"
```

### 10.2 Frontend Translations (react-intl)

```typescript
// app/javascript/mastodon/features/occm_groups/messages.ts
import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  title: { id: 'occm_groups.title', defaultMessage: 'Groups' },
  createGroup: { id: 'occm_groups.create', defaultMessage: 'Create group' },
  editGroup: { id: 'occm_groups.edit', defaultMessage: 'Edit group' },
  deleteGroup: { id: 'occm_groups.delete', defaultMessage: 'Delete group' },
  joinGroup: { id: 'occm_groups.join', defaultMessage: 'Join group' },
  leaveGroup: { id: 'occm_groups.leave', defaultMessage: 'Leave group' },
  pendingApproval: { id: 'occm_groups.pending', defaultMessage: 'Pending approval' },
  members: { id: 'occm_groups.members', defaultMessage: 'Members' },
  pendingMembers: { id: 'occm_groups.pending_members', defaultMessage: 'Pending requests' },
  reports: { id: 'occm_groups.reports', defaultMessage: 'Reports' },
  approveJoin: { id: 'occm_groups.approve', defaultMessage: 'Approve' },
  rejectJoin: { id: 'occm_groups.reject', defaultMessage: 'Reject' },
  removeMember: { id: 'occm_groups.remove_member', defaultMessage: 'Remove from group' },
  promoteMod: { id: 'occm_groups.promote_mod', defaultMessage: 'Promote to moderator' },
  demoteMod: { id: 'occm_groups.demote_mod', defaultMessage: 'Demote from moderator' },
  transferAdmin: { id: 'occm_groups.transfer_admin', defaultMessage: 'Transfer admin role' },
  groupTimeline: { id: 'occm_groups.timeline', defaultMessage: 'Group timeline' },
  postToGroup: { id: 'occm_groups.post', defaultMessage: 'Post to group' },
  approvalRequired: { id: 'occm_groups.approval_required', defaultMessage: 'Require approval to join' },
  groupDescription: { id: 'occm_groups.description', defaultMessage: 'Description' },
  groupTitle: { id: 'occm_groups.group_title', defaultMessage: 'Group name' },
  confirmDelete: { id: 'occm_groups.confirm_delete', defaultMessage: 'Are you sure you want to delete this group? This cannot be undone.' },
  memberCount: { id: 'occm_groups.member_count', defaultMessage: '{count, plural, one {# member} other {# members}}' },
});
```

```json
// app/javascript/mastodon/locales/en.json (additions)
{
  "occm_groups.title": "Groups",
  "occm_groups.create": "Create group",
  "occm_groups.edit": "Edit group",
  "occm_groups.delete": "Delete group",
  "occm_groups.join": "Join group",
  "occm_groups.leave": "Leave group",
  "occm_groups.pending": "Pending approval",
  "occm_groups.members": "Members",
  "occm_groups.pending_members": "Pending requests",
  "occm_groups.reports": "Reports",
  "occm_groups.approve": "Approve",
  "occm_groups.reject": "Reject",
  "occm_groups.remove_member": "Remove from group",
  "occm_groups.promote_mod": "Promote to moderator",
  "occm_groups.demote_mod": "Demote from moderator",
  "occm_groups.transfer_admin": "Transfer admin role",
  "occm_groups.timeline": "Group timeline",
  "occm_groups.post": "Post to group",
  "occm_groups.approval_required": "Require approval to join",
  "occm_groups.description": "Description",
  "occm_groups.group_title": "Group name",
  "occm_groups.confirm_delete": "Are you sure you want to delete this group? This cannot be undone.",
  "occm_groups.member_count": "{count, plural, one {# member} other {# members}}"
}
```

```json
// app/javascript/mastodon/locales/ko.json (additions)
{
  "occm_groups.title": "그룹",
  "occm_groups.create": "그룹 만들기",
  "occm_groups.edit": "그룹 수정",
  "occm_groups.delete": "그룹 삭제",
  "occm_groups.join": "그룹 가입",
  "occm_groups.leave": "그룹 탈퇴",
  "occm_groups.pending": "승인 대기 중",
  "occm_groups.members": "멤버",
  "occm_groups.pending_members": "대기 중인 요청",
  "occm_groups.reports": "신고",
  "occm_groups.approve": "승인",
  "occm_groups.reject": "거절",
  "occm_groups.remove_member": "그룹에서 제거",
  "occm_groups.promote_mod": "운영자로 승격",
  "occm_groups.demote_mod": "운영자에서 해제",
  "occm_groups.transfer_admin": "관리자 권한 이전",
  "occm_groups.timeline": "그룹 타임라인",
  "occm_groups.post": "그룹에 게시",
  "occm_groups.approval_required": "가입 시 승인 필요",
  "occm_groups.description": "설명",
  "occm_groups.group_title": "그룹 이름",
  "occm_groups.confirm_delete": "정말로 이 그룹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
  "occm_groups.member_count": "{count, plural, one {멤버 #명} other {멤버 #명}}"
}
```

---

## 11. Non-Federation Design

### 11.1 Core Principle

Group posts exist ONLY on the local instance. They are never delivered to remote instances via ActivityPub. This ensures group privacy and simplifies the implementation.

### 11.2 Implementation Mechanism

**Reference**: `app/models/concerns/status/visibility.rb`

Group posts use the existing `limited` visibility level (value: 4). Additionally, they are linked to a group via `occm_group_statuses`:

```ruby
# app/models/concerns/status/visibility.rb
# Existing visibility enum:
# { public: 0, unlisted: 1, private: 2, direct: 3, limited: 4 }
#
# Group posts use visibility: :limited
```

### 11.3 Federation Prevention

```ruby
# app/services/post_to_occm_group_service.rb
class PostToOccmGroupService < BaseService
  def call(account, occm_group, params)
    # 1. Verify membership
    raise Mastodon::NotPermittedError unless occm_group.occm_group_memberships.active.exists?(account_id: account.id)

    # 2. Create status with limited visibility (prevents federation)
    status = PostStatusService.new.call(
      account,
      text: params[:status],
      visibility: :limited,
      media_ids: params[:media_ids],
      poll: params[:poll],
      # Do NOT set any federation-related fields
      local_only: true
    )

    # 3. Link status to group
    OccmGroupStatus.create!(
      occm_group: occm_group,
      status: status,
      account: account
    )

    # 4. Distribute to group members via streaming (no ActivityPub delivery)
    DistributeOccmGroupStatusService.new.call(status, occm_group)

    status
  end
end
```

### 11.4 Visibility Enforcement

Group posts are further protected by:

1. **Timeline filtering**: Group posts only appear in the group timeline, never in home/public/hashtag timelines
2. **API access control**: The status endpoint returns 404 for non-members attempting to view a group post
3. **No ActivityPub objects**: Group statuses never generate ActivityPub `Create` activities for remote delivery
4. **Mention restriction**: Mentions within group posts can only reference group members. Non-member mentions are silently ignored.

### 11.5 Status Visibility Check

```ruby
# app/models/concerns/status/occm_group_visibility.rb
module Status::OccmGroupVisibility
  extend ActiveSupport::Concern

  def visible_to_occm_group_member?(account)
    return true unless occm_group_status.present?

    occm_group_status.occm_group.occm_group_memberships.active.exists?(account_id: account.id)
  end

  private

  def occm_group_status
    @occm_group_status ||= OccmGroupStatus.find_by(status_id: id)
  end
end
```

---

## 12. Streaming

### 12.1 Group Timeline Channel

**Reference pattern**: `connectListStream` in `app/javascript/mastodon/actions/streaming.js`

Group timelines use a dedicated streaming channel following the same pattern as list timelines:

```javascript
// app/javascript/mastodon/actions/streaming.js additions
export const connectOccmGroupStream = (groupId) =>
  connectTimelineStream(
    `occm_group:${groupId}`,
    'occm_group',
    { group: groupId }
  );
```

### 12.2 Server-Side Streaming

```ruby
# app/lib/streaming/occm_group_channel.rb
class Streaming::OccmGroupChannel
  def initialize(account, group_id)
    @account = account
    @group_id = group_id
  end

  def subscribe
    # Verify membership before allowing stream connection
    raise Mastodon::NotPermittedError unless member?

    Redis.current.subscribe("timeline:occm_group:#{@group_id}")
  end

  private

  def member?
    OccmGroupMembership.active.exists?(
      occm_group_id: @group_id,
      account_id: @account.id
    )
  end
end
```

### 12.3 Event Publishing

When a new post is created in a group:

```ruby
# app/services/distribute_occm_group_status_service.rb
class DistributeOccmGroupStatusService < BaseService
  def call(status, occm_group)
    payload = InlineRenderer.render(status, nil, :status)
    payload = Oj.dump(event: :update, payload: payload)

    # Publish to group timeline channel
    Redis.current.publish("timeline:occm_group:#{occm_group.id}", payload)

    # Also notify each member's notification stream if they have it enabled
    occm_group.occm_group_memberships.active.pluck(:account_id).each do |account_id|
      FeedManager.instance.push_to_home(Account.find(account_id), status)
    end
  end
end
```

### 12.4 Streaming Events

| Event | Channel | Payload | Trigger |
|-------|---------|---------|---------|
| `update` | `occm_group:{id}` | Status JSON | New post in group |
| `delete` | `occm_group:{id}` | Status ID | Post deleted from group |
| `notification` | User notification channel | Notification JSON | Join request, approval, rejection, post deletion |

### 12.5 Frontend Stream Connection

```typescript
// In the group timeline component
useEffect(() => {
  const disconnect = dispatch(connectOccmGroupStream(groupId));
  return () => {
    disconnect();
  };
}, [dispatch, groupId]);
```

---

## 13. Frontend Architecture

### 13.1 Redux State Shape

**Reference pattern**: `app/javascript/mastodon/reducers/lists.ts`

```typescript
// app/javascript/mastodon/reducers/occm_groups.ts
interface OccmGroupsState {
  items: Map<string, OccmGroup>;
  isLoading: boolean;
  loaded: boolean;
}

interface OccmGroup {
  id: string;
  title: string;
  description: string;
  approval_required: boolean;
  member_count: number;
  role: 'admin' | 'moderator' | 'user' | null;
  membership_state: 'pending' | 'active' | 'rejected' | null;
  created_at: string;
}
```

Full state tree additions:

```typescript
interface RootState {
  // ... existing state ...
  occm_groups: OccmGroupsState;
  occm_group_memberships: OccmGroupMembershipsState;
  occm_group_timelines: OccmGroupTimelinesState;
  occm_group_reports: OccmGroupReportsState;
}

interface OccmGroupMembershipsState {
  items: Map<string, Map<string, OccmGroupMembership>>;  // groupId -> accountId -> membership
  pending: Map<string, OccmGroupMembership[]>;           // groupId -> pending memberships
  isLoading: boolean;
}

interface OccmGroupTimelinesState {
  items: Map<string, string[]>;      // groupId -> statusIds
  isLoading: Map<string, boolean>;   // groupId -> loading state
  hasMore: Map<string, boolean>;     // groupId -> has more pages
}

interface OccmGroupReportsState {
  items: Map<string, OccmGroupReport[]>;  // groupId -> reports
  isLoading: boolean;
}
```

### 13.2 API Type Definitions

**Reference pattern**: `app/javascript/mastodon/api_types/lists.ts`

```typescript
// app/javascript/mastodon/api_types/occm_groups.ts
export interface ApiOccmGroupJSON {
  id: string;
  title: string;
  description: string;
  approval_required: boolean;
  member_count: number;
  role: 'admin' | 'moderator' | 'user' | null;
  membership_state: 'pending' | 'active' | 'rejected' | null;
  created_at: string;
}

export interface ApiOccmGroupMembershipJSON {
  id: string;
  account: ApiAccountJSON;
  role: 'admin' | 'moderator' | 'user';
  state: 'pending' | 'active' | 'rejected';
  created_at: string;
}

export interface ApiOccmGroupReportJSON {
  id: string;
  occm_group_id: string;
  account: ApiAccountJSON;
  target_account: ApiAccountJSON;
  status_ids: string[];
  comment: string;
  category: 'other' | 'spam' | 'harassment' | 'off_topic' | 'rule_violation';
  action_taken_at: string | null;
  action_taken_by_account: ApiAccountJSON | null;
  created_at: string;
}
```

### 13.3 API Module

**Reference pattern**: `app/javascript/mastodon/api/lists.ts`

```typescript
// app/javascript/mastodon/api/occm_groups.ts
import {
  apiRequestGet,
  apiRequestPost,
  apiRequestPut,
  apiRequestDelete,
} from 'mastodon/api';
import type {
  ApiOccmGroupJSON,
  ApiOccmGroupMembershipJSON,
  ApiOccmGroupReportJSON,
} from 'mastodon/api_types/occm_groups';

// Groups CRUD
export const apiGetOccmGroups = () =>
  apiRequestGet<ApiOccmGroupJSON[]>('/v1/occm_groups');

export const apiGetOccmGroup = (groupId: string) =>
  apiRequestGet<ApiOccmGroupJSON>(`/v1/occm_groups/${groupId}`);

export const apiCreateOccmGroup = (params: {
  title: string;
  description: string;
  approval_required: boolean;
}) => apiRequestPost<ApiOccmGroupJSON>('/v1/occm_groups', params);

export const apiUpdateOccmGroup = (groupId: string, params: {
  title?: string;
  description?: string;
  approval_required?: boolean;
}) => apiRequestPut<ApiOccmGroupJSON>(`/v1/occm_groups/${groupId}`, params);

export const apiDeleteOccmGroup = (groupId: string) =>
  apiRequestDelete(`/v1/occm_groups/${groupId}`);

// Membership
export const apiGetOccmGroupMembers = (groupId: string) =>
  apiRequestGet<ApiOccmGroupMembershipJSON[]>(`/v1/occm_groups/${groupId}/members`);

export const apiGetOccmGroupPendingMembers = (groupId: string) =>
  apiRequestGet<ApiOccmGroupMembershipJSON[]>(`/v1/occm_groups/${groupId}/members/pending`);

export const apiJoinOccmGroup = (groupId: string) =>
  apiRequestPost<ApiOccmGroupMembershipJSON>(`/v1/occm_groups/${groupId}/members`);

export const apiApproveOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestPost<ApiOccmGroupMembershipJSON>(`/v1/occm_groups/${groupId}/members/${accountId}/approve`);

export const apiRejectOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestPost<ApiOccmGroupMembershipJSON>(`/v1/occm_groups/${groupId}/members/${accountId}/reject`);

export const apiRemoveOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestDelete(`/v1/occm_groups/${groupId}/members/${accountId}`);

// Admin actions
export const apiTransferOccmGroupAdmin = (groupId: string, accountId: string) =>
  apiRequestPost<ApiOccmGroupJSON>(`/v1/occm_groups/${groupId}/transfer`, { account_id: accountId });

export const apiPromoteOccmGroupModerator = (groupId: string, accountId: string) =>
  apiRequestPost<ApiOccmGroupMembershipJSON>(`/v1/occm_groups/${groupId}/moderators/${accountId}`);

export const apiDemoteOccmGroupModerator = (groupId: string, accountId: string) =>
  apiRequestDelete<ApiOccmGroupMembershipJSON>(`/v1/occm_groups/${groupId}/moderators/${accountId}`);

// Timeline
export const apiGetOccmGroupTimeline = (groupId: string, params?: {
  max_id?: string;
  since_id?: string;
  min_id?: string;
  limit?: number;
}) => apiRequestGet(`/v1/occm_groups/${groupId}/timeline`, params);

// Posting
export const apiPostToOccmGroup = (groupId: string, params: {
  status: string;
  media_ids?: string[];
  poll?: object;
}) => apiRequestPost(`/v1/occm_groups/${groupId}/statuses`, params);

// Reports
export const apiGetOccmGroupReports = (groupId: string) =>
  apiRequestGet<ApiOccmGroupReportJSON[]>(`/v1/occm_groups/${groupId}/reports`);

export const apiCreateOccmGroupReport = (groupId: string, params: {
  target_account_id: string;
  status_ids?: string[];
  comment?: string;
  category: string;
}) => apiRequestPost<ApiOccmGroupReportJSON>(`/v1/occm_groups/${groupId}/reports`, params);

export const apiResolveOccmGroupReport = (groupId: string, reportId: string, params: {
  action?: string;
}) => apiRequestPost<ApiOccmGroupReportJSON>(`/v1/occm_groups/${groupId}/reports/${reportId}/resolve`, params);

// Post deletion by admin/mod
export const apiDeleteOccmGroupStatus = (groupId: string, statusId: string) =>
  apiRequestDelete(`/v1/occm_groups/${groupId}/statuses/${statusId}`);
```

### 13.4 Actions

**Reference pattern**: `app/javascript/mastodon/actions/lists.js`

```typescript
// app/javascript/mastodon/actions/occm_groups.ts
export const OCCM_GROUPS_FETCH_REQUEST = 'OCCM_GROUPS_FETCH_REQUEST';
export const OCCM_GROUPS_FETCH_SUCCESS = 'OCCM_GROUPS_FETCH_SUCCESS';
export const OCCM_GROUPS_FETCH_FAIL = 'OCCM_GROUPS_FETCH_FAIL';

export const OCCM_GROUP_CREATE_REQUEST = 'OCCM_GROUP_CREATE_REQUEST';
export const OCCM_GROUP_CREATE_SUCCESS = 'OCCM_GROUP_CREATE_SUCCESS';
export const OCCM_GROUP_CREATE_FAIL = 'OCCM_GROUP_CREATE_FAIL';

export const OCCM_GROUP_UPDATE_REQUEST = 'OCCM_GROUP_UPDATE_REQUEST';
export const OCCM_GROUP_UPDATE_SUCCESS = 'OCCM_GROUP_UPDATE_SUCCESS';
export const OCCM_GROUP_UPDATE_FAIL = 'OCCM_GROUP_UPDATE_FAIL';

export const OCCM_GROUP_DELETE_REQUEST = 'OCCM_GROUP_DELETE_REQUEST';
export const OCCM_GROUP_DELETE_SUCCESS = 'OCCM_GROUP_DELETE_SUCCESS';
export const OCCM_GROUP_DELETE_FAIL = 'OCCM_GROUP_DELETE_FAIL';

export const OCCM_GROUP_MEMBERS_FETCH_REQUEST = 'OCCM_GROUP_MEMBERS_FETCH_REQUEST';
export const OCCM_GROUP_MEMBERS_FETCH_SUCCESS = 'OCCM_GROUP_MEMBERS_FETCH_SUCCESS';
export const OCCM_GROUP_MEMBERS_FETCH_FAIL = 'OCCM_GROUP_MEMBERS_FETCH_FAIL';

export const OCCM_GROUP_JOIN_REQUEST = 'OCCM_GROUP_JOIN_REQUEST';
export const OCCM_GROUP_JOIN_SUCCESS = 'OCCM_GROUP_JOIN_SUCCESS';
export const OCCM_GROUP_JOIN_FAIL = 'OCCM_GROUP_JOIN_FAIL';

export const OCCM_GROUP_LEAVE_REQUEST = 'OCCM_GROUP_LEAVE_REQUEST';
export const OCCM_GROUP_LEAVE_SUCCESS = 'OCCM_GROUP_LEAVE_SUCCESS';
export const OCCM_GROUP_LEAVE_FAIL = 'OCCM_GROUP_LEAVE_FAIL';

export const OCCM_GROUP_TIMELINE_EXPAND_REQUEST = 'OCCM_GROUP_TIMELINE_EXPAND_REQUEST';
export const OCCM_GROUP_TIMELINE_EXPAND_SUCCESS = 'OCCM_GROUP_TIMELINE_EXPAND_SUCCESS';
export const OCCM_GROUP_TIMELINE_EXPAND_FAIL = 'OCCM_GROUP_TIMELINE_EXPAND_FAIL';
```

### 13.5 Reducer

**Reference pattern**: `app/javascript/mastodon/reducers/lists.ts`

```typescript
// app/javascript/mastodon/reducers/occm_groups.ts
import { Map as ImmutableMap, fromJS } from 'immutable';
import type { ApiOccmGroupJSON } from 'mastodon/api_types/occm_groups';

interface OccmGroupsState {
  items: ImmutableMap<string, any>;
  isLoading: boolean;
  loaded: boolean;
}

const initialState: OccmGroupsState = {
  items: ImmutableMap(),
  isLoading: false,
  loaded: false,
};

export function occmGroupsReducer(state = initialState, action: any): OccmGroupsState {
  switch (action.type) {
    case 'OCCM_GROUPS_FETCH_REQUEST':
      return { ...state, isLoading: true };
    case 'OCCM_GROUPS_FETCH_SUCCESS':
      return {
        ...state,
        items: ImmutableMap(
          (action.groups as ApiOccmGroupJSON[]).map((group) => [group.id, fromJS(group)])
        ),
        isLoading: false,
        loaded: true,
      };
    case 'OCCM_GROUPS_FETCH_FAIL':
      return { ...state, isLoading: false };
    case 'OCCM_GROUP_CREATE_SUCCESS':
    case 'OCCM_GROUP_UPDATE_SUCCESS':
      return {
        ...state,
        items: state.items.set(action.group.id, fromJS(action.group)),
      };
    case 'OCCM_GROUP_DELETE_SUCCESS':
      return {
        ...state,
        items: state.items.delete(action.groupId),
      };
    default:
      return state;
  }
}
```

### 13.6 Serializer

**Reference pattern**: `app/serializers/rest/list_serializer.rb`

```ruby
# app/serializers/rest/occm_group_serializer.rb
class REST::OccmGroupSerializer < ActiveModel::Serializer
  attributes :id, :title, :description, :approval_required,
             :member_count, :role, :membership_state, :created_at

  def id
    object.id.to_s
  end

  def role
    membership&.role
  end

  def membership_state
    membership&.state
  end

  private

  def membership
    @membership ||= object.occm_group_memberships.find_by(account_id: current_user&.account_id)
  end
end
```

```ruby
# app/serializers/rest/occm_group_membership_serializer.rb
class REST::OccmGroupMembershipSerializer < ActiveModel::Serializer
  attributes :id, :role, :state, :created_at

  belongs_to :account, serializer: REST::AccountSerializer

  def id
    object.id.to_s
  end
end
```

### 13.7 Routes

**Reference pattern**: `config/routes/api.rb`

```ruby
# config/routes/api.rb additions
namespace :v1 do
  resources :occm_groups, only: [:index, :show, :create, :update, :destroy] do
    member do
      post :transfer
    end

    resources :members, only: [:index, :create, :destroy], controller: 'occm_groups/members' do
      collection do
        get :pending
      end
      member do
        post :approve
        post :reject
      end
    end

    resources :moderators, only: [:create, :destroy], controller: 'occm_groups/moderators'

    resources :statuses, only: [:create, :destroy], controller: 'occm_groups/statuses'

    get :timeline, to: 'occm_groups/timelines#show'

    resources :reports, only: [:index, :create], controller: 'occm_groups/reports' do
      member do
        post :resolve
      end
    end
  end
end
```

### 13.8 Feature Components

```
app/javascript/mastodon/features/occm_groups/
  index.tsx              # Group list (reference: features/lists/index.tsx)
  new.tsx                # Create/edit group (reference: features/lists/new.tsx)
  members.tsx            # Member management (reference: features/lists/members.tsx)
  reports.tsx            # Report management
  components/
    occm_group_item.tsx  # Single group in list
    member_item.tsx      # Single member in list
    report_item.tsx      # Single report in list
    role_badge.tsx       # Admin/Mod/Member badge

app/javascript/mastodon/features/occm_group_timeline/
  index.tsx              # Group timeline (reference: features/list_timeline/index.jsx)
  components/
    compose_form.tsx     # Group-specific compose form
```

---

## Appendix A: Service Objects

Following the pattern from `app/services/add_accounts_to_list_service.rb`:

| Service | Purpose |
|---------|---------|
| `CreateOccmGroupService` | Creates group and admin membership in transaction |
| `JoinOccmGroupService` | Handles join request (immediate or pending based on approval_required) |
| `ApproveOccmGroupMemberService` | Approves pending membership, sends notification |
| `RejectOccmGroupMemberService` | Rejects pending membership, sends notification |
| `RemoveOccmGroupMemberService` | Removes member (with admin-cannot-leave check) |
| `TransferOccmGroupAdminService` | Transfers admin role atomically |
| `PostToOccmGroupService` | Creates status, links to group, distributes |
| `DeleteOccmGroupStatusService` | Removes post, notifies author |
| `DistributeOccmGroupStatusService` | Pushes status to group stream and member feeds |
| `ResolveOccmGroupReportService` | Resolves report with chosen action |

---

## Appendix B: Policy Objects

Using Pundit-style policies:

```ruby
# app/policies/occm_group_policy.rb
class OccmGroupPolicy < ApplicationPolicy
  def update?
    admin?
  end

  def destroy?
    admin?
  end

  def moderate?
    admin? || moderator?
  end

  def transfer?
    admin?
  end

  private

  def membership
    @membership ||= record.occm_group_memberships.active.find_by(account_id: user.account_id)
  end

  def admin?
    membership&.role_admin?
  end

  def moderator?
    membership&.role_moderator?
  end
end
```

---

## Appendix C: Summary of Naming Conventions

| Concern | Convention | Example |
|---------|-----------|---------|
| DB tables | `occm_` prefix | `occm_groups`, `occm_group_memberships` |
| API paths | `/api/v1/occm_groups/` prefix | `/api/v1/occm_groups/:id/members` |
| OAuth scopes | `read:occm_groups`, `write:occm_groups` | `doorkeeper_authorize! :read, :'read:occm_groups'` |
| Models | `OccmGroup`, `OccmGroupMembership` | `class OccmGroup < ApplicationRecord` |
| Serializers | `REST::OccmGroupSerializer` | `app/serializers/rest/occm_group_serializer.rb` |
| Services | `*OccmGroup*Service` | `CreateOccmGroupService` |
| Controllers | `Api::V1::OccmGroups*` | `Api::V1::OccmGroupsController` |
| Frontend | `occm_groups` prefix for actions/types | `OCCM_GROUPS_FETCH_REQUEST` |
| i18n keys | `occm_groups.*` | `occm_groups.title` |
| Streaming | `occm_group:{id}` channel | `timeline:occm_group:12345` |
| Notifications | `occm_group_*` types | `occm_group_join_request` |

This ensures zero naming collisions with PR #19059 and maintains clear identification of OCCM-specific functionality throughout the codebase.
