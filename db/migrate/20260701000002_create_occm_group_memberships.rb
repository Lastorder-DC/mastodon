# frozen_string_literal: true

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
