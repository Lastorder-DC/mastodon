# frozen_string_literal: true

class AddCommunityGroupFieldsToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_reference :statuses, :community_group, foreign_key: { on_delete: :nullify }, index: false
    add_column :statuses, :community_group_approval_status, :integer
    add_column :statuses, :community_group_dm, :boolean, null: false, default: false

    add_index :statuses, :community_group_id, where: 'community_group_id IS NOT NULL', algorithm: :concurrently
    add_index :statuses, [:community_group_id, :id], where: 'community_group_id IS NOT NULL AND deleted_at IS NULL', algorithm: :concurrently
    add_index :statuses, :community_group_approval_status, where: 'community_group_approval_status IS NOT NULL', name: 'index_statuses_on_community_group_approval_status', algorithm: :concurrently
  end
end
