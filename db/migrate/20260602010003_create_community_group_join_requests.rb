# frozen_string_literal: true

class CreateCommunityGroupJoinRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :community_group_join_requests do |t|
      t.references :community_group, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.integer :status, null: false, default: 0
      t.text :message, null: false, default: ''
      t.references :reviewed_by_account, foreign_key: { to_table: :accounts }, index: true
      t.datetime :reviewed_at

      t.timestamps
    end

    add_index :community_group_join_requests, [:community_group_id, :account_id], unique: true, where: 'status = 0', name: 'idx_community_group_join_requests_pending_unique'
    add_index :community_group_join_requests, [:community_group_id, :status]
  end
end
