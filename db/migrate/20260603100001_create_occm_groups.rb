# frozen_string_literal: true

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
