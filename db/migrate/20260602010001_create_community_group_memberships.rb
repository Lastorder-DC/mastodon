# frozen_string_literal: true

class CreateCommunityGroupMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :community_group_memberships do |t|
      t.references :community_group, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.integer :role, null: false, default: 0

      t.timestamps
    end

    add_index :community_group_memberships, [:community_group_id, :account_id], unique: true
    add_index :community_group_memberships, [:account_id, :community_group_id]
    add_index :community_group_memberships, [:community_group_id, :role]
  end
end
