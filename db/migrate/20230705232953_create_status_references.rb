# frozen_string_literal: true

class CreateStatusReferences < ActiveRecord::Migration[6.1]
  def change
    create_table :status_references do |t|
      t.belongs_to :status, null: false, foreign_key: { on_delete: :cascade }
      t.belongs_to :target_status, null: false, foreign_key: { on_delete: :cascade, to_table: :statuses }
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
    end
  end
end
