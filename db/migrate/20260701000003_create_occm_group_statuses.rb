# frozen_string_literal: true

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
