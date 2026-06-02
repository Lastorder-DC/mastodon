# frozen_string_literal: true

class CreateCommunityGroupAccountBlocks < ActiveRecord::Migration[8.1]
  def change
    create_table :community_group_account_blocks do |t|
      t.references :community_group, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :blocked_by_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.text :reason, null: false, default: ''

      t.timestamps
    end

    add_index :community_group_account_blocks, [:community_group_id, :account_id], unique: true, name: 'idx_community_group_account_blocks_on_group_account'
  end
end
