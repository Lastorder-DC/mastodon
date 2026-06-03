# frozen_string_literal: true

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
