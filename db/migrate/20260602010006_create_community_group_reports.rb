# frozen_string_literal: true

class CreateCommunityGroupReports < ActiveRecord::Migration[8.1]
  def change
    create_table :community_group_reports do |t|
      t.references :community_group, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :target_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.bigint :status_ids, array: true, null: false, default: []
      t.bigint :rule_ids, array: true, null: false, default: []
      t.text :comment, null: false, default: ''
      t.references :action_taken_by_account, foreign_key: { to_table: :accounts }, index: true
      t.datetime :action_taken_at

      t.timestamps
    end

    add_index :community_group_reports, [:community_group_id, :action_taken_at]
    add_index :community_group_reports, [:community_group_id, :created_at]
    add_index :community_group_reports, [:community_group_id, :account_id]
  end
end
